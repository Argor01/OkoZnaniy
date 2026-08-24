from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from .fns import NpdResult
from .inn import is_valid_inn, normalize_inn, validate_inn, InvalidINN
from .models import IdentityVerification, NpdStatusCheck
from . import services

User = get_user_model()

# Реальные ИНН, проверенные вручную по алгоритму ФНС.
# Внимание: ИНН 525741209968 из документации ФНС — вымышленный,
# контрольная сумма у него не сходится, для тестов не годится.
VALID_PERSONAL_INN = "500100732259"
VALID_COMPANY_INN = "6623148052"  # ИНН ООО «ОКО ЗНАНИЙ»


class InnValidationTests(TestCase):
    def test_valid_personal_inn(self):
        self.assertTrue(is_valid_inn(VALID_PERSONAL_INN))

    def test_valid_company_inn(self):
        self.assertTrue(is_valid_inn(VALID_COMPANY_INN))

    def test_rejects_wrong_checksum(self):
        broken = VALID_PERSONAL_INN[:-1] + str((int(VALID_PERSONAL_INN[-1]) + 1) % 10)
        self.assertFalse(is_valid_inn(broken))

    def test_rejects_wrong_length(self):
        self.assertFalse(is_valid_inn("12345"))
        self.assertFalse(is_valid_inn("12345678901"))

    def test_normalizes_separators(self):
        self.assertEqual(normalize_inn(" 5001-0073 2259 "), VALID_PERSONAL_INN)

    def test_validate_raises_on_empty(self):
        with self.assertRaises(InvalidINN):
            validate_inn("")


class PayoutEligibilityTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="expert1", email="e1@example.com", password="x", role="expert",
        )

    def _submit(self, tax_status=IdentityVerification.TaxStatus.SELF_EMPLOYED,
                self_employed=True):
        result = NpdResult(
            is_self_employed=self_employed,
            message="тест", raw={"status": self_employed}, ok=True,
        )
        with patch("apps.verification.services.check_self_employed", return_value=result):
            return services.submit_verification(
                self.user,
                last_name="Иванов", first_name="Иван", middle_name="Иванович",
                birth_date=None, inn=VALID_PERSONAL_INN, tax_status=tax_status,
            )

    @override_settings(WITHDRAWAL_REQUIRES_VERIFICATION=False)
    def test_disabled_flag_allows_everyone(self):
        result = services.check_payout_eligibility(self.user)
        self.assertTrue(result.allowed)
        self.assertEqual(result.code, "not_enforced")

    @override_settings(WITHDRAWAL_REQUIRES_VERIFICATION=True)
    def test_blocks_when_no_verification(self):
        result = services.check_payout_eligibility(self.user)
        self.assertFalse(result.allowed)
        self.assertEqual(result.code, "verification_missing")

    @override_settings(WITHDRAWAL_REQUIRES_VERIFICATION=True)
    def test_confirmed_self_employed_is_approved_automatically(self):
        verification = self._submit(self_employed=True)
        self.assertEqual(verification.status, IdentityVerification.Status.APPROVED)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_verified)

        result = services.check_payout_eligibility(self.user)
        self.assertTrue(result.allowed)

    @override_settings(WITHDRAWAL_REQUIRES_VERIFICATION=True)
    def test_blocks_when_npd_revoked(self):
        self._submit(self_employed=True)
        # Статус сняли: следующая проверка перед выплатой должна это увидеть.
        revoked = NpdResult(is_self_employed=False, message="не является", raw={}, ok=True)
        with patch("apps.verification.services.check_self_employed", return_value=revoked):
            result = services.check_payout_eligibility(self.user, fresh=True)
        self.assertFalse(result.allowed)
        self.assertEqual(result.code, "npd_inactive")

    @override_settings(WITHDRAWAL_REQUIRES_VERIFICATION=True, ALLOW_WITHDRAWAL_WHEN_FNS_DOWN=True)
    def test_fns_down_allows_by_default(self):
        self._submit(self_employed=True)
        down = NpdResult(is_self_employed=None, message="недоступна", raw={}, ok=False)
        with patch("apps.verification.services.check_self_employed", return_value=down):
            result = services.check_payout_eligibility(self.user, fresh=True)
        self.assertTrue(result.allowed)
        self.assertEqual(result.code, "fns_unavailable")

    @override_settings(WITHDRAWAL_REQUIRES_VERIFICATION=True, ALLOW_WITHDRAWAL_WHEN_FNS_DOWN=False)
    def test_fns_down_blocks_when_strict(self):
        self._submit(self_employed=True)
        down = NpdResult(is_self_employed=None, message="недоступна", raw={}, ok=False)
        with patch("apps.verification.services.check_self_employed", return_value=down):
            result = services.check_payout_eligibility(self.user, fresh=True)
        self.assertFalse(result.allowed)

    @override_settings(WITHDRAWAL_REQUIRES_VERIFICATION=True)
    def test_entrepreneur_skips_npd_check(self):
        verification = self._submit(
            tax_status=IdentityVerification.TaxStatus.ENTREPRENEUR, self_employed=False,
        )
        # ИП не проверяется через НПД, поэтому уходит на ручную модерацию.
        self.assertEqual(verification.status, IdentityVerification.Status.PENDING)
        services.approve(verification, reviewer=None)
        result = services.check_payout_eligibility(self.user)
        self.assertTrue(result.allowed)

    @override_settings(WITHDRAWAL_REQUIRES_VERIFICATION=True)
    def test_rejected_verification_blocks(self):
        verification = self._submit(self_employed=True)
        services.reject(verification, reviewer=None, reason="ФИО не совпадает")
        result = services.check_payout_eligibility(self.user)
        self.assertFalse(result.allowed)
        self.assertEqual(result.code, "verification_rejected")

    @override_settings(WITHDRAWAL_REQUIRES_VERIFICATION=True)
    def test_each_check_is_logged(self):
        self._submit(self_employed=True)
        before = NpdStatusCheck.objects.count()
        fresh = NpdResult(is_self_employed=True, message="ок", raw={}, ok=True)
        with patch("apps.verification.services.check_self_employed", return_value=fresh):
            services.refresh_npd_status(
                services.get_verification(self.user), force=True,
            )
        self.assertEqual(NpdStatusCheck.objects.count(), before + 1)

    @override_settings(WITHDRAWAL_REQUIRES_VERIFICATION=True)
    def test_ui_check_may_use_cache_but_payout_does_not(self):
        """Интерфейс может отвечать по кэшу, а гейт выплаты — нет."""
        self._submit(self_employed=True)
        revoked = NpdResult(is_self_employed=False, message="снят с учёта", raw={}, ok=True)
        with patch("apps.verification.services.check_self_employed", return_value=revoked):
            cached = services.check_payout_eligibility(self.user)
            fresh = services.check_payout_eligibility(self.user, fresh=True)
        self.assertTrue(cached.allowed, "по кэшу ещё разрешено")
        self.assertFalse(fresh.allowed, "свежая проверка должна заблокировать")
