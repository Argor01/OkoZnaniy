from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate
from .models import User, PartnerEarning
from .views import UserViewSet


class PartnerAdminTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create(username='pa-admin', role='admin', email='pa-admin@example.test')
        cls.other = User.objects.create(username='pa-other', role='admin', email='pa-other@example.test')
        cls.inactive = User.objects.create(username='pa-inactive', role='admin', is_active=False)
        cls.director = User.objects.create(username='pa-director', role='director')
        cls.partner = User.objects.create(username='pa-partner', role='partner')
        cls.empty = User.objects.create(username='pa-empty', role='partner')
        cls.referral_user = User.objects.create(username='pa-client', role='client')
        tz = ZoneInfo('Europe/Moscow')
        for when, source, paid in [
            (datetime(2026, 9, 23, 23, 59, 59, tzinfo=tz), '100', False),
            (datetime(2026, 9, 24, 0, 0, tzinfo=tz), '200', True),
            (datetime(2026, 9, 24, 23, 59, 59, 999999, tzinfo=tz), '300', False),
            (datetime(2026, 9, 25, 0, 0, tzinfo=tz), '400', False),
        ]:
            earning = PartnerEarning.objects.create(partner=cls.partner, referral=cls.referral_user,
                source_amount=Decimal(source), amount=Decimal(source) / 4,
                commission_rate=Decimal('25'), is_paid=paid)
            PartnerEarning.objects.filter(pk=earning.pk).update(created_at=when)

    def call(self, action, user=None, data=None, method='get', username=None):
        factory = APIRequestFactory()
        request = getattr(factory, method)('/api/users/' + action + '/', data or {}, format='json')
        force_authenticate(request, user=user or self.admin)
        kwargs = {'username': str(username)} if username is not None else {}
        return UserViewSet.as_view({method: action})(request, **kwargs)

    def test_full_day_boundaries_and_all_partners(self):
        response = self.call('admin_partners', data={'start_date': '2026-09-24', 'end_date': '2026-09-24'})
        self.assertEqual(response.status_code, 200)
        rows = {row['id']: row for row in response.data}
        self.assertEqual(rows[self.partner.pk]['total_turnover'], 500)
        self.assertEqual(rows[self.partner.pk]['total_earnings'], 125)
        self.assertEqual(rows[self.partner.pk]['paid_earnings'], 50)
        self.assertEqual(rows[self.partner.pk]['unpaid_earnings'], 75)
        self.assertEqual(rows[self.empty.pk]['total_turnover'], 0)
        self.assertIsNone(rows[self.partner.pk]['manager'])

    def test_all_time_and_one_sided_period(self):
        response = self.call('admin_partners')
        self.assertEqual(sum(row['total_turnover'] for row in response.data), 1000)
        response = self.call('admin_partners', data={'end_date': '2026-09-24'})
        self.assertEqual(sum(row['total_turnover'] for row in response.data), 600)
        response = self.call('admin_partners', data={'start_date': '2026-09-25'})
        self.assertEqual(sum(row['total_turnover'] for row in response.data), 400)

    def test_invalid_periods(self):
        for params in [
            {'start_date': '2026-02-30'}, {'start_date': 'wrong'},
            {'start_date': '20260924'}, {'end_date': '9999-12-31'},
            {'start_date': '2026-09-25', 'end_date': '2026-09-24'},
        ]:
            self.assertEqual(self.call('admin_partners', data=params).status_code, 400)

    def test_permission_checks(self):
        for user in [self.referral_user, self.partner]:
            self.assertEqual(self.call('admin_partners', user=user).status_code, 403)
            self.assertEqual(self.call('admin_partner_managers', user=user).status_code, 403)
            self.assertEqual(self.call('admin_update_partner', user=user, method='patch', username=self.partner.pk,
                data={'partner_manager_id': self.admin.pk}).status_code, 403)

    def test_manager_options_only_active_admins(self):
        response = self.call('admin_partner_managers')
        self.assertEqual(response.status_code, 200)
        self.assertEqual({row['id'] for row in response.data}, {self.admin.pk, self.other.pk})

    def test_assign_and_clear_manager(self):
        response = self.call('admin_update_partner', method='patch', username=self.partner.pk,
            data={'partner_manager_id': self.other.pk})
        self.assertEqual(response.status_code, 200)
        self.partner.refresh_from_db()
        self.assertEqual(self.partner.partner_manager_id, self.other.pk)
        rows = self.call('admin_partners').data
        self.assertEqual(next(row for row in rows if row['id'] == self.partner.pk)['manager']['id'], self.other.pk)
        response = self.call('admin_update_partner', method='patch', username=self.partner.pk,
            data={'partner_manager_id': None})
        self.assertEqual(response.status_code, 200)
        self.partner.refresh_from_db()
        self.assertIsNone(self.partner.partner_manager_id)

    def test_invalid_manager_cannot_change_other_fields(self):
        for invalid in [self.referral_user.pk, self.director.pk, self.inactive.pk, 999999999, True, 1.5, 'bad']:
            response = self.call('admin_update_partner', method='patch', username=self.partner.pk,
                data={'partner_manager_id': invalid, 'first_name': 'Should not persist'})
            self.assertEqual(response.status_code, 400)
            self.partner.refresh_from_db()
            self.assertIsNone(self.partner.partner_manager_id)
            self.assertEqual(self.partner.first_name, '')

    def test_non_partner_cannot_receive_manager(self):
        response = self.call('admin_update_partner', method='patch', username=self.referral_user.pk,
            data={'partner_manager_id': self.admin.pk})
        self.assertEqual(response.status_code, 400)

    def test_empty_period_zeroes_not_cached_totals(self):
        User.objects.filter(pk=self.partner.pk).update(total_earnings=Decimal('999'))
        rows = self.call('admin_partners', data={'start_date': '2020-01-01', 'end_date': '2020-01-01'}).data
        self.assertTrue(all(row['total_turnover'] == 0 and row['total_earnings'] == 0 for row in rows))

    def test_registration_source_matches_director_formula(self):
        PartnerEarning.objects.create(partner=self.partner, referral=self.referral_user,
            amount=Decimal('50'), source_amount=Decimal('50'), commission_rate=Decimal('0'), earning_type='registration')
        rows = self.call('admin_partners').data
        self.assertEqual(sum(row['total_turnover'] for row in rows), 1050)
