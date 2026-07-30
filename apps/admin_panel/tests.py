from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.admin_panel.models import Claim, SupportRequest

User = get_user_model()


class AdminPanelPermissionTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.client_user = User.objects.create_user(
            username='admin_panel_client',
            email='admin_panel_client@example.com',
            password='testpass123',
            role='client',
        )
        cls.other_client = User.objects.create_user(
            username='admin_panel_other_client',
            email='admin_panel_other_client@example.com',
            password='testpass123',
            role='client',
        )
        cls.director = User.objects.create_user(
            username='admin_panel_director',
            email='admin_panel_director@example.com',
            password='testpass123',
            role='director',
        )
        cls.admin = User.objects.create_user(
            username='admin_panel_admin',
            email='admin_panel_admin@example.com',
            password='testpass123',
            role='admin',
        )

        cls.client_claim = Claim.objects.create(
            user=cls.client_user,
            claim_type='other',
            subject='Client claim',
            description='Client claim description',
            reason='other',
        )
        cls.other_claim = Claim.objects.create(
            user=cls.other_client,
            claim_type='other',
            subject='Other claim',
            description='Other claim description',
            reason='other',
        )
        cls.support_request = SupportRequest.objects.create(
            user=cls.client_user,
            subject='Support question',
            description='Support description',
        )

    def setUp(self):
        self.api_client = APIClient()

    @staticmethod
    def get_response_items(response):
        if isinstance(response.data, dict) and 'results' in response.data:
            return response.data['results']
        return response.data

    def test_director_can_list_all_claims(self):
        self.api_client.force_authenticate(user=self.director)

        response = self.api_client.get('/api/admin-panel/claims/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        claim_ids = {item['id'] for item in self.get_response_items(response)}
        self.assertIn(self.client_claim.id, claim_ids)
        self.assertIn(self.other_claim.id, claim_ids)

    def test_client_can_only_list_own_claims(self):
        self.api_client.force_authenticate(user=self.client_user)

        response = self.api_client.get('/api/admin-panel/claims/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        claim_ids = {item['id'] for item in self.get_response_items(response)}
        self.assertIn(self.client_claim.id, claim_ids)
        self.assertNotIn(self.other_claim.id, claim_ids)

    def test_outsider_cannot_open_ticket_activity(self):
        self.api_client.force_authenticate(user=self.other_client)

        response = self.api_client.get(f'/api/admin-panel/support-requests/{self.support_request.id}/activity/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_process_claim_refund_endpoint(self):
        self.api_client.force_authenticate(user=self.admin)

        response = self.api_client.post(
            f'/api/admin-panel/claims/{self.client_claim.id}/process_refund/',
            {'refund_percentage': 50},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client_claim.refresh_from_db()
        self.assertEqual(str(self.client_claim.refund_percentage), '50.00')
