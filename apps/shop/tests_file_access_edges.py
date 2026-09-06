"""Пограничные случаи доступа к файлам готовых работ.

Отдельно проверяется подстановка чужого id файла: эндпоинт скачивания не
должен отдавать файл другой работы, даже если запрашивающий имеет право на
свою.
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


@override_settings(SECURE_SSL_REDIRECT=False)
class ReadyWorkFileAccessEdgeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.subject = Subject.objects.create(name='Файлы-границы — предмет')
        cls.work_type = WorkType.objects.create(name='Файлы-границы — тип')
        cls.author_a = User.objects.create_user(
            username='edge_author_a', email='edge_author_a@example.com',
            password='pwd', role='expert',
        )
        cls.author_b = User.objects.create_user(
            username='edge_author_b', email='edge_author_b@example.com',
            password='pwd', role='expert',
        )
        cls.buyer = User.objects.create_user(
            username='edge_shop_buyer', email='edge_shop_buyer@example.com',
            password='pwd', role='client',
        )

    def _work(self, author, approved=True, title='Работа'):
        return ReadyWork.objects.create(
            title=title, description='Описание', price=Decimal('500.00'),
            subject=self.subject, work_type=self.work_type, author=author,
            moderation_status=(
                ReadyWork.ModerationStatus.APPROVED if approved
                else ReadyWork.ModerationStatus.PENDING
            ),
            is_active=approved,
        )

    def _file(self, work, payload=b'content'):
        return ReadyWorkFile.objects.create(
            work=work, name='w.txt', file=SimpleUploadedFile('w.txt', payload),
            file_type='text/plain', file_size=len(payload),
        )

    def _download(self, user, work_id, file_id):
        api = APIClient()
        api.force_authenticate(user=user)
        return api.get(f'/api/shop/works/{work_id}/files/{file_id}/download/')

    def test_file_of_another_work_is_not_served(self):
        """Подстановка чужого file_id не должна отдавать файл другой работы."""
        work_a = self._work(self.author_a, title='Работа A')
        work_b = self._work(self.author_b, title='Работа B')
        file_b = self._file(work_b, b'secret of B')

        response = self._download(self.author_a, work_a.id, file_b.id)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_author_can_download_unmoderated_own_work(self):
        """Работа на модерации скрыта с витрины, но автор к файлу доступ имеет."""
        work = self._work(self.author_a, approved=False, title='На модерации')
        work_file = self._file(work, b'pending content')

        response = self._download(self.author_a, work.id, work_file.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(b''.join(response.streaming_content), b'pending content')

    def test_stranger_cannot_download_unmoderated_work(self):
        work = self._work(self.author_a, approved=False, title='На модерации 2')
        work_file = self._file(work)
        response = self._download(self.buyer, work.id, work_file.id)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_missing_file_returns_404(self):
        work = self._work(self.author_a, title='Без файла')
        response = self._download(self.author_a, work.id, 999999)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_buyer_of_one_work_cannot_download_another(self):
        """Покупка одной работы не открывает доступ к другой."""
        bought = self._work(self.author_a, title='Купленная')
        self._file(bought)
        other = self._work(self.author_b, title='Чужая')
        other_file = self._file(other, b'not yours')

        Purchase.objects.create(
            work=bought, buyer=self.buyer, price_paid=Decimal('500.00'),
            status=Purchase.Status.PAID,
            hold_until=timezone.now() + timedelta(days=10),
        )

        response = self._download(self.buyer, other.id, other_file.id)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
