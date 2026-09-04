"""Регрессия: файл готовой работы нельзя получить без оплаты.

Баг: ``ReadyWorkSerializer`` отдавал прямые ссылки на ``/media/`` любому
авторизованному пользователю, а сами файлы лежали в публичной директории —
платную работу можно было скачать бесплатно.

Контракт, который фиксируют тесты:

* посторонний видит только метаданные файла (имя, тип, размер) и НЕ получает
  ссылку на скачивание;
* автор работы, администратор и покупатель получают ``download_url``;
* эндпоинт скачивания отдаёт файл только этим трём ролям, остальным — 403.
"""

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.catalog.models import Subject, WorkType
from apps.shop.models import Purchase, ReadyWork, ReadyWorkFile

User = get_user_model()

FILE_CONTENT = b"secret paid content"


@override_settings(SECURE_SSL_REDIRECT=False)
class ReadyWorkFileAccessTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.subject = Subject.objects.create(name="Доступ — предмет")
        cls.work_type = WorkType.objects.create(name="Доступ — тип работы")
        cls.author = User.objects.create_user(
            username="file_access_author", email="file_author@example.com",
            password="pwd", role="expert",
        )
        cls.buyer = User.objects.create_user(
            username="file_access_buyer", email="file_buyer@example.com",
            password="pwd", role="client",
        )
        cls.stranger = User.objects.create_user(
            username="file_access_stranger", email="file_stranger@example.com",
            password="pwd", role="client",
        )
        cls.staff = User.objects.create_user(
            username="file_access_staff", email="file_staff@example.com",
            password="pwd", role="client", is_staff=True,
        )
        cls.work = ReadyWork.objects.create(
            title="Платная работа",
            description="Описание платной работы",
            price=Decimal("1000.00"),
            subject=cls.subject,
            work_type=cls.work_type,
            author=cls.author,
            moderation_status=ReadyWork.ModerationStatus.APPROVED,
            is_active=True,
        )
        cls.work_file = ReadyWorkFile.objects.create(
            work=cls.work,
            name="work.txt",
            file=SimpleUploadedFile("work.txt", FILE_CONTENT),
            file_type="text/plain",
            file_size=len(FILE_CONTENT),
        )
        Purchase.objects.create(
            work=cls.work,
            buyer=cls.buyer,
            price_paid=Decimal("1000.00"),
            status=Purchase.Status.PAID,
            hold_until=timezone.now() + timedelta(days=10),
        )

    def _files_payload(self, user):
        api = APIClient()
        api.force_authenticate(user=user)
        response = api.get(f"/api/shop/works/{self.work.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        files = response.json()["files"]
        self.assertEqual(len(files), 1)
        return files[0]

    def _download(self, user):
        api = APIClient()
        api.force_authenticate(user=user)
        return api.get(
            f"/api/shop/works/{self.work.id}/files/{self.work_file.id}/download/"
        )

    # --- что видно в карточке работы ---

    def test_stranger_gets_metadata_without_any_link(self):
        payload = self._files_payload(self.stranger)
        self.assertNotIn("download_url", payload)
        self.assertNotIn("file", payload)
        # витрина остаётся информативной
        self.assertEqual(payload["name"], "work.txt")
        self.assertEqual(payload["file_size"], len(FILE_CONTENT))

    def test_buyer_and_author_get_download_url(self):
        for user in (self.buyer, self.author, self.staff):
            with self.subTest(user=user.username):
                payload = self._files_payload(user)
                self.assertIn("download_url", payload)
                self.assertNotIn("file", payload)

    # --- сам эндпоинт скачивания ---

    def test_stranger_cannot_download(self):
        self.assertEqual(self._download(self.stranger).status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_download(self):
        response = APIClient().get(
            f"/api/shop/works/{self.work.id}/files/{self.work_file.id}/download/"
        )
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_buyer_author_and_staff_can_download(self):
        for user in (self.buyer, self.author, self.staff):
            with self.subTest(user=user.username):
                response = self._download(user)
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                body = b"".join(response.streaming_content)
                self.assertEqual(body, FILE_CONTENT)

    def test_refunded_purchase_loses_access(self):
        Purchase.objects.filter(work=self.work, buyer=self.buyer).update(
            status=Purchase.Status.REFUNDED
        )
        self.assertEqual(self._download(self.buyer).status_code, status.HTTP_403_FORBIDDEN)
