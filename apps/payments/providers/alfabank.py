import uuid
import hashlib
import requests
from typing import Dict, Any, Optional
from decimal import Decimal
from django.urls import reverse
from ..config import ALFABANK_SETTINGS, PAYMENT_SETTINGS
from ..models import Payment


class AlfaBankClient:
    def __init__(self):
        self.api_url = ALFABANK_SETTINGS['API_URL']
        self.username = ALFABANK_SETTINGS['USERNAME']
        self.password = ALFABANK_SETTINGS['PASSWORD']
        self.test_mode = ALFABANK_SETTINGS['TEST_MODE']

    def _make_request(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Выполняет запрос к API Альфа-Банка
        """
        url = f"{self.api_url}{endpoint}"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': self._get_auth_token()
        }
        
        response = requests.post(url, json=data, headers=headers)
        response.raise_for_status()
        return response.json()

    def _get_auth_token(self) -> str:
        """
        Генерирует токен авторизации
        """
        token = f"{self.username}:{self.password}"
        return hashlib.md5(token.encode()).hexdigest()

    def register_payment(self, payment: Payment) -> Dict[str, Any]:
        """
        Регистрирует платеж в системе Альфа-Банка
        """
        order_number = f"ORDER-{payment.order.id}-{uuid.uuid4().hex[:8]}"
        
        data = {
            'orderNumber': order_number,
            'amount': int(payment.amount * 100),  # Сумма в копейках
            'returnUrl': PAYMENT_SETTINGS['SUCCESS_URL'],
            'failUrl': PAYMENT_SETTINGS['FAIL_URL'],
            'description': f"Оплата заказа #{payment.order.id}",
            'language': 'ru',
            'sessionTimeoutSecs': 24 * 60 * 60,  # 24 часа
        }

        if self.test_mode:
            data['testMode'] = '1'

        response = self._make_request('register.do', data)
        
        if response.get('errorCode'):
            raise ValueError(f"Ошибка регистрации платежа: {response.get('errorMessage')}")

        # Сохраняем ID платежа и другие данные
        payment.payment_id = response['orderId']
        payment.metadata.update({
            'order_number': order_number,
            'form_url': response['formUrl']
        })
        payment.save()

        return response

    def process_payment(self, payment: Payment, card_data: Dict[str, Any]) -> bool:
        """
        Обрабатывает платеж с данными карты
        """
        # Сохраняем зашифрованные данные карты
        payment.set_sensitive_data(card_data)

        data = {
            'orderId': payment.payment_id,
            'pan': card_data['card_number'],
            'expiry': card_data['expiry'],
            'cvc': card_data['cvv'],
            'cardholder': card_data.get('cardholder', '')
        }

        try:
            response = self._make_request('payment.do', data)
            if response.get('errorCode'):
                payment.status = 'failed'
                payment.metadata['error'] = response.get('errorMessage')
                payment.save()
                return False

            payment.status = 'completed'
            payment.save()
            return True
        except Exception as e:
            payment.status = 'failed'
            payment.metadata['error'] = str(e)
            payment.save()
            return False

    def check_payment_status(self, payment: Payment) -> str:
        """
        Проверяет статус платежа
        """
        data = {
            'orderId': payment.payment_id,
        }

        response = self._make_request('getOrderStatus.do', data)

        if response.get('errorCode'):
            raise ValueError(f"Ошибка проверки статуса: {response.get('errorMessage')}")

        return response.get('orderStatus')

    def process_callback(self, data: Dict[str, Any]) -> Optional[Payment]:
        """
        Обрабатывает уведомление от Альфа-Банка
        """
        order_id = data.get('orderId')
        if not order_id:
            return None

        try:
            payment = Payment.objects.get(payment_id=order_id)
        except Payment.DoesNotExist:
            return None

        # Проверяем статус платежа через API для безопасности
        status = self.check_payment_status(payment)
        
        if status == '2':  # Успешная оплата
            payment.status = 'completed'
            payment.metadata.update(data)
            payment.save()
            return payment
        
        return None 