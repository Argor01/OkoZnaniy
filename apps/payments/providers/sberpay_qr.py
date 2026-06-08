"""
Provider for SberPay QR (приём оплат по QR-коду).

API auth: mTLS — клиентский сертификат + ключ, который Сбер выдаёт вместе
с реквизитами терминала. В отличие от классического Сбер-эквайринга
(`sberbank.py`), здесь нет username/password — авторизация делается на
уровне TLS-handshake.

NB: точные эндпоинты и формат полей запросов/ответов зависят от ревизии
API, которую Сбер выдал для конкретного мерчанта. Базовые URL и
имена методов оставлены в виде констант — поправь их под свою
документацию (`docs/SBERPAY_QR_SETUP.md`).
"""

import logging
import uuid
from decimal import Decimal
from typing import Any, Dict, Optional

import requests
from django.utils import timezone

from ..config import SBERPAY_QR_SETTINGS
from ..models import Payment, PaymentStatus

logger = logging.getLogger('oko.payments.sberpay_qr')


class SberPayQRError(Exception):
    """Ошибка взаимодействия с SberPay QR API."""


class SberPayQRClient:
    """Клиент SberPay QR API с mTLS-авторизацией."""

    # ---- endpoints (TODO: подтвердить по доке Сбера) ----
    CREATE_ORDER_PATH = '/qr/order/v3/creation'
    ORDER_STATUS_PATH = '/qr/order/v3/status'
    REVOKE_ORDER_PATH = '/qr/order/v3/revoke'
    REFUND_ORDER_PATH = '/qr/order/v3/refund'

    DEFAULT_TIMEOUT = 30

    def __init__(self) -> None:
        self.api_url: str = SBERPAY_QR_SETTINGS['API_URL'].rstrip('/')
        self.tid: str = SBERPAY_QR_SETTINGS['TID']
        self.qr_id: str = SBERPAY_QR_SETTINGS['QR_ID']
        self.member_id: str = SBERPAY_QR_SETTINGS['MEMBER_ID']
        self.merchant_name: str = SBERPAY_QR_SETTINGS['MERCHANT_NAME']
        self.test_mode: bool = SBERPAY_QR_SETTINGS['TEST_MODE']

        cert_path: Optional[str] = SBERPAY_QR_SETTINGS['CERT_PATH'] or None
        key_path: Optional[str] = SBERPAY_QR_SETTINGS['KEY_PATH'] or None
        ca_path: Optional[str] = SBERPAY_QR_SETTINGS['CA_PATH'] or None
        self._cert = (cert_path, key_path) if cert_path and key_path else cert_path
        self._ca = ca_path or True  # True -> use system CA bundle

    # ---------- low-level ----------
    def _post(self, path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self._cert:
            raise SberPayQRError(
                "SberPay QR mTLS certificate is not configured. "
                "Set SBERPAY_QR_CERT_PATH and SBERPAY_QR_KEY_PATH."
            )
        url = f"{self.api_url}{path}"
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'rqUid': uuid.uuid4().hex,
        }
        logger.info("SberPay QR POST %s payload_keys=%s", path, list(payload.keys()))
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            cert=self._cert,
            verify=self._ca,
            timeout=self.DEFAULT_TIMEOUT,
        )
        response.raise_for_status()
        return response.json()

    def _get(self, path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        if not self._cert:
            raise SberPayQRError(
                "SberPay QR mTLS certificate is not configured."
            )
        url = f"{self.api_url}{path}"
        headers = {
            'Accept': 'application/json',
            'rqUid': uuid.uuid4().hex,
        }
        response = requests.get(
            url,
            params=params,
            headers=headers,
            cert=self._cert,
            verify=self._ca,
            timeout=self.DEFAULT_TIMEOUT,
        )
        response.raise_for_status()
        return response.json()

    # ---------- public ----------
    def register_payment(self, payment: Payment) -> Dict[str, Any]:
        """
        Регистрирует QR-операцию в SberPay QR.

        Возвращает dict с ключами:
          - orderNumber: уникальный номер заказа на стороне мерчанта
          - qrUrl / formUrl: URL для отображения QR-кода клиенту
          - sbpQrId: QR-идентификатор на стороне Сбера (для проверки статуса)
        """
        order_number = self._build_order_number(payment)
        amount_kopecks = int(Decimal(payment.amount) * 100)
        payload = {
            'rqUid': uuid.uuid4().hex,
            'rqTm': timezone.now().strftime('%Y-%m-%dT%H:%M:%S'),
            'tid': self.tid,
            'qrId': self.qr_id,
            'memberId': self.member_id,
            'orderNumber': order_number,
            'amount': amount_kopecks,
            'currency': '643',
            'paymentPurpose': f'Заказ №{payment.order_id} на ОкоЗнаний',
            'description': self.merchant_name,
        }
        data = self._post(self.CREATE_ORDER_PATH, payload)

        sber_qr_id = data.get('sbpQrId') or data.get('qrId') or ''
        qr_url = data.get('qrUrl') or data.get('formUrl') or data.get('payload', '')

        # Обновляем платёж под выданные данные
        payment.payment_id = order_number
        payment.metadata = {
            **(payment.metadata or {}),
            'sber_qr_id': sber_qr_id,
            'qr_url': qr_url,
            'raw_register_response': data,
        }
        payment.status = PaymentStatus.PROCESSING
        payment.save(update_fields=['payment_id', 'metadata', 'status', 'updated_at'])

        return {
            'orderNumber': order_number,
            'qrUrl': qr_url,
            'formUrl': qr_url,
            'sbpQrId': sber_qr_id,
        }

    def get_order_status(self, payment: Payment) -> Dict[str, Any]:
        sber_qr_id = (payment.metadata or {}).get('sber_qr_id')
        params = {
            'tid': self.tid,
            'qrId': self.qr_id,
            'orderNumber': payment.payment_id,
        }
        if sber_qr_id:
            params['sbpQrId'] = sber_qr_id
        return self._get(self.ORDER_STATUS_PATH, params)

    def revoke_order(self, payment: Payment) -> Dict[str, Any]:
        payload = {
            'tid': self.tid,
            'qrId': self.qr_id,
            'orderNumber': payment.payment_id,
        }
        return self._post(self.REVOKE_ORDER_PATH, payload)

    def refund_order(self, payment: Payment, amount: Optional[Decimal] = None) -> Dict[str, Any]:
        refund_amount = amount or Decimal(payment.amount)
        payload = {
            'tid': self.tid,
            'qrId': self.qr_id,
            'orderNumber': payment.payment_id,
            'amount': int(refund_amount * 100),
            'currency': '643',
        }
        return self._post(self.REFUND_ORDER_PATH, payload)

    # ---------- webhook ----------
    def process_callback(self, data: Dict[str, Any]) -> Optional[Payment]:
        """
        Обрабатывает webhook от Сбера. Возвращает Payment, если статус известен.

        Ожидаемый формат может отличаться — поправь маппинг под фактический
        запрос Сбера (см. `docs/SBERPAY_QR_SETUP.md`).
        """
        order_number = (
            data.get('orderNumber')
            or data.get('order_number')
            or data.get('mdOrder')
        )
        if not order_number:
            logger.warning("SberPay QR callback without orderNumber: %s", data)
            return None
        try:
            payment = Payment.objects.get(payment_id=order_number)
        except Payment.DoesNotExist:
            logger.warning("SberPay QR callback: Payment %s not found", order_number)
            return None

        sber_status = (data.get('orderStatus') or data.get('status') or '').upper()
        # Возможные значения по доке Сбера:
        # 0 — зарегистрирован, не оплачен
        # 1 — предавторизован
        # 2 — полная авторизация (оплачен)
        # 3 — авторизация отменена
        # 4 — оплата возвращена
        # 5 — инициирована авторизация
        # 6 — авторизация отклонена
        try:
            sber_status_code = int(data.get('orderStatusCode') or data.get('orderStatus'))
        except (TypeError, ValueError):
            sber_status_code = None

        success_codes = {2}
        fail_codes = {3, 6}
        refund_codes = {4}

        if sber_status_code in success_codes or sber_status in {'PAID', 'COMPLETED', 'CONFIRMED'}:
            payment.status = PaymentStatus.COMPLETED
            payment.paid_at = timezone.now()
        elif sber_status_code in fail_codes or sber_status in {'DECLINED', 'FAILED', 'REJECTED'}:
            payment.status = PaymentStatus.FAILED
        elif sber_status_code in refund_codes or sber_status in {'REFUNDED'}:
            payment.status = PaymentStatus.REFUNDED
            payment.refunded_at = timezone.now()
        else:
            payment.status = PaymentStatus.PROCESSING

        payment.metadata = {
            **(payment.metadata or {}),
            'last_callback': data,
        }
        payment.save(update_fields=['status', 'metadata', 'paid_at', 'refunded_at', 'updated_at'])
        logger.info(
            "SberPay QR callback applied: payment=%s status=%s sber_status=%s",
            payment.id, payment.status, sber_status_code or sber_status,
        )
        return payment

    # ---------- helpers ----------
    @staticmethod
    def _build_order_number(payment: Payment) -> str:
        return f"oko-{payment.order_id}-{payment.id}-{int(timezone.now().timestamp())}"
