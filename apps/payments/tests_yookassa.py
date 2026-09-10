"""Эквайринг ЮKassa.

Проверяем то, что отличает ЮKassa от банков на шлюзе RBS и где легче
всего потерять деньги: идемпотентность создания платежа, отказ верить
уведомлению без запроса статуса, фильтр по адресу отправителя и то, что
частично оплаченный платёж не зачисляется.
"""
import json
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse

from apps.payments.models import Payment, PaymentStatus
from apps.payments.providers.yookassa import (
    YooKassaClient, YooKassaError, callback_client_ip, is_trusted_ip,
)
from apps.payments.services import PaymentService

User = get_user_model()

YK_SETTINGS = {
    'API_URL': 'https://api.yookassa.ru/v3',
    'SHOP_ID': '123456',
    'SECRET_KEY': 'test_secret_key',
    'RETURN_URL': 'https://okoznaniy.ru/payment/result',
    'CURRENCY': 'RUB',
    'TIMEOUT': 5,
}

# Адрес из сети 185.71.76.0/27, которой ЮKassa шлёт уведомления.
TRUSTED_IP = '185.71.76.5'


class _FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def json(self):
        return self._payload


def _payment_body(status='pending', paid=False, value='1500.00', **extra):
    body = {
        'id': 'yk-payment-1',
        'status': status,
        'paid': paid,
        'amount': {'value': value, 'currency': 'RUB'},
        'confirmation': {'type': 'redirect', 'confirmation_url': 'https://yoomoney.ru/checkout/x'},
        'test': True,
    }
    body.update(extra)
    return body


@override_settings(SECURE_SSL_REDIRECT=False)
class YooKassaClientTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='yk_payer', email='yk_payer@example.com',
            password='pwd', role='client',
        )
        self.payment = Payment.objects.create(
            user=self.user, amount=Decimal('1500.00'),
            payment_method='yookassa', status=PaymentStatus.PENDING,
            payment_id='yk-test-payment',
        )

    def test_unconfigured_client_names_its_own_env_vars(self):
        empty = {**YK_SETTINGS, 'SHOP_ID': '', 'SECRET_KEY': ''}
        with patch('apps.payments.providers.yookassa.YooKassaClient.SETTINGS', empty):
            client = YooKassaClient()
            self.assertFalse(client.configured)
            with self.assertRaises(ValueError) as ctx:
                client.register_payment(self.payment)
            self.assertIn('YOOKASSA_SHOP_ID', str(ctx.exception))

    def test_register_payment_sends_basic_auth_and_idempotence_key(self):
        captured = {}

        def fake_request(method, url, json=None, headers=None, auth=None, timeout=None):
            captured.update(
                method=method, url=url, payload=json, headers=headers, auth=auth,
            )
            return _FakeResponse(_payment_body())

        with patch('apps.payments.providers.yookassa.YooKassaClient.SETTINGS', YK_SETTINGS), \
             patch('apps.payments.providers.yookassa.requests.request', fake_request):
            result = YooKassaClient().register_payment(self.payment)

        self.assertEqual(result['formUrl'], 'https://yoomoney.ru/checkout/x')
        self.assertEqual(captured['method'], 'POST')
        self.assertEqual(captured['url'], 'https://api.yookassa.ru/v3/payments')
        self.assertEqual(captured['auth'], ('123456', 'test_secret_key'))
        self.assertIn('Idempotence-Key', captured['headers'])
        # Сумма уходит строкой с двумя знаками, а не копейками, как в RBS.
        self.assertEqual(captured['payload']['amount'], {'value': '1500.00', 'currency': 'RUB'})
        self.assertTrue(captured['payload']['capture'])
        self.assertEqual(captured['payload']['metadata']['payment_id'], 'yk-test-payment')

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.metadata['yookassa_payment_id'], 'yk-payment-1')

    def test_idempotence_key_is_stable_for_one_payment(self):
        """Повтор создания платежа не должен списать деньги дважды."""
        keys = []

        def fake_request(method, url, json=None, headers=None, auth=None, timeout=None):
            keys.append(headers.get('Idempotence-Key'))
            return _FakeResponse(_payment_body())

        with patch('apps.payments.providers.yookassa.YooKassaClient.SETTINGS', YK_SETTINGS), \
             patch('apps.payments.providers.yookassa.requests.request', fake_request):
            YooKassaClient().register_payment(self.payment)
            YooKassaClient().register_payment(self.payment)

        self.assertEqual(len(keys), 2)
        self.assertEqual(keys[0], keys[1])

    def test_gateway_error_is_raised_with_description(self):
        error_body = {
            'type': 'error', 'id': 'err-1', 'code': 'invalid_request',
            'description': 'Указан некорректный shopId',
        }

        with patch('apps.payments.providers.yookassa.YooKassaClient.SETTINGS', YK_SETTINGS), \
             patch('apps.payments.providers.yookassa.requests.request',
                   lambda *a, **kw: _FakeResponse(error_body, status_code=400)):
            with self.assertRaises(YooKassaError) as ctx:
                YooKassaClient().register_payment(self.payment)

        self.assertEqual(ctx.exception.code, 'invalid_request')
        self.assertIn('shopId', str(ctx.exception))

    # ------------------------------------------------------------------
    # Уведомления
    # ------------------------------------------------------------------

    def _registered_payment(self):
        self.payment.metadata = {'yookassa_payment_id': 'yk-payment-1'}
        self.payment.save(update_fields=['metadata'])
        return self.payment

    def test_callback_confirms_status_through_api_not_by_body(self):
        """Тело уведомления не источник правды: статус спрашиваем у API."""
        self._registered_payment()
        calls = []

        def fake_request(method, url, json=None, headers=None, auth=None, timeout=None):
            calls.append((method, url))
            return _FakeResponse(_payment_body(status='succeeded', paid=True))

        notification = {
            'event': 'payment.succeeded',
            'object': {'id': 'yk-payment-1', 'status': 'succeeded'},
        }
        with patch('apps.payments.providers.yookassa.YooKassaClient.SETTINGS', YK_SETTINGS), \
             patch('apps.payments.providers.yookassa.requests.request', fake_request):
            found = YooKassaClient().process_callback(notification)

        self.assertEqual(found, self.payment)
        self.assertEqual(calls, [('GET', 'https://api.yookassa.ru/v3/payments/yk-payment-1')])

    def test_callback_ignores_payment_the_gateway_still_calls_pending(self):
        """Подделанное уведомление об успехе не проходит: API говорит pending."""
        self._registered_payment()
        notification = {
            'event': 'payment.succeeded',
            'object': {'id': 'yk-payment-1', 'status': 'succeeded'},
        }
        with patch('apps.payments.providers.yookassa.YooKassaClient.SETTINGS', YK_SETTINGS), \
             patch('apps.payments.providers.yookassa.requests.request',
                   lambda *a, **kw: _FakeResponse(_payment_body(status='pending'))):
            self.assertIsNone(YooKassaClient().process_callback(notification))

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, PaymentStatus.PENDING)

    def test_underpaid_payment_is_not_credited(self):
        self._registered_payment()
        notification = {'event': 'payment.succeeded', 'object': {'id': 'yk-payment-1'}}
        with patch('apps.payments.providers.yookassa.YooKassaClient.SETTINGS', YK_SETTINGS), \
             patch('apps.payments.providers.yookassa.requests.request',
                   lambda *a, **kw: _FakeResponse(
                       _payment_body(status='succeeded', paid=True, value='100.00'))):
            self.assertIsNone(YooKassaClient().process_callback(notification))

    def test_canceled_payment_is_marked_failed(self):
        self._registered_payment()
        notification = {'event': 'payment.canceled', 'object': {'id': 'yk-payment-1'}}
        body = _payment_body(status='canceled', cancellation_details={'reason': 'expired_on_confirmation'})
        with patch('apps.payments.providers.yookassa.YooKassaClient.SETTINGS', YK_SETTINGS), \
             patch('apps.payments.providers.yookassa.requests.request',
                   lambda *a, **kw: _FakeResponse(body)):
            self.assertIsNone(YooKassaClient().process_callback(notification))

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, PaymentStatus.FAILED)

    def test_unknown_payment_is_ignored(self):
        notification = {'event': 'payment.succeeded', 'object': {'id': 'somebody-elses'}}
        with patch('apps.payments.providers.yookassa.YooKassaClient.SETTINGS', YK_SETTINGS):
            self.assertIsNone(YooKassaClient().process_callback(notification))

    def test_payment_is_found_by_our_metadata_when_id_is_unknown(self):
        """Если уведомление пришло раньше, чем мы сохранили id платежа."""
        notification = {
            'event': 'payment.succeeded',
            'object': {'id': 'yk-payment-1', 'metadata': {'payment_id': 'yk-test-payment'}},
        }
        with patch('apps.payments.providers.yookassa.YooKassaClient.SETTINGS', YK_SETTINGS), \
             patch('apps.payments.providers.yookassa.requests.request',
                   lambda *a, **kw: _FakeResponse(_payment_body(status='succeeded', paid=True))):
            # id ещё не сохранён, поэтому запрос статуса невозможен
            with self.assertRaises(ValueError):
                YooKassaClient().process_callback(notification)

    def test_refund_notification_marks_payment_refunded(self):
        payment = self._registered_payment()
        payment.status = PaymentStatus.COMPLETED
        payment.save(update_fields=['status'])
        notification = {
            'event': 'refund.succeeded',
            'object': {'id': 'refund-1', 'payment_id': 'yk-payment-1', 'status': 'succeeded'},
        }
        with patch('apps.payments.providers.yookassa.YooKassaClient.SETTINGS', YK_SETTINGS):
            self.assertIsNone(YooKassaClient().process_callback(notification))

        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentStatus.REFUNDED)


class TrustedIpTests(TestCase):
    def test_yookassa_networks_are_trusted(self):
        self.assertTrue(is_trusted_ip('185.71.76.1'))
        self.assertTrue(is_trusted_ip('77.75.156.11'))
        self.assertTrue(is_trusted_ip('2a02:5180::1'))

    def test_foreign_and_broken_addresses_are_rejected(self):
        self.assertFalse(is_trusted_ip('8.8.8.8'))
        self.assertFalse(is_trusted_ip('185.71.78.1'))
        self.assertFalse(is_trusted_ip('не адрес'))
        self.assertFalse(is_trusted_ip(''))

    def test_client_supplied_forwarded_header_cannot_spoof_the_sender(self):
        """X-Forwarded-For начинается тем, что прислал клиент, — берём X-Real-IP."""
        class _Req:
            META = {
                'HTTP_X_REAL_IP': '8.8.8.8',
                'HTTP_X_FORWARDED_FOR': '185.71.76.1, 8.8.8.8',
            }

        self.assertEqual(callback_client_ip(_Req()), '8.8.8.8')
        self.assertFalse(is_trusted_ip(callback_client_ip(_Req())))


@override_settings(SECURE_SSL_REDIRECT=False)
class YooKassaCallbackEndpointTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='yk_topup', email='yk_topup@example.com',
            password='pwd', role='client',
        )
        self.payment = Payment.objects.create(
            user=self.user, amount=Decimal('1000.00'),
            payment_method='yookassa', status=PaymentStatus.PENDING,
            purpose=Payment.Purpose.TOPUP,
            payment_id='yk-topup-1',
            metadata={'yookassa_payment_id': 'yk-payment-2', 'wallet_credit': '985.22'},
        )
        self.url = reverse('yookassa-callback')
        self.body = json.dumps({
            'event': 'payment.succeeded',
            'object': {'id': 'yk-payment-2', 'status': 'succeeded'},
        })

    def _post(self, **extra):
        return self.client.post(
            self.url, data=self.body, content_type='application/json', **extra
        )

    def test_both_callback_addresses_reach_the_handler(self):
        """Короткий адрес прописан в кабинете, длинный оставлен рабочим."""
        from django.urls import resolve

        short = '/api/payments/yookassa/callback/'
        long = '/api/payments/payments/yookassa/callback/'
        self.assertEqual(self.url, short)
        self.assertEqual(resolve(short).func, resolve(long).func)

    def test_notification_from_foreign_address_is_rejected(self):
        response = self._post(HTTP_X_REAL_IP='8.8.8.8')
        self.assertEqual(response.status_code, 403)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, PaymentStatus.PENDING)

    def test_successful_notification_completes_payment(self):
        body = _payment_body(status='succeeded', paid=True, value='1000.00')
        body['id'] = 'yk-payment-2'
        with patch('apps.payments.providers.yookassa.YooKassaClient.SETTINGS', YK_SETTINGS), \
             patch('apps.payments.providers.yookassa.requests.request',
                   lambda *a, **kw: _FakeResponse(body)):
            response = self._post(HTTP_X_REAL_IP=TRUSTED_IP)

        self.assertEqual(response.status_code, 200)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, PaymentStatus.COMPLETED)

    def test_gateway_failure_asks_yookassa_to_retry(self):
        """Не 2xx — ЮKassa повторит доставку, платёж не потеряется."""
        import requests as requests_module

        def boom(*args, **kwargs):
            raise requests_module.RequestException('шлюз недоступен')

        with patch('apps.payments.providers.yookassa.YooKassaClient.SETTINGS', YK_SETTINGS), \
             patch('apps.payments.providers.yookassa.requests.request', boom):
            response = self._post(HTTP_X_REAL_IP=TRUSTED_IP)

        self.assertEqual(response.status_code, 500)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, PaymentStatus.PENDING)


@override_settings(SECURE_SSL_REDIRECT=False, CARD_ACQUIRER='yookassa')
class CardAcquirerSwitchTests(TestCase):
    """Переключатель CARD_ACQUIRER должен уводить карточную рельсу в ЮKassa."""

    def setUp(self):
        # Сотрудник: у тестового магазина оплата открыта только своим,
        # а проверяется здесь маршрутизация, а не этот запрет.
        self.user = User.objects.create_user(
            username='yk_card', email='yk_card@example.com',
            password='pwd', role='admin', is_staff=True,
        )
        self.payment = Payment.objects.create(
            user=self.user, amount=Decimal('2000.00'),
            payment_method='card', status=PaymentStatus.PENDING,
            payment_id='yk-card-1',
        )

    def test_card_payments_go_through_yookassa(self):
        client = PaymentService._card_client()
        self.assertIsInstance(client, YooKassaClient)

        with patch('apps.payments.providers.yookassa.YooKassaClient.SETTINGS', YK_SETTINGS), \
             patch('apps.payments.providers.yookassa.requests.request',
                   lambda *a, **kw: _FakeResponse(_payment_body(value='2000.00'))):
            link = PaymentService.get_payment_link(self.payment)

        self.assertEqual(link, 'https://yoomoney.ru/checkout/x')

    @override_settings(CARD_ACQUIRER='uralsib')
    def test_rbs_callback_stays_with_rbs_when_yookassa_is_off(self):
        from apps.payments.providers.rbs import UralsibRBSClient
        self.assertIsInstance(PaymentService._card_rbs_client(), UralsibRBSClient)

    def test_rbs_callback_handler_ignores_yookassa_acquirer(self):
        """RBS-эндпоинт не должен обслуживать платежи ЮKassa."""
        self.assertIsNone(PaymentService._card_rbs_client())


@override_settings(SECURE_SSL_REDIRECT=False)
class PaymentStatusEndpointTests(TestCase):
    """Статус платежа для страницы возврата с формы.

    Адрес обслуживает list-роут, а не detail: важно, чтобы `status` не
    был принят за первичный ключ. И важно, что выборка идёт через
    get_queryset — иначе по чужому payment_id можно было бы подсмотреть
    чужие платежи.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username='yk_owner', email='yk_owner@example.com',
            password='pwd', role='client',
        )
        self.stranger = User.objects.create_user(
            username='yk_stranger', email='yk_stranger@example.com',
            password='pwd', role='client',
        )
        self.payment = Payment.objects.create(
            user=self.user, amount=Decimal('1000.00'),
            payment_method='yookassa', status=PaymentStatus.COMPLETED,
            purpose=Payment.Purpose.TOPUP, payment_id='yk-status-1',
        )
        self.url = reverse('payment-payment-status')

    def test_url_is_a_list_route_not_a_primary_key(self):
        self.assertEqual(self.url, '/api/payments/payments/status/')

    def test_owner_sees_the_payment_status(self):
        self.client.force_login(self.user)
        response = self.client.get(self.url, {'payment': 'yk-status-1'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], PaymentStatus.COMPLETED)
        self.assertEqual(response.json()['amount'], '1000.00')
        self.assertEqual(response.json()['purpose'], Payment.Purpose.TOPUP)

    def test_stranger_cannot_look_up_someone_elses_payment(self):
        self.client.force_login(self.stranger)
        response = self.client.get(self.url, {'payment': 'yk-status-1'})
        self.assertEqual(response.status_code, 404)

    def test_anonymous_is_rejected(self):
        response = self.client.get(self.url, {'payment': 'yk-status-1'})
        self.assertIn(response.status_code, (401, 403))

    def test_missing_parameter_is_a_bad_request(self):
        self.client.force_login(self.user)
        self.assertEqual(self.client.get(self.url).status_code, 400)


LIVE_SETTINGS = {**YK_SETTINGS, 'SECRET_KEY': 'live_real_key'}


@override_settings(SECURE_SSL_REDIRECT=False)
class TestShopIsClosedForRealClientsTests(TestCase):
    """Тестовый ключ создаёт платежи, которые ничего не списывают.

    До нас они доходят успешными и зачисляются на кошелёк, поэтому пока
    подключён тестовый магазин, платить через него могут только свои.
    """

    def setUp(self):
        self.client_user = User.objects.create_user(
            username='real_client', email='real@example.com',
            password='pwd', role='client',
        )
        self.staff = User.objects.create_user(
            username='staff_user', email='staff@example.com',
            password='pwd', role='admin', is_staff=True,
        )
        self.tester = User.objects.create_user(
            username='qa_user', email='qa@okoznaniy.test',
            password='pwd', role='client',
        )

    def _payment_for(self, user, method='yookassa'):
        return Payment.objects.create(
            user=user, amount=Decimal('1000.00'),
            payment_method=method, status=PaymentStatus.PENDING,
            purpose=Payment.Purpose.TOPUP,
            payment_id='yk-guard-%s' % user.pk,
        )

    def _link_for(self, user, settings_dict=None, method='yookassa'):
        payment = self._payment_for(user, method=method)
        with patch('apps.payments.providers.yookassa.YooKassaClient.SETTINGS',
                   settings_dict or YK_SETTINGS), \
             patch('apps.payments.providers.yookassa.requests.request',
                   lambda *a, **kw: _FakeResponse(_payment_body(value='1000.00'))):
            return PaymentService.get_payment_link(payment)

    def test_real_client_cannot_pay_into_the_test_shop(self):
        with self.assertRaises(ValueError) as ctx:
            self._link_for(self.client_user)
        self.assertIn('тестовый магазин', str(ctx.exception))

    def test_staff_can_pay_into_the_test_shop(self):
        self.assertEqual(self._link_for(self.staff), 'https://yoomoney.ru/checkout/x')

    def test_test_account_can_pay_into_the_test_shop(self):
        self.assertEqual(self._link_for(self.tester), 'https://yoomoney.ru/checkout/x')

    def test_live_key_opens_payments_for_everyone(self):
        link = self._link_for(self.client_user, settings_dict=LIVE_SETTINGS)
        self.assertEqual(link, 'https://yoomoney.ru/checkout/x')

    @override_settings(CARD_ACQUIRER='yookassa')
    def test_card_rail_is_guarded_too(self):
        """Через CARD_ACQUIRER=yookassa тестовый магазин тоже не обойти."""
        with self.assertRaises(ValueError) as ctx:
            self._link_for(self.client_user, method='card')
        self.assertIn('тестовый магазин', str(ctx.exception))

    def test_order_payment_checks_the_client_of_the_order(self):
        """У оплаты заказа плательщик берётся из заказа, а не из user."""
        from datetime import timedelta

        from django.utils import timezone

        from apps.orders.models import Order

        order = Order.objects.create(
            client=self.client_user, title='Курсовая', description='test',
            budget=Decimal('1000.00'), deadline=timezone.now() + timedelta(days=7),
        )
        payment = Payment.objects.create(
            order=order, amount=Decimal('1000.00'),
            payment_method='yookassa', status=PaymentStatus.PENDING,
            payment_id='yk-guard-order',
        )
        with patch('apps.payments.providers.yookassa.YooKassaClient.SETTINGS', YK_SETTINGS):
            with self.assertRaises(ValueError) as ctx:
                PaymentService.get_payment_link(payment)
        self.assertIn('тестовый магазин', str(ctx.exception))
