"""T-Bank acquiring adapter. Disabled until TERMINAL_KEY and PASSWORD are set."""
import hashlib
import requests
from django.utils import timezone
from apps.payments.models import Payment, PaymentStatus
from ..config import TBANK_SETTINGS


class TBankClient:
    def __init__(self):
        self.api_url = TBANK_SETTINGS['API_URL'].rstrip('/')
        self.terminal_key = TBANK_SETTINGS['TERMINAL_KEY']
        self.password = TBANK_SETTINGS['PASSWORD']
        self.test_mode = TBANK_SETTINGS['TEST_MODE']

    @property
    def configured(self):
        return bool(self.terminal_key and self.password)

    def _token(self, payload):
        values = {k: v for k, v in payload.items() if not isinstance(v, (dict, list)) and k != 'Token'}
        values['Password'] = self.password
        raw = ''.join(str(values[k]) for k in sorted(values))
        return hashlib.sha256(raw.encode('utf-8')).hexdigest()

    def _post(self, method, payload):
        if not self.configured:
            raise ValueError('Т-Банк не настроен: задайте TBANK_TERMINAL_KEY и TBANK_PASSWORD')
        data = {**payload, 'TerminalKey': self.terminal_key}
        data['Token'] = self._token(data)
        response = requests.post(f'{self.api_url}/{method}', json=data, timeout=20)
        response.raise_for_status()
        body = response.json()
        if not body.get('Success'):
            raise ValueError(body.get('Message') or body.get('Details') or 'Ошибка Т-Банка')
        return body

    def register_payment(self, payment):
        body = self._post('Init', {
            'Amount': int(payment.amount * 100),
            'OrderId': payment.payment_id,
            'Description': f'Око Знаний, платеж {payment.payment_id}',
            'NotificationURL': TBANK_SETTINGS.get('NOTIFICATION_URL', ''),
            'SuccessURL': TBANK_SETTINGS.get('SUCCESS_URL', ''),
            'FailURL': TBANK_SETTINGS.get('FAIL_URL', ''),
        })
        payment.metadata = {**payment.metadata, 'tbank_payment_id': body.get('PaymentId')}
        payment.save(update_fields=['metadata', 'updated_at'])
        return {'formUrl': body['PaymentURL']}

    def verify_callback(self, data):
        supplied = data.get('Token', '')
        return bool(supplied) and supplied == self._token(data)

    def process_callback(self, data):
        if not self.verify_callback(data) or data.get('Status') not in {'CONFIRMED', 'AUTHORIZED'}:
            return None
        order_id = data.get('OrderId')
        payment = Payment.objects.filter(payment_id=order_id).first()
        if not payment:
            return None
        payment.status = PaymentStatus.COMPLETED
        payment.paid_at = timezone.now()
        payment.metadata = {**payment.metadata, 'tbank_payment_id': data.get('PaymentId')}
        payment.save(update_fields=['status', 'paid_at', 'metadata', 'updated_at'])
        return payment
