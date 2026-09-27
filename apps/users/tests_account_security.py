from unittest.mock import patch
from decimal import Decimal
from django.test import TestCase, override_settings
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, PartnerEarning
from .password_reset import create_password_reset_code, verify_password_reset_code
from .partner_welcome import enqueue_partner_welcome
from apps.notifications.models import ExternalDelivery
from apps.notifications.delivery import deliver


class AccountSecurityTests(TestCase):
    def setUp(self):
        cache.clear()
        self.api = APIClient()
        self.old = 'Vivid!OldPass2026'
        self.new = 'Cobalt!River2027'

    def user(self, role='client', name=None, **kwargs):
        name = name or role
        return User.objects.create_user(username=name, email=name+'@example.test', password=self.old, role=role, **kwargs)

    def test_password_change_for_every_role(self):
        for role in ['client', 'expert', 'partner', 'admin', 'director']:
            with self.subTest(role=role):
                cache.clear()
                user = self.user(role)
                old_refresh = RefreshToken.for_user(user)
                self.api.force_authenticate(user)
                response = self.api.post('/api/users/password/change/', {'current_password': self.old, 'new_password': self.new})
                self.assertEqual(response.status_code, 200, response.data)
                user.refresh_from_db()
                self.assertTrue(user.check_password(self.new))
                self.assertFalse(user.check_password(self.old))
                self.assertIn('oko_access', response.cookies)
                self.assertNotIn('access', response.data)

    def test_anonymous_change_forbidden(self):
        response = self.api.post('/api/users/password/change/', {'new_password': self.new})
        self.assertIn(response.status_code, (401, 403))

    def test_incorrect_current_password_and_weak_password(self):
        user = self.user(); self.api.force_authenticate(user)
        for old, new in [('wrong', self.new), (self.old, '12345678'), (self.old, self.old), (self.old, 'x'*129)]:
            cache.clear()
            response = self.api.post('/api/users/password/change/', {'current_password': old, 'new_password': new})
            self.assertEqual(response.status_code, 400, response.data)
            user.refresh_from_db(); self.assertTrue(user.check_password(self.old))

    @patch('apps.users.account_security.send_password_reset_code', return_value=True)
    def test_recovery_for_every_role_is_self_only(self, mail):
        other = self.user(name='other')
        for role in ['client', 'expert', 'partner', 'admin', 'director']:
            with self.subTest(role=role):
                cache.clear(); user = self.user(role); self.api.force_authenticate(user)
                response = self.api.post('/api/users/password/recovery/', {'email': other.email})
                self.assertEqual(response.status_code, 200, response.data)
                self.assertEqual(mail.call_args.args[0], user.email)
                code = mail.call_args.args[1]
                response = self.api.post('/api/users/password/recovery/confirm/', {'email': other.email, 'code': code, 'new_password': self.new})
                self.assertEqual(response.status_code, 200, response.data)
                user.refresh_from_db(); self.assertTrue(user.check_password(self.new))
                other.refresh_from_db(); self.assertTrue(other.check_password(self.old))
                replay = self.api.post('/api/users/password/recovery/confirm/', {'code': code, 'new_password': 'Next!Password2028'})
                self.assertEqual(replay.status_code, 400)

    def test_code_guessing_is_bounded(self):
        user = self.user(); code = create_password_reset_code(user)
        wrong = '000000' if code != '000000' else '111111'
        for _ in range(5): self.assertIsNone(verify_password_reset_code(user.email, wrong))
        self.assertIsNone(verify_password_reset_code(user.email, code))

    def test_expired_or_missing_code_rejected(self):
        user = self.user(); code = create_password_reset_code(user); cache.clear()
        response = self.api.post('/api/users/reset-password/confirm/', {'email': user.email, 'code': code, 'new_password': self.new})
        self.assertEqual(response.status_code, 400)

    @patch('apps.users.account_security.send_password_reset_code', return_value=True)
    def test_public_recovery_case_insensitive_and_generic(self, mail):
        user = self.user(); user.email = 'MixedCase@example.test'; user.save(update_fields=['email'])
        existing = self.api.post('/api/users/reset-password/', {'email': '  mixedcase@EXAMPLE.TEST  '})
        code = mail.call_args.args[1]
        missing = self.api.post('/api/users/reset-password/', {'email': 'missing@example.test'})
        self.assertEqual(existing.data, missing.data)
        response = self.api.post('/api/users/reset-password/confirm/', {'email': 'MIXEDCASE@example.test', 'code': code, 'new_password': self.new})
        self.assertEqual(response.status_code, 200, response.data)

    @patch('apps.users.account_security.send_password_reset_code', return_value=False)
    def test_mail_failure_is_reported_in_cabinet(self, mail):
        user = self.user(); self.api.force_authenticate(user)
        response = self.api.post('/api/users/password/recovery/', {})
        self.assertEqual(response.status_code, 503)
        self.assertIsNone(cache.get('password_reset_'+user.email))

    @patch('apps.users.account_security.send_password_reset_code', return_value=True)
    def test_inactive_and_ambiguous_users_receive_no_code(self, mail):
        first = self.user(name='first'); second = self.user(name='second')
        second.email = first.email; second.save(update_fields=['email'])
        response = self.api.post('/api/users/reset-password/', {'email': first.email})
        self.assertEqual(response.status_code, 200); mail.assert_not_called()
        first.is_active = False; first.save(update_fields=['is_active'])
        second.is_active = False; second.save(update_fields=['is_active'])
        response = self.api.post('/api/users/reset-password/', {'email': first.email})
        self.assertEqual(response.status_code, 200); mail.assert_not_called()

    def test_password_change_ignores_target_user(self):
        user = self.user(); other = self.user(name='other'); self.api.force_authenticate(user)
        response = self.api.post('/api/users/password/change/', {'user_id': other.pk, 'current_password': self.old, 'new_password': self.new})
        self.assertEqual(response.status_code, 200)
        other.refresh_from_db(); self.assertTrue(other.check_password(self.old))

    def test_recovery_throttled(self):
        user = self.user(); self.api.force_authenticate(user)
        for _ in range(5):self.api.post('/api/users/password/change/', {'current_password':'wrong'})
        response = self.api.post('/api/users/password/change/', {'current_password':'wrong'})
        self.assertEqual(response.status_code, 429)

    def test_admin_cannot_assign_or_clear_manager(self):
        admin = self.user('admin'); partner = self.user('partner'); self.api.force_authenticate(admin)
        for manager in [admin.pk, None]:
            response = self.api.patch(f'/api/users/{partner.pk}/admin_update_partner/', {'partner_manager_id': manager, 'first_name': 'No change'}, format='json')
            self.assertEqual(response.status_code, 403)
        partner.refresh_from_db(); self.assertIsNone(partner.partner_manager_id); self.assertEqual(partner.first_name, '')

    def test_director_can_assign_and_admin_can_read(self):
        director = self.user('director'); admin = self.user('admin'); partner = self.user('partner')
        self.api.force_authenticate(director)
        response = self.api.patch(f'/api/users/{partner.pk}/admin_update_partner/', {'partner_manager_id': admin.pk}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        director_rows = self.api.get('/api/director/partners/'); self.assertEqual(director_rows.status_code, 200)
        self.assertEqual(director_rows.data[0]['manager']['id'], admin.pk)
        self.api.force_authenticate(admin); rows = self.api.get('/api/users/admin_partners/')
        self.assertEqual(rows.data[0]['manager']['id'], admin.pk)

    def test_director_totals_do_not_multiply_with_referrals(self):
        director = self.user('director'); partner = self.user('partner')
        first = self.user(name='first'); second = self.user(name='second')
        User.objects.filter(pk__in=[first.pk, second.pk]).update(partner=partner)
        for referral in [first, second]:
            PartnerEarning.objects.create(partner=partner, referral=referral, amount=Decimal('25'), source_amount=Decimal('100'), commission_rate=Decimal('25'))
        self.api.force_authenticate(director); response = self.api.get('/api/director/partners/')
        self.assertEqual(response.status_code, 200, response.data)
        row = response.data[0]
        self.assertEqual(row['total_referrals'], 2); self.assertEqual(row['total_earnings'], 50); self.assertEqual(row['total_turnover'], 200)

    def test_new_partner_welcome_once_and_no_password(self):
        partner = self.user('partner')
        row = ExternalDelivery.objects.get(event_key=f'partner-welcome:{partner.pk}')
        self.assertEqual(row.channel, 'email'); self.assertIn(partner.username, row.body)
        self.assertNotIn(self.old, row.body); self.assertEqual(row.state, 'pending')
        partner.first_name = 'Changed'; partner.save(); enqueue_partner_welcome(partner)
        self.assertEqual(ExternalDelivery.objects.filter(event_key=row.event_key).count(), 1)

    @patch('apps.notifications.delivery.send_mail', return_value=1)
    def test_welcome_delivery_uses_correct_email(self, mail):
        partner = self.user('partner')
        row = ExternalDelivery.objects.get(event_key=f'partner-welcome:{partner.pk}')
        self.assertEqual(deliver(row.pk), 'sent')
        self.assertEqual(mail.call_args.args[3], [partner.email])
        self.assertIn(partner.username, mail.call_args.args[1])

    @patch('apps.notifications.delivery.send_mail', side_effect=OSError('smtp unavailable'))
    def test_welcome_delivery_retries(self, mail):
        partner = self.user('partner'); row = ExternalDelivery.objects.get(event_key=f'partner-welcome:{partner.pk}')
        self.assertEqual(deliver(row.pk), 'pending')
        row.refresh_from_db(); self.assertEqual(row.attempts, 1)

    def test_partner_registration_requires_email(self):
        director = self.user('director'); self.api.force_authenticate(director)
        response = self.api.post('/api/director/personnel/register/', {'phone': '+79991112233', 'role': 'partner', 'city': 'Москва'})
        self.assertEqual(response.status_code, 400)

    def test_partner_registration_queues_login_email(self):
        director = self.user('director'); self.api.force_authenticate(director)
        response = self.api.post('/api/director/personnel/register/', {'email': 'newpartner@example.test', 'role': 'partner', 'city': 'Москва'})
        self.assertEqual(response.status_code, 201, response.data)
        row = ExternalDelivery.objects.get(event_key=f"partner-welcome:{response.data['id']}")
        self.assertIn(response.data['username'], row.body)
