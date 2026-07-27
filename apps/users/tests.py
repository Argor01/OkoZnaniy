from datetime import timedelta
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from decimal import Decimal

from apps.orders.models import Order
from apps.users.models import PartnerEarning

User = get_user_model()

class AuthenticationTests(APITestCase):
    def setUp(self):
        self.user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpass123',
            'password2': 'testpass123',
            'first_name': 'Test',
            'last_name': 'User',
            'role': 'client'
        }
        self.login_data = {
            'username': 'testuser',
            'password': 'testpass123'
        }

    def test_user_registration(self):
        """Тест регистрации пользователя"""
        url = reverse('user-list')
        response = self.client.post(url, self.user_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(User.objects.get().username, 'testuser')

    def test_user_login(self):
        """Тест входа пользователя"""
        # Создаем пользователя
        User.objects.create_user(
            username=self.user_data['username'],
            email=self.user_data['email'],
            password=self.user_data['password']
        )
        
        url = reverse('token_obtain_pair')
        response = self.client.post(url, self.login_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn('access', response.data)
        self.assertNotIn('refresh', response.data)
        self.assertIn('user', response.data)
        self.assertIn('oko_access', response.cookies)
        self.assertIn('oko_refresh', response.cookies)
        self.assertTrue(response.cookies['oko_access']['httponly'])

    def test_token_refresh(self):
        """Тест обновления токена"""
        # Создаем пользователя и получаем токены
        User.objects.create_user(
            username=self.user_data['username'],
            email=self.user_data['email'],
            password=self.user_data['password']
        )
        
        response = self.client.post(reverse('token_obtain_pair'), self.login_data)
        self.assertIn('oko_refresh', response.cookies)

        url = reverse('token_refresh')
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn('access', response.data)
        self.assertIn('oko_access', response.cookies)

    def test_password_reset_request(self):
        """Тест запроса на сброс пароля"""
        # Создаем пользователя
        User.objects.create_user(
            username=self.user_data['username'],
            email=self.user_data['email'],
            password=self.user_data['password']
        )
        
        url = reverse('user-reset-password')
        response = self.client.post(url, {'email': self.user_data['email']})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_invalid_login(self):
        """Тест входа с неверными данными"""
        url = reverse('token_obtain_pair')
        response = self.client.post(url, {
            'username': 'wronguser',
            'password': 'wrongpass'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_me_endpoint(self):
        """Тест эндпоинта профиля пользователя"""
        # Создаем пользователя
        user = User.objects.create_user(
            username=self.user_data['username'],
            email=self.user_data['email'],
            password=self.user_data['password']
        )
        
        # Login stores HttpOnly cookies in the test client.
        response = self.client.post(reverse('token_obtain_pair'), self.login_data)
        self.assertIn('oko_access', response.cookies)

        # Test the endpoint using cookie authentication (no JS-visible JWT).
        url = reverse('user-me')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], self.user_data['username'])


class PartnerReferralFlowTests(APITestCase):
    def setUp(self):
        self.partner = User.objects.create_user(
            username='partner_flow',
            email='partner_flow@example.com',
            password='testpass123',
            role='partner',
            partner_commission_rate=Decimal('10.00'),
        )
        self.admin = User.objects.create_user(
            username='admin_flow',
            email='admin_flow@example.com',
            password='testpass123',
            role='admin',
        )

    def test_referral_registration_creates_bonus_and_dashboard_stats(self):
        response = self.client.post(reverse('user-list'), {
            'username': 'referred_client',
            'email': 'referred_client@example.com',
            'password': 'testpass123',
            'password2': 'testpass123',
            'role': 'client',
            'referral_code': self.partner.referral_code,
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        referred = User.objects.get(username='referred_client')
        self.assertEqual(referred.partner_id, self.partner.id)

        self.partner.refresh_from_db()
        self.assertEqual(self.partner.total_referrals, 1)
        self.assertEqual(self.partner.total_earnings, Decimal('50.00'))
        self.assertEqual(self.partner.balance, Decimal('0.00'))
        self.assertEqual(self.partner.pending_balance, Decimal('50.00'))
        self.assertTrue(
            PartnerEarning.objects.filter(
                partner=self.partner,
                referral=referred,
                earning_type='registration',
                amount=Decimal('50.00'),
            ).exists()
        )

        self.client.force_authenticate(user=self.partner)
        dashboard = self.client.get(reverse('user-partner-dashboard'))
        self.assertEqual(dashboard.status_code, status.HTTP_200_OK)
        self.assertEqual(dashboard.data['partner_info']['total_referrals'], 1)
        self.assertEqual(Decimal(str(dashboard.data['partner_info']['total_earnings'])), Decimal('50.00'))
        self.assertEqual(dashboard.data['referrals'][0]['username'], 'referred_client')

    def test_completed_referred_client_order_creates_order_earning_once(self):
        client = User.objects.create_user(
            username='referred_order_client',
            email='referred_order_client@example.com',
            password='testpass123',
            role='client',
            partner=self.partner,
        )
        PartnerEarning.objects.filter(partner=self.partner, referral=client, earning_type='registration').delete()

        order = Order.objects.create(
            client=client,
            title='Partner referral order',
            description='Order for partner earning',
            budget=Decimal('1200.00'),
            deadline=timezone.now() + timedelta(days=30),
            status='new',
        )
        order.status = 'completed'
        order.save()
        order.save()

        earnings = PartnerEarning.objects.filter(
            partner=self.partner,
            referral=client,
            order=order,
            earning_type='order',
        )
        self.assertEqual(earnings.count(), 1)
        self.assertEqual(earnings.first().amount, Decimal('120.0000'))

        self.partner.refresh_from_db()
        self.assertEqual(self.partner.active_referrals, 1)
        self.assertEqual(self.partner.total_earnings, Decimal('120.0000'))
        self.assertEqual(self.partner.balance, Decimal('0.00'))
        self.assertEqual(self.partner.pending_balance, Decimal('170.00'))

    def test_referred_expert_orders_count_as_active_referral(self):
        client = User.objects.create_user(
            username='client_for_expert_referral',
            email='client_for_expert_referral@example.com',
            password='testpass123',
            role='client',
        )
        expert = User.objects.create_user(
            username='referred_expert',
            email='referred_expert@example.com',
            password='testpass123',
            role='expert',
            partner=self.partner,
        )
        Order.objects.create(
            client=client,
            expert=expert,
            title='Expert referral order',
            description='Order assigned to referred expert',
            budget=Decimal('900.00'),
            deadline=timezone.now() + timedelta(days=30),
            status='in_progress',
        )

        self.client.force_authenticate(user=self.partner)
        dashboard = self.client.get(reverse('user-partner-dashboard'))

        self.assertEqual(dashboard.status_code, status.HTTP_200_OK)
        self.assertEqual(dashboard.data['partner_info']['active_referrals'], 1)
        expert_row = next(ref for ref in dashboard.data['referrals'] if ref['username'] == 'referred_expert')
        self.assertEqual(expert_row['orders_count'], 1)

    def test_partner_and_admin_endpoints_are_role_scoped(self):
        self.client.force_authenticate(user=self.partner)
        partner_dashboard = self.client.get(reverse('user-partner-dashboard'))
        partner_map = self.client.get(reverse('partners_list'))
        admin_partners_for_partner = self.client.get(reverse('admin_partners'))

        self.assertEqual(partner_dashboard.status_code, status.HTTP_200_OK)
        self.assertEqual(partner_map.status_code, status.HTTP_200_OK)
        self.assertEqual(admin_partners_for_partner.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.admin)
        admin_partners = self.client.get(reverse('admin_partners'))
        admin_earnings = self.client.get(reverse('admin_earnings'))

        self.assertEqual(admin_partners.status_code, status.HTTP_200_OK)
        self.assertEqual(admin_earnings.status_code, status.HTTP_200_OK)
