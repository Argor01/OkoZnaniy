from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.arbitration.models import ArbitrationActivity, ArbitrationCase, ArbitrationMessage
from apps.catalog.models import Subject, WorkType
from apps.orders.models import Order

User = get_user_model()


class ArbitrationCaseAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.client_user = User.objects.create_user(
            username='arb_client',
            email='arb_client@example.com',
            password='testpass123',
            role='client',
        )
        cls.expert_user = User.objects.create_user(
            username='arb_expert',
            email='arb_expert@example.com',
            password='testpass123',
            role='expert',
        )
        cls.admin_user = User.objects.create_user(
            username='arb_admin',
            email='arb_admin@example.com',
            password='testpass123',
            role='admin',
        )
        cls.outsider_user = User.objects.create_user(
            username='arb_outsider',
            email='arb_outsider@example.com',
            password='testpass123',
            role='client',
        )
        cls.subject = Subject.objects.create(name='Arbitration subject')
        cls.work_type = WorkType.objects.create(name='Arbitration work type')
        cls.order = Order.objects.create(
            client=cls.client_user,
            expert=cls.expert_user,
            subject=cls.subject,
            work_type=cls.work_type,
            title='Arbitration order',
            description='Order for arbitration tests',
            budget=15000,
            deadline=timezone.now() + timedelta(days=5),
            status='in_progress',
        )

    def setUp(self):
        self.api_client = APIClient()

    def _claim_payload(self, **overrides):
        payload = {
            'order_id': self.order.id,
            'subject': 'Need arbitration',
            'reason': 'poor_quality',
            'description': 'Work quality is unacceptable',
            'deadline_relevant': False,
            'refund_type': 'partial',
            'requested_refund_percentage': 50,
            'requested_refund_amount': 7500,
            'evidence_files': [],
        }
        payload.update(overrides)
        return payload

    def _create_case(self, **overrides):
        defaults = {
            'plaintiff': self.client_user,
            'defendant': self.expert_user,
            'order': self.order,
            'reason': 'poor_quality',
            'subject': 'Existing case',
            'description': 'Existing arbitration case',
            'refund_type': 'partial',
            'requested_refund_percentage': 50,
            'status': 'submitted',
        }
        defaults.update(overrides)
        return ArbitrationCase.objects.create(**defaults)

    def test_submit_claim_creates_submitted_case_and_freezes_order(self):
        self.client_user.is_banned_for_contacts = True
        self.client_user.contact_ban_reason = 'autoban'
        self.client_user.contact_ban_until = timezone.now() + timedelta(days=1)
        self.client_user.save(update_fields=['is_banned_for_contacts', 'contact_ban_reason', 'contact_ban_until'])

        self.api_client.force_authenticate(user=self.client_user)
        response = self.api_client.post('/api/arbitration/cases/submit-claim/', self._claim_payload(), format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        case = ArbitrationCase.objects.get(order=self.order)
        self.assertEqual(case.status, 'submitted')
        self.order.refresh_from_db()
        self.client_user.refresh_from_db()
        self.assertTrue(self.order.is_frozen)
        self.assertTrue(self.order.has_issues)
        self.assertFalse(self.client_user.is_banned_for_contacts)
        self.assertIsNone(self.client_user.contact_ban_reason)

    def test_submit_claim_rejects_duplicate_active_case(self):
        self._create_case()
        self.api_client.force_authenticate(user=self.client_user)

        response = self.api_client.post('/api/arbitration/cases/submit-claim/', self._claim_payload(), format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('order_id', response.data)

    def test_submit_claim_requires_description(self):
        self.api_client.force_authenticate(user=self.client_user)

        response = self.api_client.post(
            '/api/arbitration/cases/submit-claim/',
            self._claim_payload(description='   '),
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('description', response.data)

    def test_my_cases_returns_only_participant_cases(self):
        own_case = self._create_case(subject='Own case')
        ArbitrationCase.objects.create(
            plaintiff=self.outsider_user,
            defendant=self.admin_user,
            reason='other',
            subject='Foreign case',
            description='Should not be visible',
            refund_type='none',
            status='submitted',
        )
        self.api_client.force_authenticate(user=self.client_user)

        response = self.api_client.get('/api/arbitration/cases/my-cases/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {item['id'] for item in response.data}
        self.assertEqual(returned_ids, {own_case.id})

    def test_send_message_requires_non_empty_text(self):
        case = self._create_case()
        self.api_client.force_authenticate(user=self.client_user)

        response = self.api_client.post(
            f'/api/arbitration/cases/{case.id}/send-message/',
            {'message': '   '},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_send_message_by_participant_creates_message(self):
        case = self._create_case()
        self.api_client.force_authenticate(user=self.client_user)

        response = self.api_client.post(
            f'/api/arbitration/cases/{case.id}/send-message/',
            {'message': 'Client explanation'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            ArbitrationMessage.objects.filter(case=case, sender=self.client_user, text='Client explanation').exists()
        )
        self.assertTrue(
            ArbitrationActivity.objects.filter(case=case, activity_type='message_sent').exists()
        )

    def test_send_message_by_outsider_is_forbidden(self):
        case = self._create_case()
        self.api_client.force_authenticate(user=self.outsider_user)

        response = self.api_client.post(
            f'/api/arbitration/cases/{case.id}/send-message/',
            {'message': 'Intrusion'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_take_in_work_requires_admin(self):
        case = self._create_case()
        self.api_client.force_authenticate(user=self.client_user)

        response = self.api_client.post(f'/api/arbitration/cases/{case.id}/take-in-work/', {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_take_in_work_assigns_admin_and_updates_status(self):
        case = self._create_case(status='submitted')
        self.api_client.force_authenticate(user=self.admin_user)

        response = self.api_client.post(f'/api/arbitration/cases/{case.id}/take-in-work/', {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        case.refresh_from_db()
        self.assertEqual(case.assigned_admin, self.admin_user)
        self.assertEqual(case.status, 'under_review')

    def test_make_decision_requires_text(self):
        case = self._create_case()
        self.api_client.force_authenticate(user=self.admin_user)

        response = self.api_client.post(
            f'/api/arbitration/cases/{case.id}/make-decision/',
            {'decision': '   '},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_make_decision_sets_status_and_refund_fields(self):
        case = self._create_case(status='under_review')
        self.api_client.force_authenticate(user=self.admin_user)

        response = self.api_client.post(
            f'/api/arbitration/cases/{case.id}/make-decision/',
            {
                'decision': 'Refund approved',
                'approved_refund_percentage': 25,
                'approved_refund_amount': 3750,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        case.refresh_from_db()
        self.assertEqual(case.status, 'decision_made')
        self.assertEqual(str(case.approved_refund_percentage), '25.00')
        self.assertEqual(str(case.approved_refund_amount), '3750.00')
        self.assertEqual(case.decision_made_by, self.admin_user)

    def test_close_case_unfreezes_order_and_creates_final_message(self):
        case = self._create_case(status='decision_made')
        self.order.freeze('Manual freeze for test')
        self.order.has_issues = True
        self.order.save(update_fields=['has_issues', 'updated_at'])
        self.api_client.force_authenticate(user=self.admin_user)

        response = self.api_client.post(
            f'/api/arbitration/cases/{case.id}/close-case/',
            {'message': 'Case closed'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        case.refresh_from_db()
        self.order.refresh_from_db()
        self.assertEqual(case.status, 'closed')
        self.assertFalse(self.order.is_frozen)
        self.assertFalse(self.order.has_issues)
        self.assertTrue(ArbitrationMessage.objects.filter(case=case, text='Case closed').exists())

    def test_activity_feed_hides_internal_messages_for_non_admin(self):
        case = self._create_case()
        ArbitrationMessage.objects.create(
            case=case,
            sender=self.admin_user,
            message_type='admin',
            text='Visible public note',
            is_internal=False,
        )
        ArbitrationMessage.objects.create(
            case=case,
            sender=self.admin_user,
            message_type='admin',
            text='Hidden internal note',
            is_internal=True,
        )
        self.api_client.force_authenticate(user=self.client_user)

        response = self.api_client.get(f'/api/arbitration/cases/{case.id}/activity-feed/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        texts = [item['text'] for item in response.data['messages']]
        self.assertIn('Visible public note', texts)
        self.assertNotIn('Hidden internal note', texts)

    def test_activity_feed_shows_internal_messages_for_admin(self):
        case = self._create_case()
        ArbitrationMessage.objects.create(
            case=case,
            sender=self.admin_user,
            message_type='admin',
            text='Admin internal note',
            is_internal=True,
        )
        self.api_client.force_authenticate(user=self.admin_user)

        response = self.api_client.get(f'/api/arbitration/cases/{case.id}/activity-feed/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        texts = [item['text'] for item in response.data['messages']]
        self.assertIn('Admin internal note', texts)

    def test_stats_requires_admin(self):
        self._create_case(status='submitted')
        self.api_client.force_authenticate(user=self.client_user)

        response = self.api_client.get('/api/arbitration/stats/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_stats_returns_case_counters_for_admin(self):
        self._create_case(status='submitted', priority='urgent')
        self._create_case(status='under_review', subject='Review case')
        self._create_case(status='closed', subject='Closed case')
        self.api_client.force_authenticate(user=self.admin_user)

        response = self.api_client.get('/api/arbitration/stats/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_cases'], 3)
        self.assertEqual(response.data['new_cases'], 1)
        self.assertEqual(response.data['in_progress'], 1)
        self.assertEqual(response.data['closed_cases'], 1)
        self.assertEqual(response.data['urgent_cases'], 1)

