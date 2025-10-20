import uuid
import hmac
import hashlib
import base64
import json
import requests
from typing import Dict, Any, Optional
from decimal import Decimal
from django.utils import timezone
from ..config import SBP_SETTINGS, PAYMENT_SETTINGS
from ..models import Payment


class SBPClient:
    def __init__(self):
        self.api_url = SBP_SETTINGS['API_URL']
        self.merchant_id = SBP_SETTINGS['MERCHANT_ID']
        self.api_key = SBP_SETTINGS['API_KEY']
        self.test_mode = SBP_SETTINGS['TEST_MODE']

    def _sign_request(self, data: Dict[str, Any]) -> str:
        """
        Подписывает запрос к СБП
        """
        message = json.dumps(data, separators=(',', ':'))
        signature = hmac.new(
            self.api_key.encode(),
            message.encode(),
            hashlib.sha256
        ).digest()
        return base64.b64encode(signature).decode()

    def _make_request(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Выполняет запрос к API СБП
        """
        url = f"{self.api_url}{endpoint}"
        headers = {
            'Content-Type': 'application/json',
            'X-Merchant-ID': self.merchant_id,
            'X-Request-ID': str(uuid.uuid4()),
            'X-Request-Signature': self._sign_request(data)
        }
        
        response = requests.post(url, json=data, headers=headers)
        response.raise_for_status()
        return response.json()

    def register_payment(self, payment: Payment) -> Dict[str, Any]:
        """
        Регистрирует QR-код для оплаты через СБП
        """
        qr_id = f"QR-{payment.order.id}-{uuid.uuid4().hex[:8]}"
        
        data = {
            'qrId': qr_id,
            'amount': {
                'value': str(payment.amount),
                'currency': 'RUB'
            },
            'paymentPurpose': f"Оплата заказа #{payment.order.id}",
            'merchantId': self.merchant_id,
            'terminalId': 'web',
            'redirectUrl': PAYMENT_SETTINGS['SUCCESS_URL'],
            'metadata': {
                'order_id': str(payment.order.id),
                'payment_id': payment.payment_id
            }
        }

        if self.test_mode:
            data['testMode'] = True

        response = self._make_request('qr/register', data)
        
        if response.get('errorCode'):
            raise ValueError(f"Ошибка регистрации QR-кода: {response.get('errorMessage')}")

        # Сохраняем данные QR-кода
        payment.payment_id = qr_id
        payment.metadata.update({
            'qr_id': qr_id,
            'qr_url': response['qrUrl'],
            'payload': response['payload']
        })
        payment.save()

        return response

    def check_payment_status(self, payment: Payment) -> str:
        """
        Проверяет статус платежа
        """
        data = {
            'qrId': payment.payment_id,
            'merchantId': self.merchant_id
        }

        response = self._make_request('qr/status', data)

        if response.get('errorCode'):
            raise ValueError(f"Ошибка проверки статуса: {response.get('errorMessage')}")

        return response.get('status')

    def process_callback(self, data: Dict[str, Any]) -> Optional[Payment]:
        """
        Обрабатывает уведомление от СБП
        """
        qr_id = data.get('qrId')
        if not qr_id:
            return None

        try:
            payment = Payment.objects.get(payment_id=qr_id)
        except Payment.DoesNotExist:
            return None

        # Проверяем подпись уведомления
        signature = data.pop('signature', None)
        if not signature or signature != self._sign_request(data):
            return None

        # Проверяем статус платежа через API для безопасности
        status = self.check_payment_status(payment)
        
        if status == 'PAID':
            payment.status = 'completed'
            payment.paid_at = timezone.now()
            payment.metadata.update(data)
            payment.save()
            return payment
        
        return None 