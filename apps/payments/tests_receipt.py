"""Чек по 54-ФЗ: контакт плательщика и запрос почты, когда её нет.

Магазин с фискализацией отклоняет платёж без чека, а чек невозможен без
почты или телефона покупателя. У аккаунтов, заведённых через соцсети,
контактов может не быть — на них оплата и обрывалась.
"""
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.payments.models import Payment, PaymentStatus
from apps.payments.providers.yookassa import (
    ReceiptContactRequired, YooKassaClient,
)

User = get_user_model()


def make_payment(user, amount="500.00", **extra):
    return Payment.objects.create(
        user=user,
        amount=Decimal(amount),
        payment_method="yookassa",
        status=PaymentStatus.PENDING,
        payment_id=f"test-{user.pk}-{extra.pop('tag', 'a')}",
        **extra,
    )


class ReceiptCustomerTests(TestCase):
    """Откуда берётся контакт для чека."""

    def test_uses_profile_email(self):
        user = User.objects.create(username="with_email", email="buyer@example.com")
        receipt = YooKassaClient()._receipt(make_payment(user))
        self.assertEqual(receipt["customer"], {"email": "buyer@example.com"})

    def test_phone_normalised_to_country_code(self):
        """Телефон 8XXXXXXXXXX ЮKassa не примет — нужен 7XXXXXXXXXX."""
        user = User.objects.create(username="with_phone", email="", phone="8 (900) 123-45-67")
        receipt = YooKassaClient()._receipt(make_payment(user))
        self.assertEqual(receipt["customer"]["phone"], "79001234567")

    def test_stated_email_wins_over_profile(self):
        """Почта, введённая при оплате, важнее профиля: её вводят для чека."""
        user = User.objects.create(username="both", email="old@example.com")
        payment = make_payment(user, metadata={"receipt_email": "new@example.com"})
        receipt = YooKassaClient()._receipt(payment)
        self.assertEqual(receipt["customer"]["email"], "new@example.com")

    def test_without_any_contact_raises_own_error(self):
        """Отдельный тип ошибки — по нему интерфейс покажет поле почты."""
        user = User.objects.create(username="no_contact", email="", phone="")
        with self.assertRaises(ReceiptContactRequired):
            YooKassaClient()._receipt(make_payment(user))

    def test_topup_is_advance_and_order_is_service(self):
        """Пополнение кошелька — аванс, оплата заказа — услуга."""
        user = User.objects.create(username="subjects", email="s@example.com")
        item = YooKassaClient()._receipt(make_payment(user))["items"][0]
        self.assertEqual(item["payment_subject"], "payment")
        self.assertEqual(item["payment_mode"], "advance")

    def test_receipt_amount_matches_payment(self):
        user = User.objects.create(username="amounts", email="a@example.com")
        item = YooKassaClient()._receipt(make_payment(user, amount="1234.50"))["items"][0]
        self.assertEqual(item["amount"]["value"], "1234.50")


@override_settings(YOOKASSA_TEST_SHOP_OPEN_TO_ALL=False)
class TopupReceiptEmailTests(TestCase):
    """Пополнение кошелька, когда в профиле нет контактов."""

    def setUp(self):
        self.user = User.objects.create(username="payer", email="", phone="")
        self.client_api = APIClient()
        self.client_api.force_authenticate(user=self.user)

    def test_asks_for_email_with_machine_readable_code(self):
        response = self.client_api.post("/api/wallet/topup/", {
            "amount": "500.00", "payment_method": "yookassa",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data.get("code"), "receipt_email_required")

    def test_given_email_reaches_receipt_and_profile(self):
        """Почту спрашиваем один раз: дальше она живёт в профиле."""
        seen = {}

        def fake_request(self_, method, path, payload=None, idempotence_key=None):
            seen["payload"] = payload
            return {
                "id": "yk-1",
                "status": "pending",
                "confirmation": {"confirmation_url": "https://pay.example/1"},
            }

        with patch.object(YooKassaClient, "_request", fake_request):
            response = self.client_api.post("/api/wallet/topup/", {
                "amount": "500.00",
                "payment_method": "yookassa",
                "receipt_email": "buyer@example.com",
            }, format="json")

        self.assertEqual(response.status_code, 200, response.data)
        customer = seen["payload"]["receipt"]["customer"]
        self.assertEqual(customer["email"], "buyer@example.com")

        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "buyer@example.com")

    def test_existing_email_is_not_overwritten(self):
        """Чужую почту в чеке принимаем, но профиль не переписываем."""
        self.user.email = "real@example.com"
        self.user.save(update_fields=["email"])

        def fake_request(self_, method, path, payload=None, idempotence_key=None):
            return {
                "id": "yk-2",
                "status": "pending",
                "confirmation": {"confirmation_url": "https://pay.example/2"},
            }

        with patch.object(YooKassaClient, "_request", fake_request):
            self.client_api.post("/api/wallet/topup/", {
                "amount": "500.00",
                "payment_method": "yookassa",
                "receipt_email": "other@example.com",
            }, format="json")

        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "real@example.com")

    def test_invalid_email_rejected(self):
        response = self.client_api.post("/api/wallet/topup/", {
            "amount": "500.00",
            "payment_method": "yookassa",
            "receipt_email": "не-почта",
        }, format="json")
        self.assertEqual(response.status_code, 400)
