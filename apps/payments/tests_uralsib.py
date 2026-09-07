"""Тесты эквайринга Уралсиб (шлюз RBS)."""
import hashlib
import hmac
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from apps.payments.models import Payment, PaymentMethod, PaymentStatus
from apps.payments.providers.rbs import (
    OrderStatus, UralsibRBSClient, UralsibRBSError,
)

User = get_user_model()

TEST_SETTINGS = {
    "API_URL": "https://uralsib.rbsuat.com/payment/rest",
    "USERNAME": "test_api",
    "PASSWORD": "test_pass",
    "CALLBACK_SECRET": "s3cret",
    "SUCCESS_URL": "https://okoznaniy.ru/payment/success/",
    "FAIL_URL": "https://okoznaniy.ru/payment/fail/",
    "CURRENCY": "643",
    "TIMEOUT": 20,
}


class _FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise AssertionError("HTTP %s" % self.status_code)

    def json(self):
        return self._payload


def _patched_settings():
    return patch.dict(
        "apps.payments.providers.rbs.URALSIB_SETTINGS", TEST_SETTINGS, clear=False,
    )


class UralsibClientTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="payer", email="payer@example.com", password="x",
        )
        self.payment = Payment.objects.create(
            amount=Decimal("1500.00"),
            payment_method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            user=self.user,
            payment_id="topup-1-abc",
            metadata={},
        )

    def test_not_configured_raises(self):
        with patch.dict(
            "apps.payments.providers.rbs.URALSIB_SETTINGS",
            {**TEST_SETTINGS, "USERNAME": "", "PASSWORD": ""},
            clear=False,
        ):
            client = UralsibRBSClient()
            self.assertFalse(client.configured)
            with self.assertRaises(ValueError):
                client.register_payment(self.payment)

    def test_register_sends_kopecks_and_credentials(self):
        captured = {}

        def fake_post(url, data=None, timeout=None):
            captured["url"] = url
            captured["data"] = data
            return _FakeResponse({"orderId": "ord-77", "formUrl": "https://pay/form"})

        with _patched_settings(), patch("apps.payments.providers.rbs.requests.post", fake_post):
            result = UralsibRBSClient().register_payment(self.payment)

        self.assertEqual(result["formUrl"], "https://pay/form")
        self.assertTrue(captured["url"].endswith("/register.do"))
        # Сумма уходит в копейках.
        self.assertEqual(captured["data"]["amount"], 150000)
        # Авторизация — параметрами тела, а не заголовком.
        self.assertEqual(captured["data"]["userName"], "test_api")
        self.assertEqual(captured["data"]["password"], "test_pass")
        self.assertEqual(captured["data"]["currency"], "643")

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.metadata["uralsib_order_id"], "ord-77")

    def test_error_code_raises(self):
        def fake_post(url, data=None, timeout=None):
            return _FakeResponse({"errorCode": "1", "errorMessage": "Заказ уже оплачен"})

        with _patched_settings(), patch("apps.payments.providers.rbs.requests.post", fake_post):
            with self.assertRaises(UralsibRBSError) as ctx:
                UralsibRBSClient().register_payment(self.payment)
        self.assertEqual(ctx.exception.code, "1")

    def test_refund_sends_kopecks(self):
        self.payment.metadata = {"uralsib_order_id": "ord-77"}
        self.payment.save()
        captured = {}

        def fake_post(url, data=None, timeout=None):
            captured["url"] = url
            captured["data"] = data
            return _FakeResponse({"errorCode": "0"})

        with _patched_settings(), patch("apps.payments.providers.rbs.requests.post", fake_post):
            UralsibRBSClient().refund(self.payment, Decimal("500.00"))

        self.assertTrue(captured["url"].endswith("/refund.do"))
        self.assertEqual(captured["data"]["amount"], 50000)


class UralsibChecksumTests(TestCase):
    def _checksum(self, data, secret="s3cret"):
        parts = []
        for key in sorted(k for k in data if k not in ("checksum", "sign_alias")):
            parts.append(f"{key};{data[key]};")
        return hmac.new(
            secret.encode(), "".join(parts).encode(), hashlib.sha256,
        ).hexdigest().upper()

    def test_valid_checksum_accepted(self):
        data = {"mdOrder": "ord-77", "orderNumber": "OKO-1-aa", "operation": "deposited", "status": "1"}
        data["checksum"] = self._checksum(data)
        with _patched_settings():
            self.assertTrue(UralsibRBSClient().verify_callback(data))

    def test_tampered_payload_rejected(self):
        data = {"mdOrder": "ord-77", "orderNumber": "OKO-1-aa", "operation": "deposited", "status": "1"}
        data["checksum"] = self._checksum(data)
        data["status"] = "0"  # подменили после подписи
        with _patched_settings():
            self.assertFalse(UralsibRBSClient().verify_callback(data))

    def test_missing_checksum_rejected(self):
        with _patched_settings():
            self.assertFalse(UralsibRBSClient().verify_callback({"mdOrder": "ord-77"}))


class UralsibCallbackTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="payer2", email="p2@example.com", password="x",
        )
        self.payment = Payment.objects.create(
            amount=Decimal("1000.00"),
            payment_method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            user=self.user,
            payment_id="topup-2-xyz",
            metadata={"uralsib_order_id": "ord-88", "uralsib_order_number": "OKO-2-bb"},
        )

    def _signed(self, **extra):
        data = {"mdOrder": "ord-88", "orderNumber": "OKO-2-bb", "operation": "deposited", "status": "1"}
        data.update(extra)
        parts = []
        for key in sorted(k for k in data if k not in ("checksum", "sign_alias")):
            parts.append(f"{key};{data[key]};")
        data["checksum"] = hmac.new(
            b"s3cret", "".join(parts).encode(), hashlib.sha256,
        ).hexdigest().upper()
        return data

    def test_paid_order_returns_payment(self):
        with _patched_settings(), patch.object(
            UralsibRBSClient, "get_order_status",
            return_value={"orderStatus": OrderStatus.APPROVED, "approvalCode": "123456"},
        ):
            result = UralsibRBSClient().process_callback(self._signed())
        self.assertIsNotNone(result)
        self.assertEqual(result.pk, self.payment.pk)

    def test_unpaid_order_returns_none(self):
        with _patched_settings(), patch.object(
            UralsibRBSClient, "get_order_status",
            return_value={"orderStatus": OrderStatus.REGISTERED},
        ):
            result = UralsibRBSClient().process_callback(self._signed())
        self.assertIsNone(result)

    def test_declined_marks_payment_failed(self):
        with _patched_settings(), patch.object(
            UralsibRBSClient, "get_order_status",
            return_value={"orderStatus": OrderStatus.DECLINED},
        ):
            result = UralsibRBSClient().process_callback(self._signed())
        self.assertIsNone(result)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, PaymentStatus.FAILED)

    def test_bad_signature_rejected_without_status_call(self):
        data = self._signed()
        data["checksum"] = "DEADBEEF"
        with _patched_settings(), patch.object(
            UralsibRBSClient, "get_order_status",
        ) as status_call:
            result = UralsibRBSClient().process_callback(data)
        self.assertIsNone(result)
        status_call.assert_not_called()

    def test_unknown_order_returns_none(self):
        data = self._signed(mdOrder="does-not-exist", orderNumber="nope")
        with _patched_settings():
            self.assertIsNone(UralsibRBSClient().process_callback(data))

    def test_status_is_source_of_truth_over_callback_claim(self):
        """Колбэк says «оплачено», шлюз says «нет» — верим шлюзу."""
        with _patched_settings(), patch.object(
            UralsibRBSClient, "get_order_status",
            return_value={"orderStatus": OrderStatus.REGISTERED},
        ):
            result = UralsibRBSClient().process_callback(self._signed(status="1"))
        self.assertIsNone(result)


@override_settings(CARD_ACQUIRER="uralsib")
class CardRoutingTests(TestCase):
    def test_card_rail_routes_to_uralsib(self):
        from apps.payments.services import PaymentService
        self.assertEqual(PaymentService._card_acquirer(), "uralsib")

    @override_settings(CARD_ACQUIRER="alfabank")
    def test_switch_back_to_alfabank(self):
        from apps.payments.services import PaymentService
        self.assertEqual(PaymentService._card_acquirer(), "alfabank")
