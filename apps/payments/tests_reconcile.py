"""Сверка платежей: деньги не должны теряться из-за недошедшего уведомления.

На боевом запуске оплата прошла, уведомление от ЮKassa не пришло ни разу,
и баланс остался нулевым. Эти тесты закрывают оба прохода сверки, чтобы
такое не повторилось молча.
"""
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.payments.models import Payment, PaymentStatus
from apps.payments.providers.yookassa import YooKassaClient
from apps.payments.tasks import (
    reconcile_gateway_payments, reconcile_pending_payments,
)
from apps.wallet.services import WalletService

User = get_user_model()


def gateway_says(status="succeeded", paid=True, value="103.50"):
    """Ответ шлюза на запрос статуса платежа."""
    def fake_request(self, method, path, payload=None, idempotence_key=None):
        return {
            "id": "yk-remote-1",
            "status": status,
            "paid": paid,
            "amount": {"value": value, "currency": "RUB"},
        }
    return fake_request


def make_pending(user, minutes_ago=10, remote_id="yk-remote-1", amount="103.50"):
    payment = Payment.objects.create(
        user=user,
        amount=Decimal(amount),
        payment_method="yookassa",
        status=PaymentStatus.PENDING,
        purpose=Payment.Purpose.TOPUP,
        payment_id=f"topup-{user.pk}-{remote_id}",
        metadata={"yookassa_payment_id": remote_id, "wallet_credit": "100.00"},
    )
    # created_at заполняется автоматически, сдвигаем отдельно.
    Payment.objects.filter(pk=payment.pk).update(
        created_at=timezone.now() - timedelta(minutes=minutes_ago),
    )
    payment.refresh_from_db()
    return payment


class ReconcilePendingTests(TestCase):
    """Проход от наших записей."""

    def setUp(self):
        self.user = User.objects.create(username="payer_rec", email="p@example.com")

    def test_settles_payment_when_notification_never_arrived(self):
        payment = make_pending(self.user)
        before = WalletService.get_balance(self.user)["balance"]

        with patch.object(YooKassaClient, "_request", gateway_says()):
            result = reconcile_pending_payments()

        payment.refresh_from_db()
        self.assertEqual(result["settled"], 1)
        self.assertEqual(payment.status, PaymentStatus.COMPLETED)
        self.assertGreater(WalletService.get_balance(self.user)["balance"], before)

    def test_leaves_fresh_payment_alone(self):
        """Человек ещё стоит на форме — дёргать шлюз рано."""
        make_pending(self.user, minutes_ago=0)

        with patch.object(YooKassaClient, "_request", gateway_says()):
            result = reconcile_pending_payments(min_age_seconds=120)

        self.assertEqual(result["checked"], 0)

    def test_does_not_credit_unpaid_payment(self):
        payment = make_pending(self.user)

        with patch.object(YooKassaClient, "_request", gateway_says(status="pending", paid=False)):
            result = reconcile_pending_payments()

        payment.refresh_from_db()
        self.assertEqual(result["settled"], 0)
        self.assertEqual(payment.status, PaymentStatus.PENDING)
        self.assertEqual(WalletService.get_balance(self.user)["balance"], Decimal("0.00"))

    def test_does_not_credit_twice(self):
        """Повторный проход по уже проведённому платежу денег не добавляет."""
        make_pending(self.user)

        with patch.object(YooKassaClient, "_request", gateway_says()):
            reconcile_pending_payments()
            after_first = WalletService.get_balance(self.user)["balance"]
            reconcile_pending_payments()

        self.assertEqual(WalletService.get_balance(self.user)["balance"], after_first)

    def test_one_broken_payment_does_not_stop_the_rest(self):
        good = make_pending(self.user, remote_id="yk-ok")
        bad = make_pending(self.user, remote_id="yk-bad")

        def flaky(self_, method, path, payload=None, idempotence_key=None):
            if "yk-bad" in path:
                raise RuntimeError("шлюз недоступен")
            return {
                "id": "yk-ok", "status": "succeeded", "paid": True,
                "amount": {"value": "103.50", "currency": "RUB"},
            }

        with patch.object(YooKassaClient, "_request", flaky):
            result = reconcile_pending_payments()

        good.refresh_from_db()
        bad.refresh_from_db()
        self.assertEqual(good.status, PaymentStatus.COMPLETED)
        self.assertEqual(bad.status, PaymentStatus.PENDING)
        self.assertEqual(result["errors"], 1)


class ReconcileGatewayTests(TestCase):
    """Встречный проход: от списка оплат у шлюза."""

    def setUp(self):
        self.user = User.objects.create(username="payer_gw", email="g@example.com")

    def test_settles_payment_that_lost_its_gateway_id(self):
        """Ссылка на платёж не сохранилась — находим по метаданным шлюза."""
        payment = Payment.objects.create(
            user=self.user,
            amount=Decimal("103.50"),
            payment_method="yookassa",
            status=PaymentStatus.PENDING,
            purpose=Payment.Purpose.TOPUP,
            payment_id="topup-lost-link",
            metadata={"wallet_credit": "100.00"},  # yookassa_payment_id отсутствует
        )

        listing = {"items": [{
            "id": "yk-remote-1", "paid": True, "status": "succeeded",
            "amount": {"value": "103.50", "currency": "RUB"},
            "metadata": {"payment_id": "topup-lost-link"},
        }]}

        def fake_request(self_, method, path, payload=None, idempotence_key=None):
            if path.startswith("payments?"):
                return listing
            return {
                "id": "yk-remote-1", "status": "succeeded", "paid": True,
                "amount": {"value": "103.50", "currency": "RUB"},
            }

        with patch.object(YooKassaClient, "_request", fake_request):
            result = reconcile_gateway_payments()

        payment.refresh_from_db()
        # Проход от наших записей такой платёж не видит — ссылки нет.
        with patch.object(YooKassaClient, "_request", fake_request):
            self.assertEqual(reconcile_pending_payments()["checked"], 0)

        self.assertEqual(result["settled"], 1)
        self.assertEqual(payment.status, PaymentStatus.COMPLETED)

    def test_reports_payment_without_local_record(self):
        """Деньги приняты, а записи нет — это случай для человека."""
        listing = {"items": [{
            "id": "yk-unknown", "paid": True, "status": "succeeded",
            "amount": {"value": "500.00", "currency": "RUB"},
            "metadata": {"payment_id": "topup-never-existed"},
        }]}

        def fake_request(self_, method, path, payload=None, idempotence_key=None):
            return listing

        with patch.object(YooKassaClient, "_request", fake_request):
            result = reconcile_gateway_payments()

        self.assertEqual(result["orphans"], 1)
        self.assertEqual(result["settled"], 0)

    def test_ignores_unpaid_entries(self):
        listing = {"items": [{
            "id": "yk-x", "paid": False, "status": "pending",
            "amount": {"value": "500.00", "currency": "RUB"},
            "metadata": {"payment_id": "whatever"},
        }]}

        with patch.object(
            YooKassaClient, "_request",
            lambda s, m, p, payload=None, idempotence_key=None: listing,
        ):
            result = reconcile_gateway_payments()

        self.assertEqual(result["checked"], 0)
