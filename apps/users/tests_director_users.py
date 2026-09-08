"""Доступ директора к списку пользователей и смене сервисного сбора.

Директор должен видеть клиентов и экспертов (admin_all_users) и уметь
менять индивидуальный сервисный сбор (admin_update_partner), как админ.
Обычный клиент и эксперт — нет.
"""
from decimal import Decimal

from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.users.models import User


class DirectorUsersAccessTests(APITestCase):
    def setUp(self):
        self.director = User.objects.create_user(
            username='director_users_test', email='d_ut@example.com',
            password='pwd', role='director',
        )
        self.admin = User.objects.create_user(
            username='admin_users_test', email='a_ut@example.com',
            password='pwd', role='admin',
        )
        self.client_user = User.objects.create_user(
            username='client_users_test', email='c_ut@example.com',
            password='pwd', role='client',
        )
        self.expert = User.objects.create_user(
            username='expert_users_test', email='e_ut@example.com',
            password='pwd', role='expert',
        )

    def test_director_lists_users(self):
        api = APIClient()
        api.force_authenticate(self.director)
        response = api.get('/api/users/admin_all_users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [u['id'] for u in response.data]
        self.assertIn(self.client_user.id, ids)
        self.assertIn(self.expert.id, ids)

    def test_director_filters_by_role_and_search(self):
        api = APIClient()
        api.force_authenticate(self.director)
        response = api.get('/api/users/admin_all_users/', {'role': 'expert'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(all(u['role'] == 'expert' for u in response.data))

    def test_users_list_exposes_service_fee(self):
        self.client_user.service_fee_percent = Decimal('0')
        self.client_user.save(update_fields=['service_fee_percent'])
        api = APIClient()
        api.force_authenticate(self.director)
        response = api.get('/api/users/admin_all_users/')
        row = next(u for u in response.data if u['id'] == self.client_user.id)
        self.assertEqual(Decimal(str(row['service_fee_percent'])), Decimal('0'))

    def test_director_sets_service_fee_by_id(self):
        api = APIClient()
        api.force_authenticate(self.director)
        response = api.patch(
            f'/api/users/{self.expert.id}/admin_update_partner/',
            {'service_fee_percent': '15'}, format='json',
        )
        self.assertIn(response.status_code, (status.HTTP_200_OK, status.HTTP_202_ACCEPTED))
        self.expert.refresh_from_db()
        self.assertEqual(self.expert.service_fee_percent, Decimal('15'))

    def test_director_clears_service_fee_to_platform_default(self):
        self.expert.service_fee_percent = Decimal('10')
        self.expert.save(update_fields=['service_fee_percent'])
        api = APIClient()
        api.force_authenticate(self.director)
        response = api.patch(
            f'/api/users/{self.expert.username}/admin_update_partner/',
            {'service_fee_percent': None}, format='json',
        )
        self.assertIn(response.status_code, (status.HTTP_200_OK, status.HTTP_202_ACCEPTED))
        self.expert.refresh_from_db()
        self.assertIsNone(self.expert.service_fee_percent)

    def test_regular_users_are_forbidden(self):
        for actor in (self.client_user, self.expert):
            api = APIClient()
            api.force_authenticate(actor)
            response = api.get('/api/users/admin_all_users/')
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
            response = api.patch(
                f'/api/users/{self.client_user.id}/admin_update_partner/',
                {'service_fee_percent': '0'}, format='json',
            )
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_still_works(self):
        api = APIClient()
        api.force_authenticate(self.admin)
        response = api.get('/api/users/admin_all_users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response = api.patch(
            f'/api/users/{self.client_user.id}/admin_update_partner/',
            {'service_fee_percent': '0'}, format='json',
        )
        self.assertIn(response.status_code, (status.HTTP_200_OK, status.HTTP_202_ACCEPTED))
