"""Эквайринг Сбербанка на шлюзе RBS.

Сбербанк и Уралсиб работают на одной платформе, поэтому важно проверить не
протокол (он уже покрыт тестами Уралсиба), а разделение: свои настройки, свои
ключи в metadata и корректное переключение эквайрера. Иначе платежи одного
банка могут «подхватываться» клиентом другого.
"""
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from apps.payments.models import Payment, PaymentStatus
from apps.payments.providers.rbs import (
    OrderStatus, RBSError, SberbankRBSClient, UralsibRBSClient,
)
from apps.payments.services import PaymentService

User = get_user_model()

SBER_SETTINGS = {
    'API_URL': 'https://3dsec.sberbank.ru/payment/rest',
    'USERNAME': 'sber-login',
    'PASSWORD': 'sber-password',
    'CALLBACK_SECRET': '',
    'SUCCESS_URL': 'https://okoznaniy.ru/payment/success/',
    'FAIL_URL': 'https://okoznaniy.ru/payment/fail/',
    'CURRENCY': '643',
    'TIMEOUT': 5,
}


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


@override_settings(SECURE_SSL_REDIRECT=False)
class SberbankRBSClientTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='sber_payer', email='sber_payer@example.com',
            password='pwd', role='client',
        )
        self.payment = Payment.objects.create(
            user=self.user, amount=Decimal('1500.00'),
            payment_method='card', status=PaymentStatus.PENDING,
            payment_id='sber-test-payment',
        )

    def _client(self):
        with patch('apps.payments.providers.rbs.SberbankRBSClient.SETTINGS', SBER_SETTINGS):
            return SberbankRBSClient()

    def test_unconfigured_client_names_its_own_env_vars(self):
        empty = {**SBER_SETTINGS, 'USERNAME': '', 'PASSWORD': ''}
        with patch('apps.payments.providers.rbs.SberbankRBSClient.SETTINGS', empty):
            client = SberbankRBSClient()
            self.assertFalse(client.configured)
            with self.assertRaises(ValueError) as ctx:
                client.get_order_status(self.payment)
            # без регистрации падаем раньше на отсутствии orderId
            self.assertIn('Сбербанк', str(ctx.exception))

    def test_register_payment_stores_sberbank_metadata(self):
        captured = {}

        def fake_post(url, data=None, timeout=None):
            captured['url'] = url
            captured['data'] = data
            return _FakeResponse({'orderId': 'SBER-ORDER-1', 'formUrl': 'https://pay.sber/x'})

        with patch('apps.payments.providers.rbs.SberbankRBSClient.SETTINGS', SBER_SETTINGS), \
             patch('apps.payments.providers.rbs.requests.post', fake_post):
            result = SberbankRBSClient().register_payment(self.payment)

        self.assertEqual(result['formUrl'], 'https://pay.sber/x')
        self.assertIn('3dsec.sberbank.ru', captured['url'])
        self.assertEqual(captured['data']['userName'], 'sber-login')
        self.assertEqual(captured['data']['amount'], 150000)  # копейки

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.metadata['sberbank_order_id'], 'SBER-ORDER-1')
        self.assertNotIn('uralsib_order_id', self.payment.metadata)

    def test_callback_does_not_pick_up_another_banks_payment(self):
        """Платёж Уралсиба не должен обрабатываться клиентом Сбербанка."""
        self.payment.metadata = {'uralsib_order_id': 'URALSIB-1'}
        self.payment.save(update_fields=['metadata'])

        with patch('apps.payments.providers.rbs.SberbankRBSClient.SETTINGS', SBER_SETTINGS):
            found = SberbankRBSClient().process_callback({'mdOrder': 'URALSIB-1'})
        self.assertIsNone(found)

    def test_callback_confirms_payment_by_gateway_status(self):
        self.payment.metadata = {'sberbank_order_id': 'SBER-ORDER-2'}
        self.payment.save(update_fields=['metadata'])

        def fake_post(url, data=None, timeout=None):
            return _FakeResponse({'errorCode': '0', 'orderStatus': OrderStatus.APPROVED,
                                  'approvalCode': '123456'})

        with patch('apps.payments.providers.rbs.SberbankRBSClient.SETTINGS', SBER_SETTINGS), \
             patch('apps.payments.providers.rbs.requests.post', fake_post):
            found = SberbankRBSClient().process_callback({'mdOrder': 'SBER-ORDER-2'})

        self.assertIsNotNone(found)
        self.assertEqual(found.pk, self.payment.pk)
        found.refresh_from_db()
        self.assertEqual(found.metadata['sberbank_status'], OrderStatus.APPROVED)

    def test_declined_order_is_not_treated_as_paid(self):
        self.payment.metadata = {'sberbank_order_id': 'SBER-ORDER-3'}
        self.payment.save(update_fields=['metadata'])

        def fake_post(url, data=None, timeout=None):
            return _FakeResponse({'errorCode': '0', 'orderStatus': OrderStatus.DECLINED})

        with patch('apps.payments.providers.rbs.SberbankRBSClient.SETTINGS', SBER_SETTINGS), \
             patch('apps.payments.providers.rbs.requests.post', fake_post):
            found = SberbankRBSClient().process_callback({'mdOrder': 'SBER-ORDER-3'})

        self.assertIsNone(found)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, PaymentStatus.FAILED)

    def test_gateway_error_is_raised(self):
        def fake_post(url, data=None, timeout=None):
            return _FakeResponse({'errorCode': '5', 'errorMessage': 'Доступ запрещён'})

        with patch('apps.payments.providers.rbs.SberbankRBSClient.SETTINGS', SBER_SETTINGS), \
             patch('apps.payments.providers.rbs.requests.post', fake_post):
            with self.assertRaises(RBSError):
                SberbankRBSClient().register_payment(self.payment)


@override_settings(SECURE_SSL_REDIRECT=False)
class CardAcquirerSwitchTests(TestCase):
    """Переключатель CARD_ACQUIRER должен выбирать нужный банк."""

    @override_settings(CARD_ACQUIRER='sberbank')
    def test_switch_selects_sberbank(self):
        self.assertIsInstance(PaymentService._card_rbs_client(), SberbankRBSClient)

    @override_settings(CARD_ACQUIRER='uralsib')
    def test_switch_selects_uralsib(self):
        self.assertIsInstance(PaymentService._card_rbs_client(), UralsibRBSClient)

    @override_settings(CARD_ACQUIRER='SBERBANK')
    def test_switch_is_case_insensitive(self):
        self.assertIsInstance(PaymentService._card_rbs_client(), SberbankRBSClient)

    @override_settings(CARD_ACQUIRER='alfabank')
    def test_non_rbs_acquirer_has_no_rbs_client(self):
        self.assertIsNone(PaymentService._card_rbs_client())
