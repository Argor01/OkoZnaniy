"""Эквайринг Банка Уралсиб через платёжный шлюз RBS.

RBS — тот же движок, что у Альфа-Банка и Сбербанка, поэтому набор
методов стандартный:

    register.do                — регистрация заказа, возвращает formUrl
    getOrderStatusExtended.do  — статус заказа
    refund.do                  — возврат средств
    reverse.do                 — отмена неподтверждённой авторизации

Авторизация — параметры userName и password в теле запроса
(application/x-www-form-urlencoded). Заголовка Authorization в RBS нет:
именно на этом ошибается providers/alfabank.py, который писался
по тому же протоколу, но так и не был доведён до боя.

Тестовый контур: https://uralsib.rbsuat.com/payment/rest/
Учётная запись для песочницы заводится самостоятельно и бессрочна.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import uuid
from decimal import Decimal
from typing import Any, Dict, Optional

import requests

from ..config import URALSIB_SETTINGS
from ..models import Payment, PaymentStatus

logger = logging.getLogger("oko.payments")


class OrderStatus:
    """Значения orderStatus из документации RBS."""
    REGISTERED = 0          # зарегистрирован, не оплачен
    PREAUTH_HELD = 1        # предавторизованная сумма удержана
    APPROVED = 2            # полная авторизация проведена
    REVERSED = 3            # авторизация отменена
    REFUNDED = 4            # проведён возврат
    ACS_INITIATED = 5       # инициирована авторизация через ACS эмитента
    DECLINED = 6            # авторизация отклонена


# Статусы, при которых деньги считаются полученными.
PAID_STATUSES = frozenset({OrderStatus.APPROVED})


def _order_reference(payment: Payment) -> str:
    """Человекочитаемый номер заказа для шлюза.

    RBS требует уникальности orderNumber в рамках мерчанта, поэтому
    добавляем случайный хвост: повторная попытка оплаты того же заказа
    не должна упираться в «заказ уже зарегистрирован».
    """
    base = payment.order_id if getattr(payment, "order_id", None) else payment.payment_id
    return f"OKO-{base}-{uuid.uuid4().hex[:8]}"


def _description(payment: Payment) -> str:
    if getattr(payment, "order_id", None):
        return f"Оплата заказа №{payment.order_id} на okoznaniy.ru"
    return "Пополнение кошелька на okoznaniy.ru"


class UralsibRBSError(Exception):
    """Шлюз вернул ошибку в поле errorCode."""

    def __init__(self, code, message):
        super().__init__(f"[{code}] {message}")
        self.code = code
        self.message = message


class UralsibRBSClient:
    def __init__(self):
        self.api_url = URALSIB_SETTINGS["API_URL"].rstrip("/")
        self.username = URALSIB_SETTINGS["USERNAME"]
        self.password = URALSIB_SETTINGS["PASSWORD"]
        self.callback_secret = URALSIB_SETTINGS.get("CALLBACK_SECRET") or ""
        self.timeout = float(URALSIB_SETTINGS.get("TIMEOUT") or 20)

    @property
    def configured(self) -> bool:
        return bool(self.username and self.password)

    # ------------------------------------------------------------------
    # Транспорт
    # ------------------------------------------------------------------

    def _post(self, method: str, params: Dict[str, Any]) -> Dict[str, Any]:
        if not self.configured:
            raise ValueError(
                "Эквайринг Уралсиб не настроен: задайте URALSIB_USERNAME и URALSIB_PASSWORD"
            )
        payload = {
            **{k: v for k, v in params.items() if v not in (None, "")},
            "userName": self.username,
            "password": self.password,
        }
        response = requests.post(
            f"{self.api_url}/{method}",
            data=payload,  # RBS ждёт form-urlencoded, не JSON
            timeout=self.timeout,
        )
        response.raise_for_status()
        body = response.json()

        # RBS отдаёт errorCode == '0' при успехе, но в части методов
        # поле отсутствует вовсе — это тоже успех.
        code = str(body.get("errorCode", "0") or "0")
        if code != "0":
            message = body.get("errorMessage") or "Ошибка платёжного шлюза"
            logger.warning("Уралсиб RBS %s → errorCode=%s %s", method, code, message)
            raise UralsibRBSError(code, message)
        return body

    # ------------------------------------------------------------------
    # Операции
    # ------------------------------------------------------------------

    def register_payment(self, payment: Payment) -> Dict[str, str]:
        """Регистрирует заказ и возвращает ссылку на платёжную форму."""
        order_number = _order_reference(payment)
        body = self._post("register.do", {
            "orderNumber": order_number,
            "amount": int(Decimal(str(payment.amount)) * 100),  # в копейках
            "currency": URALSIB_SETTINGS.get("CURRENCY", "643"),  # RUB
            "returnUrl": URALSIB_SETTINGS.get("SUCCESS_URL", ""),
            "failUrl": URALSIB_SETTINGS.get("FAIL_URL", ""),
            "description": _description(payment),
            "language": "ru",
            "sessionTimeoutSecs": 24 * 60 * 60,
        })

        payment.metadata = {
            **(payment.metadata or {}),
            "uralsib_order_id": body["orderId"],
            "uralsib_order_number": order_number,
            "form_url": body["formUrl"],
        }
        payment.save(update_fields=["metadata", "updated_at"])
        return {"formUrl": body["formUrl"], "orderId": body["orderId"]}

    def get_order_status(self, payment: Payment) -> Dict[str, Any]:
        """Спрашивает шлюз о текущем состоянии заказа."""
        order_id = (payment.metadata or {}).get("uralsib_order_id")
        if not order_id:
            raise ValueError("Платёж не зарегистрирован в Уралсибе")
        return self._post("getOrderStatusExtended.do", {"orderId": order_id})

    def refund(self, payment: Payment, amount: Optional[Decimal] = None) -> Dict[str, Any]:
        """Возврат средств на карту плательщика.

        amount=None — полный возврат. Частичный возврат допустим
        на сумму не больше оплаченной.
        """
        order_id = (payment.metadata or {}).get("uralsib_order_id")
        if not order_id:
            raise ValueError("Платёж не зарегистрирован в Уралсибе")
        value = Decimal(str(amount if amount is not None else payment.amount))
        body = self._post("refund.do", {
            "orderId": order_id,
            "amount": int(value * 100),
        })
        logger.info("Уралсиб RBS: возврат %s по платежу %s", value, payment.payment_id)
        return body

    # ------------------------------------------------------------------
    # Колбэк
    # ------------------------------------------------------------------

    def verify_callback(self, data: Dict[str, Any]) -> bool:
        """Проверяет контрольную сумму уведомления.

        RBS формирует её так: все параметры, кроме checksum и sign_alias,
        сортируются по имени и склеиваются в строку «ключ;значение;»,
        затем HMAC-SHA256 на общем секрете, результат в верхнем регистре.

        Если секрет не задан, подпись проверить нечем — возвращаем False,
        и вызывающий код обязан подтвердить платёж запросом статуса.
        """
        supplied = (data.get("checksum") or "").upper()
        if not supplied or not self.callback_secret:
            return False

        parts = []
        for key in sorted(k for k in data if k not in ("checksum", "sign_alias")):
            parts.append(f"{key};{data[key]};")
        raw = "".join(parts).encode("utf-8")
        expected = hmac.new(
            self.callback_secret.encode("utf-8"), raw, hashlib.sha256,
        ).hexdigest().upper()
        return hmac.compare_digest(expected, supplied)

    def process_callback(self, data: Dict[str, Any]) -> Optional[Payment]:
        """Обрабатывает уведомление и возвращает платёж, если он оплачен.

        Подпись — первый рубеж, но решение принимаем только после
        запроса статуса у шлюза: уведомление может быть подделано или
        устареть, а getOrderStatusExtended.do — первоисточник.
        """
        order_id = data.get("mdOrder") or data.get("orderId")
        order_number = data.get("orderNumber")
        if not order_id and not order_number:
            return None

        payment = None
        if order_id:
            payment = Payment.objects.filter(
                metadata__uralsib_order_id=order_id,
            ).first()
        if payment is None and order_number:
            payment = Payment.objects.filter(
                metadata__uralsib_order_number=order_number,
            ).first()
        if payment is None:
            logger.warning("Уралсиб RBS: колбэк по неизвестному заказу %s", order_id or order_number)
            return None

        if self.callback_secret and not self.verify_callback(data):
            logger.warning("Уралсиб RBS: неверная подпись колбэка для %s", payment.payment_id)
            return None

        try:
            status_body = self.get_order_status(payment)
        except (UralsibRBSError, ValueError, requests.RequestException) as e:
            logger.error("Уралсиб RBS: не удалось подтвердить статус %s: %s", payment.payment_id, e)
            return None

        order_status = status_body.get("orderStatus")
        if order_status not in PAID_STATUSES:
            logger.info(
                "Уралсиб RBS: заказ %s не оплачен, orderStatus=%s",
                payment.payment_id, order_status,
            )
            if order_status == OrderStatus.DECLINED and payment.status != PaymentStatus.COMPLETED:
                payment.status = PaymentStatus.FAILED
                payment.save(update_fields=["status", "updated_at"])
            return None

        payment.metadata = {
            **(payment.metadata or {}),
            "uralsib_status": order_status,
            "uralsib_approval_code": status_body.get("approvalCode", ""),
        }
        payment.save(update_fields=["metadata", "updated_at"])
        return payment
