import uuid
import logging
import requests
from typing import Dict, Any, Optional
from django.utils import timezone
from ..config import SBERBANK_SETTINGS, PAYMENT_SETTINGS
from ..models import Payment

logger = logging.getLogger('oko.payments')


class SberbankClient:
    def __init__(self):
        self.api_url = SBERBANK_SETTINGS['API_URL']
        self.username = SBERBANK_SETTINGS['USERNAME']
        self.password = SBERBANK_SETTINGS['PASSWORD']
        self.test_mode = SBERBANK_SETTINGS['TEST_MODE']

    def _make_request(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.api_url}{endpoint}"
        data['userName'] = self.username
        data['password'] = self.password

        response = requests.post(
            url,
            data=data,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=30,
        )
        response.raise_for_status()
        return response.json()

    def register_payment(self, payment: Payment) -> Dict[str, Any]:
        order_number = f"SBER-{payment.order.id}-{uuid.uuid4().hex[:8]}"

        data: Dict[str, Any] = {
            'orderNumber': order_number,
            'amount': int(payment.amount * 100),
            'returnUrl': PAYMENT_SETTINGS['SUCCESS_URL'],
            'failUrl': PAYMENT_SETTINGS['FAIL_URL'],
            'description': f"Оплата заказа #{payment.order.id}",
            'language': 'ru',
            'sessionTimeoutSecs': 24 * 60 * 60,
            'currency': '643',
        }

        response = self._make_request('register.do', data)

        error_code = response.get('errorCode')
        if error_code and str(error_code) != '0':
            raise ValueError(
                f"Ошибка регистрации платежа в Сбербанке: {response.get('errorMessage')}"
            )

        payment.payment_id = response['orderId']
        payment.metadata.update({
            'provider': 'sberbank',
            'order_number': order_number,
            'form_url': response['formUrl'],
        })
        payment.save()

        return response

    def get_order_status(self, payment: Payment) -> Dict[str, Any]:
        data: Dict[str, Any] = {
            'orderId': payment.payment_id,
            'language': 'ru',
        }

        response = self._make_request('getOrderStatusExtended.do', data)

        error_code = response.get('errorCode')
        if error_code and str(error_code) != '0':
            raise ValueError(
                f"Ошибка проверки статуса: {response.get('errorMessage')}"
            )

        return response

    def reverse_payment(self, payment: Payment) -> Dict[str, Any]:
        data: Dict[str, Any] = {
            'orderId': payment.payment_id,
            'language': 'ru',
        }

        response = self._make_request('reverse.do', data)

        error_code = response.get('errorCode')
        if error_code and str(error_code) != '0':
            raise ValueError(
                f"Ошибка отмены платежа: {response.get('errorMessage')}"
            )

        return response

    def refund_payment(self, payment: Payment, amount: int) -> Dict[str, Any]:
        data: Dict[str, Any] = {
            'orderId': payment.payment_id,
            'amount': amount,
            'language': 'ru',
        }

        response = self._make_request('refund.do', data)

        error_code = response.get('errorCode')
        if error_code and str(error_code) != '0':
            raise ValueError(
                f"Ошибка возврата средств: {response.get('errorMessage')}"
            )

        return response

    def process_callback(self, data: Dict[str, Any]) -> Optional[Payment]:
        order_id = data.get('mdOrder') or data.get('orderId')
        if not order_id:
            return None

        try:
            payment = Payment.objects.get(payment_id=order_id)
        except Payment.DoesNotExist:
            logger.warning("Sberbank callback: payment not found for orderId=%s", order_id)
            return None

        status_response = self.get_order_status(payment)
        order_status = status_response.get('orderStatus')

        # orderStatus == 2 means payment is deposited (successful)
        if order_status == 2:
            payment.status = 'completed'
            payment.paid_at = timezone.now()
            payment.metadata.update({
                'callback_data': data,
                'status_response': {
                    'orderStatus': order_status,
                    'actionCode': status_response.get('actionCode'),
                    'actionCodeDescription': status_response.get('actionCodeDescription'),
                    'amount': status_response.get('amount'),
                },
            })
            payment.save()
            return payment

        logger.info(
            "Sberbank callback: payment %s has status %s (not completed)",
            order_id, order_status,
        )
        return None
