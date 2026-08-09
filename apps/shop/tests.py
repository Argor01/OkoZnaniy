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
from apps.orders.models import Order, Transaction, TransactionType
from apps.shop.models import Purchase, ReadyWork, ReadyWorkFile

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
        self.assertFalse(Transaction.objects.exists())

    def test_purchase_holds_funds_and_copies_file(self):
        self.buyer.balance = Decimal("1500.00")
        self.buyer.save(update_fields=["balance"])

        rfile = SimpleUploadedFile("work.docx", b"file-content", content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        ReadyWorkFile.objects.create(
            work=self.work,
            name="work.docx",
            file=rfile,
            file_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            file_size=12,
        )

        response = self.api_client.post(f"/api/shop/works/{self.work.id}/purchase/")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        body = response.json()
        purchase = Purchase.objects.get(pk=body["id"])
        self.buyer.refresh_from_db()
        self.author.refresh_from_db()

        self.assertEqual(purchase.status, Purchase.Status.PAID)
        self.assertIsNotNone(purchase.paid_at)
        self.assertIsNotNone(purchase.hold_until)
        self.assertTrue(purchase.hold_until > timezone.now())

        self.assertEqual(self.buyer.balance, Decimal("0.00"))
        self.assertEqual(self.buyer.frozen_balance, Decimal("0.00"))
        self.assertEqual(self.author.balance, Decimal("1200.00"))
        self.assertEqual(self.author.frozen_balance, Decimal("1200.00"))

        self.assertTrue(bool(purchase.delivered_file))
        self.assertEqual(purchase.delivered_file_name, "work.docx")
        self.assertEqual(purchase.delivered_file_size, 12)

        self.assertFalse(Order.objects.filter(client=self.buyer, expert=self.author).exists())

        self.assertEqual(body["status"], "paid")
        self.assertTrue(body["delivered_file_available"])

    def test_purchase_copies_first_file(self):
        self.buyer.balance = Decimal("1500.00")
        self.buyer.save(update_fields=["balance"])

        rfile1 = SimpleUploadedFile("first.docx", b"first", content_type="application/octet-stream")
        rfile2 = SimpleUploadedFile("second.pdf", b"second", content_type="application/pdf")
        ReadyWorkFile.objects.create(work=self.work, name="second.pdf", file=rfile2, file_type="application/pdf", file_size=6)
        ReadyWorkFile.objects.create(work=self.work, name="first.docx", file=rfile1, file_type="application/octet-stream", file_size=5)

        response = self.api_client.post(f"/api/shop/works/{self.work.id}/purchase/")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        purchase = Purchase.objects.get(pk=response.json()["id"])
        self.assertEqual(purchase.delivered_file_name, "first.docx")

    def test_purchase_no_order_created(self):
        self.buyer.balance = Decimal("1500.00")
        self.buyer.save(update_fields=["balance"])

        response = self.api_client.post(f"/api/shop/works/{self.work.id}/purchase/")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        purchase = Purchase.objects.get(pk=response.json()["id"])
        self.assertFalse(Order.objects.filter(client=self.buyer, expert=self.author).exists())

    def test_cannot_purchase_own_work(self):
        self.api_client.force_authenticate(user=self.author)
        self.author.balance = Decimal("1500.00")
        self.author.save(update_fields=["balance"])

        response = self.api_client.post(f"/api/shop/works/{self.work.id}/purchase/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


@override_settings(SECURE_SSL_REDIRECT=False)
class ReadyWorkDisputeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.subject = Subject.objects.create(name="Dispute subject")
        cls.work_type = WorkType.objects.create(name="Dispute work type")
        cls.author = User.objects.create_user(
            username="dispute_author",
            email="dispute_author@example.com",
            password="pwd",
            role="expert",
        )
        cls.buyer = User.objects.create_user(
            username="dispute_buyer",
            email="dispute_buyer@example.com",
            password="pwd",
            role="client",
        )

    def setUp(self):
        self.api_client = APIClient()
        self.api_client.force_authenticate(user=self.buyer)
        self.work = ReadyWork.objects.create(
            title="Dispute work",
            description="Description",
            price=Decimal("500.00"),
            subject=self.subject,
            work_type=self.work_type,
            author=self.author,
            is_active=True,
            moderation_status=ReadyWork.ModerationStatus.APPROVED,
        )

    def _purchase(self):
        self.buyer.balance = Decimal("625.00")
        self.buyer.save(update_fields=["balance"])
        response = self.api_client.post(f"/api/shop/works/{self.work.id}/purchase/")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        return Purchase.objects.get(pk=response.json()["id"])

    def test_dispute_within_3_days_refunds(self):
        purchase = self._purchase()

        response = self.api_client.post(f"/api/shop/purchases/{purchase.id}/dispute/")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)

        purchase.refresh_from_db()
        self.buyer.refresh_from_db()
        self.assertEqual(purchase.status, Purchase.Status.DISPUTED)
        self.assertFalse(bool(purchase.delivered_file))
        self.assertEqual(self.buyer.balance, Decimal("0.00"))
        self.assertEqual(self.buyer.frozen_balance, Decimal("0.00"))
        self.author.refresh_from_db()
        self.assertEqual(self.author.frozen_balance, Decimal("500.00"))

        self.assertEqual(
            set(Transaction.objects.filter(user=self.buyer).values_list("type", flat=True)),
            {TransactionType.HOLD},
        )

    def test_dispute_after_3_days_is_rejected(self):
        purchase = self._purchase()
        purchase.hold_until = timezone.now() - timedelta(hours=1)
        purchase.save(update_fields=["hold_until"])

        response = self.api_client.post(f"/api/shop/purchases/{purchase.id}/dispute/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        purchase.refresh_from_db()
        self.assertEqual(purchase.status, Purchase.Status.PAID)

    def test_dispute_only_for_paid_purchases(self):
        purchase = self._purchase()
        purchase.status = Purchase.Status.COMPLETED
        purchase.save(update_fields=["status"])

        response = self.api_client.post(f"/api/shop/purchases/{purchase.id}/dispute/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


@override_settings(SECURE_SSL_REDIRECT=False)
class ReadyWorkAutoReleaseTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.subject = Subject.objects.create(name="Release subject")
        cls.work_type = WorkType.objects.create(name="Release work type")
        cls.author = User.objects.create_user(
            username="release_author",
            email="release_author@example.com",
            password="pwd",
            role="expert",
        )
        cls.buyer = User.objects.create_user(
            username="release_buyer",
            email="release_buyer@example.com",
            password="pwd",
            role="client",
        )

    def setUp(self):
        self.work = ReadyWork.objects.create(
            title="Release work",
            description="Description",
            price=Decimal("500.00"),
            subject=self.subject,
            work_type=self.work_type,
            author=self.author,
            is_active=True,
            moderation_status=ReadyWork.ModerationStatus.APPROVED,
        )

    def _purchase(self):
        self.buyer.balance = Decimal("625.00")
        self.buyer.save(update_fields=["balance"])
        client = APIClient()
        client.force_authenticate(user=self.buyer)
        response = client.post(f"/api/shop/works/{self.work.id}/purchase/")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        return Purchase.objects.get(pk=response.json()["id"])

    def test_auto_release_after_3_days(self):
        from apps.shop.tasks import release_ready_work_holds

        purchase = self._purchase()
        purchase.hold_until = timezone.now() - timedelta(minutes=1)
        purchase.save(update_fields=["hold_until"])

        result = release_ready_work_holds()
        self.assertIn("Автовыплачено: 1", result)

        purchase.refresh_from_db()
        self.buyer.refresh_from_db()
        self.author.refresh_from_db()

        self.assertEqual(purchase.status, Purchase.Status.COMPLETED)
        self.assertEqual(self.buyer.frozen_balance, Decimal("0.00"))
        self.assertEqual(self.author.balance, Decimal("500.00"))

    def test_no_release_for_active_hold(self):
        from apps.shop.tasks import release_ready_work_holds

        self._purchase()
        result = release_ready_work_holds()
        self.assertIn("Автовыплачено: 0", result)
