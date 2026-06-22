from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


class UserModelBehaviorTests(TestCase):
    def test_display_username_returns_custom_username_when_flag_is_set(self):
        user = User.objects.create_user(
            username='  Fancy Name  ',
            email='fancy@example.com',
            password='testpass123',
            has_custom_username=True,
        )

        self.assertEqual(user.display_username, 'Fancy Name')

    def test_display_username_generates_stable_alias_without_custom_username(self):
        user = User.objects.create_user(
            username='plain_user',
            email='plain@example.com',
            password='testpass123',
            has_custom_username=False,
        )

        first = user.display_username
        second = user.display_username

        self.assertEqual(first, second)
        self.assertRegex(first, r'^user\d{4}$')

    def test_partner_save_generates_referral_code(self):
        partner = User.objects.create_user(
            username='partner_user_model',
            email='partner_user_model@example.com',
            password='testpass123',
            role='partner',
        )

        self.assertTrue(partner.referral_code)
        self.assertEqual(len(partner.referral_code), 8)

    def test_unban_for_contacts_returns_false_when_user_not_banned(self):
        user = User.objects.create_user(username='not_banned', password='testpass123')

        self.assertFalse(user.unban_for_contacts_if_expired())

    def test_unban_for_contacts_returns_false_when_ban_has_not_expired(self):
        user = User.objects.create_user(
            username='still_banned',
            password='testpass123',
            is_banned_for_contacts=True,
            contact_ban_until=timezone.now() + timedelta(days=1),
        )

        self.assertFalse(user.unban_for_contacts_if_expired())

    def test_unban_for_contacts_clears_fields_after_expiration(self):
        user = User.objects.create_user(
            username='expired_ban',
            password='testpass123',
            is_banned_for_contacts=True,
            contact_ban_reason='temporary',
            contact_ban_date=timezone.now() - timedelta(days=2),
            contact_ban_until=timezone.now() - timedelta(hours=1),
        )

        result = user.unban_for_contacts_if_expired()
        user.refresh_from_db()

        self.assertTrue(result)
        self.assertFalse(user.is_banned_for_contacts)
        self.assertIsNone(user.contact_ban_reason)
        self.assertIsNone(user.contact_ban_until)

    def test_unblock_if_expired_returns_false_when_block_is_still_active(self):
        user = User.objects.create_user(
            username='future_block',
            password='testpass123',
            is_active=False,
            unblock_date=timezone.now() + timedelta(days=1),
        )

        self.assertFalse(user.unblock_if_expired())

    def test_unblock_if_expired_restores_user_access(self):
        blocker = User.objects.create_user(username='blocker', password='testpass123', role='admin')
        user = User.objects.create_user(
            username='expired_block',
            password='testpass123',
            is_active=False,
            blocked_at=timezone.now() - timedelta(days=2),
            block_reason='temporary block',
            unblock_date=timezone.now() - timedelta(minutes=5),
            blocked_by=blocker,
        )

        result = user.unblock_if_expired()
        user.refresh_from_db()

        self.assertTrue(result)
        self.assertTrue(user.is_active)
        self.assertEqual(user.block_reason, '')
        self.assertIsNone(user.unblock_date)
        self.assertIsNone(user.blocked_by)


class UserApiBehaviorTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username='user_api_main',
            email='user_api_main@example.com',
            password='testpass123',
            role='client',
        )
        cls.other = User.objects.create_user(
            username='user_api_other',
            email='user_api_other@example.com',
            password='testpass123',
            role='client',
            vk_id=123456,
        )
        cls.director = User.objects.create_user(
            username='user_api_director',
            email='user_api_director@example.com',
            password='testpass123',
            role='director',
        )

    def setUp(self):
        self.api_client = APIClient()

    def test_me_requires_authentication(self):
        response = self.api_client.get('/api/users/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_vk_link_and_status(self):
        self.api_client.force_authenticate(user=self.user)

        link_response = self.api_client.post('/api/users/vk/link/', {'vk_id': 777888}, format='json')
        status_response = self.api_client.get('/api/users/vk/status/')

        self.assertEqual(link_response.status_code, status.HTTP_200_OK)
        self.assertEqual(status_response.status_code, status.HTTP_200_OK)
        self.assertTrue(status_response.data['linked'])
        self.assertEqual(status_response.data['vk_id'], 777888)

    def test_vk_link_rejects_conflict(self):
        self.api_client.force_authenticate(user=self.user)

        response = self.api_client.post('/api/users/vk/link/', {'vk_id': 123456}, format='json')

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_vk_unlink_clears_id_and_notifications(self):
        self.user.vk_id = 888999
        self.user.vk_notifications_enabled = True
        self.user.save(update_fields=['vk_id', 'vk_notifications_enabled'])
        self.api_client.force_authenticate(user=self.user)

        response = self.api_client.delete('/api/users/vk/unlink/')
        self.user.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(self.user.vk_id)
        self.assertFalse(self.user.vk_notifications_enabled)

    def test_vk_notifications_settings_requires_enabled_param(self):
        self.api_client.force_authenticate(user=self.user)

        response = self.api_client.patch('/api/users/notifications/vk/', {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_vk_notifications_settings_updates_flag(self):
        self.api_client.force_authenticate(user=self.user)

        response = self.api_client.patch('/api/users/notifications/vk/', {'enabled': False}, format='json')
        self.user.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(self.user.vk_notifications_enabled)

    def test_submit_improvement_suggestion_creates_record(self):
        self.api_client.force_authenticate(user=self.user)

        response = self.api_client.post(
            '/api/users/submit_improvement_suggestion/',
            {'area': 'ui_ux', 'comment': 'Improve filters on mobile'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['comment'], 'Improve filters on mobile')

    def test_improvement_suggestions_are_forbidden_for_non_director(self):
        self.api_client.force_authenticate(user=self.user)

        response = self.api_client.get('/api/users/improvement_suggestions/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_improvement_suggestions_are_available_for_director(self):
        self.api_client.force_authenticate(user=self.user)
        self.api_client.post(
            '/api/users/submit_improvement_suggestion/',
            {'area': 'functionality', 'comment': 'Need more analytics'},
            format='json',
        )
        self.api_client.force_authenticate(user=self.director)

        response = self.api_client.get('/api/users/improvement_suggestions/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
