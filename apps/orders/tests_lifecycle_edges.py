"""Пограничные случаи жизненного цикла заказа.

Проверяется не «счастливый путь», а то, что заказ нельзя сломать повторными и
несвоевременными действиями. Главный инвариант: сколько бы раз клиент ни нажал
«Принять», эксперту заплатят ровно один раз.
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
from apps.orders.models import Order, OrderFile
from apps.wallet.services import WalletService

User = get_user_model()


@override_settings(SECURE_SSL_REDIRECT=False)
class OrderLifecycleEdgeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.subject = Subject.objects.create(name='Границы — предмет')
        cls.work_type = WorkType.objects.create(name='Границы — тип работы')

    def setUp(self):
        self.client_user = User.objects.create_user(
            username='edge_client', email='edge_client@example.com',
            password='pwd', role='client',
        )
        self.expert = User.objects.create_user(
            username='edge_expert', email='edge_expert@example.com',
            password='pwd', role='expert',
        )
        self.stranger = User.objects.create_user(
            username='edge_stranger', email='edge_stranger@example.com',
            password='pwd', role='client',
        )
        self.api = APIClient()

    def _order(self, status_value='review'):
        return Order.objects.create(
            client=self.client_user, expert=self.expert,
            subject=self.subject, work_type=self.work_type,
            title='Заказ для границ', description='Описание',
            deadline=timezone.now() + timedelta(days=3),
            budget=Decimal('1000.00'), final_price=Decimal('1000.00'),
            status=status_value,
        )

    def _delivered(self, order, downloaded=True, file_type='solution'):
        return OrderFile.objects.create(
            order=order, file=SimpleUploadedFile('solution.txt', b'solution'),
            file_type=file_type, uploaded_by=self.expert,
            client_downloaded_at=timezone.now() if downloaded else None,
        )

    def _fund(self, order):
        WalletService.topup(self.client_user, Decimal('1250.00'))
        WalletService.hold(self.client_user, Decimal('1250.00'), order=order)

    # --- денежные инварианты ---

    def test_approve_twice_pays_expert_only_once(self):
        """Повторное «Принять» не должно платить эксперту второй раз."""
        order = self._order('review')
        self._fund(order)
        self._delivered(order)
        self.api.force_authenticate(self.client_user)

        first = self.api.post(f'/api/orders/orders/{order.id}/approve/')
        self.assertEqual(first.status_code, status.HTTP_200_OK, first.content)
        self.expert.refresh_from_db()
        paid_once = self.expert.balance
        self.assertEqual(paid_once, Decimal('1000.00'))

        second = self.api.post(f'/api/orders/orders/{order.id}/approve/')
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.expert.refresh_from_db()
        self.assertEqual(self.expert.balance, paid_once, 'эксперту заплатили дважды')

    def test_full_revision_loop_pays_expert_once(self):
        """Доработка и повторная сдача не должны задваивать выплату."""
        order = self._order('review')
        self._fund(order)
        self._delivered(order)

        self.api.force_authenticate(self.client_user)
        revision = self.api.post(
            f'/api/orders/orders/{order.id}/revision/',
            {'comment': 'переделайте'}, format='json',
        )
        self.assertEqual(revision.status_code, status.HTTP_200_OK, revision.content)
        order.refresh_from_db()
        self.assertEqual(order.status, 'revision')

        self.api.force_authenticate(self.expert)
        submit = self.api.post(f'/api/orders/orders/{order.id}/submit/')
        self.assertEqual(submit.status_code, status.HTTP_200_OK, submit.content)
        order.refresh_from_db()
        self.assertEqual(order.status, 'review')

        self._delivered(order, file_type='revision')
        self.api.force_authenticate(self.client_user)
        approve = self.api.post(f'/api/orders/orders/{order.id}/approve/')
        self.assertEqual(approve.status_code, status.HTTP_200_OK, approve.content)

        self.expert.refresh_from_db()
        self.assertEqual(self.expert.balance, Decimal('1000.00'))

    # --- недопустимые переходы ---

    def test_cannot_request_revision_after_approve(self):
        order = self._order('review')
        self._fund(order)
        self._delivered(order)
        self.api.force_authenticate(self.client_user)

        self.api.post(f'/api/orders/orders/{order.id}/approve/')
        response = self.api.post(
            f'/api/orders/orders/{order.id}/revision/',
            {'comment': 'передумал'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        order.refresh_from_db()
        self.assertEqual(order.status, 'completed')

    def test_cannot_approve_without_delivered_files(self):
        order = self._order('review')
        self._fund(order)
        self.api.force_authenticate(self.client_user)
        response = self.api.post(f'/api/orders/orders/{order.id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        order.refresh_from_db()
        self.assertEqual(order.status, 'review')

    def test_expert_cannot_submit_work_from_new_status(self):
        order = self._order('new')
        self.api.force_authenticate(self.expert)
        response = self.api.post(f'/api/orders/orders/{order.id}/submit/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_revision_only_from_review_status(self):
        order = self._order('in_progress')
        self.api.force_authenticate(self.client_user)
        response = self.api.post(
            f'/api/orders/orders/{order.id}/revision/',
            {'comment': 'нет'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- права ---

    def test_stranger_cannot_approve_someone_elses_order(self):
        order = self._order('review')
        self._fund(order)
        self._delivered(order)
        self.api.force_authenticate(self.stranger)
        response = self.api.post(f'/api/orders/orders/{order.id}/approve/')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, 'review')
        self.expert.refresh_from_db()
        self.assertEqual(self.expert.balance, Decimal('0.00'))

    def test_expert_cannot_approve_own_work(self):
        order = self._order('review')
        self._fund(order)
        self._delivered(order)
        self.api.force_authenticate(self.expert)
        response = self.api.post(f'/api/orders/orders/{order.id}/approve/')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
        self.expert.refresh_from_db()
        self.assertEqual(self.expert.balance, Decimal('0.00'))
