"""Regression tests for the shop work-creation endpoint.

Bug: ``POST /api/shop/works/`` returned 400 when users tried to add ready work
without realising the description field was effectively empty (the rich-text
editor produces empty HTML markup that strips down to ``''``). The generic
error toast hid the underlying validation error from the user. This test
suite locks in the expected backend contract:

* Authenticated authors can create a ready work with the minimum required
  fields (no preview image, no work files).
* Empty descriptions are rejected with a 400 — the API must surface a
  ``description`` validation error so the frontend can show a meaningful
  message instead of a generic 'something went wrong'.
"""

from decimal import Decimal
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.catalog.models import Subject, WorkType
from apps.notifications.models import Notification, NotificationType
from apps.orders.models import Order, Transaction, TransactionType
from apps.shop.models import Purchase, ReadyWork

User = get_user_model()


@override_settings(SECURE_SSL_REDIRECT=False)
class ReadyWorkCreationRegressionTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.subject = Subject.objects.create(name="Регрессия — Магазин")
        cls.work_type = WorkType.objects.create(name="Регрессия — Курсовая")
        cls.author = User.objects.create_user(
            username="shop_regression_author",
            email="shop_regression_author@example.com",
            password="pwd",
            role="expert",
        )

    def setUp(self):
        self.api_client = APIClient()
        self.api_client.force_authenticate(user=self.author)

    def _payload(self, **overrides):
        payload = {
            "title": "Regression work",
            "description": "Detailed description for the regression test",
            "price": "199.99",
            "subject": self.subject.id,
            "work_type": self.work_type.id,
        }
        payload.update(overrides)
        return payload

    def test_minimum_required_fields_create_work(self):
        response = self.api_client.post(
            "/api/shop/works/", self._payload(), format="multipart"
        )
        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
            f"unexpected status={response.status_code}, body={response.content[:400]!r}",
        )
        body = response.json()
        work = ReadyWork.objects.get(pk=body["id"])
        self.assertEqual(work.author_id, self.author.id)
        self.assertEqual(work.price, Decimal("199.99"))
        self.assertEqual(work.subject_id, self.subject.id)
        self.assertEqual(work.work_type_id, self.work_type.id)
        self.assertEqual(work.moderation_status, ReadyWork.ModerationStatus.PENDING)
        self.assertFalse(work.is_active)

    def test_html_description_is_sanitised(self):
        """Rich-text HTML must be sanitised on the server — strips tags and
        keeps plain text so the description is searchable / displayable."""
        response = self.api_client.post(
            "/api/shop/works/",
            self._payload(description="<p>Hello <b>world</b></p>"),
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        body = response.json()
        self.assertEqual(body["description"], "Hello world")

    def test_preview_upload_creates_work(self):
        preview = SimpleUploadedFile(
            "preview.gif",
            (
                b"GIF89a\x01\x00\x01\x00\x80\x00\x00"
                b"\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,"
                b"\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
            ),
            content_type="image/gif",
        )
        response = self.api_client.post(
            "/api/shop/works/",
            self._payload(preview=preview),
            format="multipart",
        )
        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
            f"unexpected status={response.status_code}, body={response.content[:400]!r}",
        )
        body = response.json()
        work = ReadyWork.objects.get(pk=body["id"])
        self.assertTrue(bool(work.preview))
        self.assertIn("ready_works/previews/", work.preview.name)

    def test_empty_description_returns_400_with_field_error(self):
        """Blank description must return a structured 400 the frontend can
        translate into a user-facing message."""
        response = self.api_client.post(
            "/api/shop/works/",
            self._payload(description=""),
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        body = response.json()
        self.assertIn("description", body)


@override_settings(SECURE_SSL_REDIRECT=False)
class ReadyWorkPurchaseWalletTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.subject = Subject.objects.create(name="Purchase subject")
        cls.work_type = WorkType.objects.create(name="Purchase work type")
        cls.author = User.objects.create_user(
            username="purchase_author",
            email="purchase_author@example.com",
            password="pwd",
            role="expert",
        )
        cls.buyer = User.objects.create_user(
            username="purchase_buyer",
            email="purchase_buyer@example.com",
            password="pwd",
            role="client",
        )

    def setUp(self):
        self.api_client = APIClient()
        self.api_client.force_authenticate(user=self.buyer)
        self.work = ReadyWork.objects.create(
            title="Approved work",
            description="Approved work description",
            price=Decimal("1200.00"),
            subject=self.subject,
            work_type=self.work_type,
            author=self.author,
            is_active=True,
            moderation_status=ReadyWork.ModerationStatus.APPROVED,
        )

    def test_purchase_requires_available_wallet_funds(self):
        response = self.api_client.post(f"/api/shop/works/{self.work.id}/purchase/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Purchase.objects.exists())
        self.assertFalse(Order.objects.exists())
        self.assertFalse(Transaction.objects.exists())

    def test_purchase_is_fully_paid_in_escrow_and_waits_for_expert_upload(self):
        self.buyer.balance = Decimal("1200.00")
        self.buyer.save(update_fields=["balance"])

        response = self.api_client.post(f"/api/shop/works/{self.work.id}/purchase/")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        purchase = Purchase.objects.get(pk=response.json()["id"])
        order = purchase.order
        self.buyer.refresh_from_db()
        self.author.refresh_from_db()

        self.assertEqual(order.status, Order.READY_WORK_TRANSFER)
        self.assertTrue(order.is_ready_work_purchase)
        self.assertIsNotNone(order.transfer_started_at)
        self.assertIsNotNone(order.transfer_deadline)
        self.assertEqual(order.final_price, Decimal("1200.00"))
        self.assertEqual(self.buyer.balance, Decimal("1200.00"))
        self.assertEqual(self.buyer.frozen_balance, Decimal("1200.00"))
        self.assertEqual(self.author.balance, Decimal("0.00"))
        self.assertEqual(
            list(Transaction.objects.filter(order=order).values_list("type", flat=True)),
            [TransactionType.HOLD],
        )
        self.assertEqual(order.files.count(), 0)

        order_response = self.api_client.get(f"/api/orders/orders/{order.id}/")
        self.assertEqual(order_response.status_code, status.HTTP_200_OK, order_response.content)
        self.assertEqual(order_response.json()["payment_status"], "paid")

        expert_api = APIClient()
        expert_api.force_authenticate(user=self.author)
        expert_order_response = expert_api.get(f"/api/orders/orders/{order.id}/")
        self.assertEqual(expert_order_response.status_code, status.HTTP_200_OK)
        self.assertTrue(expert_order_response.json()["available_actions"]["can_upload_work"])
        self.assertFalse(expert_order_response.json()["available_actions"]["can_submit_work"])

    def test_cancel_ready_work_order_returns_full_escrow(self):
        self.buyer.balance = Decimal("1200.00")
        self.buyer.save(update_fields=["balance"])
        purchase_response = self.api_client.post(f"/api/shop/works/{self.work.id}/purchase/")
        purchase_id = purchase_response.json()["id"]

        response = self.api_client.post(f"/api/shop/purchases/{purchase_id}/cancel/")

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        purchase = Purchase.objects.get(pk=purchase_id)
        purchase.order.refresh_from_db()
        self.buyer.refresh_from_db()
        self.assertEqual(purchase.order.status, "cancelled")
        self.assertEqual(self.buyer.balance, Decimal("1200.00"))
        self.assertEqual(self.buyer.frozen_balance, Decimal("0.00"))
        self.assertEqual(
            set(Transaction.objects.filter(order=purchase.order).values_list("type", flat=True)),
            {TransactionType.HOLD, TransactionType.REFUND},
        )

    def test_cancel_before_transfer_deadline_is_rejected(self):
        """Пока таймер передачи не истёк, клиент не может отменить заказ —
        деньги лежат в эскроу, эксперт ещё может успеть загрузить работу."""
        self.buyer.balance = Decimal("1200.00")
        self.buyer.save(update_fields=["balance"])
        purchase_response = self.api_client.post(f"/api/shop/works/{self.work.id}/purchase/")
        purchase_id = purchase_response.json()["id"]

        response = self.api_client.post(f"/api/shop/purchases/{purchase_id}/cancel/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.content)
        purchase = Purchase.objects.get(pk=purchase_id)
        purchase.order.refresh_from_db()
        self.buyer.refresh_from_db()
        self.assertEqual(purchase.order.status, Order.READY_WORK_TRANSFER)
        self.assertEqual(self.buyer.balance, Decimal("0.00"))
        self.assertEqual(self.buyer.frozen_balance, Decimal("1200.00"))
        self.assertFalse(
            Transaction.objects.filter(order=purchase.order, type=TransactionType.REFUND).exists()
        )

    def test_cancel_after_transfer_deadline_refunds_and_writes_one_star_review(self):
        """После истечения таймера клиент может отменить заказ:
        деньги возвращаются, эксперту автоматически выставляется 1★,
        обе стороны получают уведомления."""
        from apps.experts.models import ExpertReview

        self.buyer.balance = Decimal("1200.00")
        self.buyer.save(update_fields=["balance"])
        purchase_response = self.api_client.post(f"/api/shop/works/{self.work.id}/purchase/")
        purchase_id = purchase_response.json()["id"]
        purchase = Purchase.objects.get(pk=purchase_id)
        order = purchase.order

        # Имитируем истечение таймера передачи.
        order.transfer_deadline = timezone.now() - timedelta(hours=1)
        order.save(update_fields=['transfer_deadline', 'updated_at'])

        response = self.api_client.post(f"/api/shop/purchases/{purchase_id}/cancel/")

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        body = response.json()
        self.assertEqual(body['status'], 'cancelled')
        self.assertTrue(body.get('auto_review_issued'))

        purchase = Purchase.objects.get(pk=purchase_id)
        purchase.order.refresh_from_db()
        self.buyer.refresh_from_db()
        self.author.refresh_from_db()

        # Деньги вернулись на кошелёк.
        self.assertEqual(self.buyer.balance, Decimal("1200.00"))
        self.assertEqual(self.buyer.frozen_balance, Decimal("0.00"))
        self.assertEqual(purchase.order.status, "cancelled")

        # Авто-отзыв 1★ выставлен и опубликован.
        review = ExpertReview.objects.get(order=purchase.order)
        self.assertEqual(review.rating, 1)
        self.assertEqual(review.expert_id, self.author.id)
        self.assertEqual(review.client_id, self.buyer.id)
        self.assertTrue(review.is_published)
        self.assertTrue(purchase.order.auto_bad_review_issued)

        # Транзакции: HOLD + REFUND.
        self.assertEqual(
            set(Transaction.objects.filter(order=purchase.order).values_list("type", flat=True)),
            {TransactionType.HOLD, TransactionType.REFUND},
        )

        # Уведомления обеим сторонам.
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.author,
                related_object_id=purchase.order.id,
                related_object_type='order',
            ).exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.buyer,
                related_object_id=purchase.order.id,
                related_object_type='order',
            ).exists()
        )

    def test_available_actions_flag_transfer_deadline_passed(self):
        """Сериализатор заказа выставляет can_cancel_ready_work и
        transfer_deadline_passed для клиента после истечения таймера."""
        self.buyer.balance = Decimal("1200.00")
        self.buyer.save(update_fields=["balance"])
        self.api_client.post(f"/api/shop/works/{self.work.id}/purchase/")
        order = Order.objects.get(is_ready_work_purchase=True)

        # До истечения таймера — действия нет.
        response = self.api_client.get(f"/api/orders/orders/{order.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertTrue(body['is_ready_work_purchase'])
        self.assertFalse(body['transfer_deadline_passed'])
        self.assertFalse(body['available_actions']['can_cancel_ready_work'])
        self.assertGreater(body['transfer_seconds_left'], 0)

        # После истечения таймера — действие становится доступным.
        order.transfer_deadline = timezone.now() - timedelta(minutes=1)
        order.save(update_fields=['transfer_deadline', 'updated_at'])

        response = self.api_client.get(f"/api/orders/orders/{order.id}/")
        body = response.json()
        self.assertTrue(body['transfer_deadline_passed'])
        self.assertEqual(body['transfer_seconds_left'], 0)
        self.assertTrue(body['available_actions']['can_cancel_ready_work'])


@override_settings(SECURE_SSL_REDIRECT=False)
class ReadyWorkTransferExpiryTaskTests(TestCase):
    """Периодическая задача: когда у заказа из магазина истекает таймер
    передачи, эксперту уходит уведомление «клиент может отменить» — однократно."""

    @classmethod
    def setUpTestData(cls):
        cls.subject = Subject.objects.create(name="Task subject")
        cls.work_type = WorkType.objects.create(name="Task work type")
        cls.author = User.objects.create_user(
            username="expiry_author",
            email="expiry_author@example.com",
            password="pwd",
            role="expert",
        )
        cls.buyer = User.objects.create_user(
            username="expiry_buyer",
            email="expiry_buyer@example.com",
            password="pwd",
            role="client",
        )

    def setUp(self):
        self.work = ReadyWork.objects.create(
            title="Tasked work",
            description="Description",
            price=Decimal("500.00"),
            subject=self.subject,
            work_type=self.work_type,
            author=self.author,
            is_active=True,
            moderation_status=ReadyWork.ModerationStatus.APPROVED,
        )

    def _purchase(self):
        self.buyer.balance = Decimal("500.00")
        self.buyer.save(update_fields=["balance"])
        client = APIClient()
        client.force_authenticate(user=self.buyer)
        response = client.post(f"/api/shop/works/{self.work.id}/purchase/")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        return Order.objects.get(is_ready_work_purchase=True)

    def test_task_notifies_expert_once(self):
        from apps.orders.tasks import expire_ready_work_transfers

        order = self._purchase()
        order.transfer_deadline = timezone.now() - timedelta(minutes=5)
        order.save(update_fields=['transfer_deadline', 'updated_at'])

        result = expire_ready_work_transfers()
        self.assertIn("Уведомлений о просрочке передачи: 1", result)

        order.refresh_from_db()
        self.assertIsNotNone(order.transfer_deadline_notified_at)
        self.assertEqual(
            Notification.objects.filter(
                recipient=self.author,
                type=NotificationType.EXPERT_VIOLATION,
                related_object_id=order.id,
            ).count(),
            1,
        )

        # Повторный запуск — уведомлений больше нет, флаг проставлен.
        result2 = expire_ready_work_transfers()
        self.assertIn("Уведомлений о просрочке передачи: 0", result2)
        self.assertEqual(
            Notification.objects.filter(
                recipient=self.author,
                type=NotificationType.EXPERT_VIOLATION,
                related_object_id=order.id,
            ).count(),
            1,
        )

    def test_task_does_not_notify_for_active_timer(self):
        from apps.orders.tasks import expire_ready_work_transfers

        self._purchase()
        # Таймер в будущем — заказ не должен попасть под таску.
        result = expire_ready_work_transfers()
        self.assertIn("Уведомлений о просрочке передачи: 0", result)
        self.assertFalse(
            Notification.objects.filter(type=NotificationType.EXPERT_VIOLATION).exists()
        )
