"""Логика верификации и допуска к выплатам."""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .fns import check_self_employed
from .models import IdentityVerification, NpdStatusCheck

logger = logging.getLogger(__name__)

# Насколько долго доверяем прошлой проверке ФНС, не дёргая сервис заново.
NPD_CACHE_MINUTES = int(getattr(settings, "NPD_CACHE_MINUTES", 60))

# Главный рубильник. Пока False — выплаты работают как раньше,
# верификация собирается, но никого не блокирует.
def withdrawal_requires_verification() -> bool:
    return bool(getattr(settings, "WITHDRAWAL_REQUIRES_VERIFICATION", False))


# Разрешать ли выплату, когда ФНС недоступна и статус выяснить не удалось.
def allow_withdrawal_when_fns_down() -> bool:
    return bool(getattr(settings, "ALLOW_WITHDRAWAL_WHEN_FNS_DOWN", True))


class VerificationRequired(Exception):
    """Выплата невозможна: верификация не пройдена.

    code — машиночитаемая причина для фронта, чтобы он мог отправить
    пользователя на нужный экран.
    """

    def __init__(self, message: str, code: str):
        super().__init__(message)
        self.message = message
        self.code = code


@dataclass(frozen=True)
class PayoutEligibility:
    allowed: bool
    code: str
    message: str


def get_verification(user) -> IdentityVerification | None:
    return IdentityVerification.objects.filter(user=user).first()


def refresh_npd_status(verification: IdentityVerification, *, withdrawal=None,
                       force: bool = False) -> NpdStatusCheck | None:
    """Спрашивает ФНС о статусе НПД и пишет запись в журнал.

    Если недавняя проверка уже есть и force не задан — возвращает её,
    чтобы не дёргать сервис на каждый чих.
    """
    if not verification.requires_npd_check:
        return None

    if not force:
        fresh_since = timezone.now() - timedelta(minutes=NPD_CACHE_MINUTES)
        recent = verification.npd_checks.filter(
            checked_at__gte=fresh_since,
            is_self_employed__isnull=False,
        ).first()
        if recent is not None:
            return recent

    result = check_self_employed(verification.inn)
    check = NpdStatusCheck.objects.create(
        verification=verification,
        inn=verification.inn,
        is_self_employed=result.is_self_employed,
        message=result.message,
        raw_response=result.raw or {},
        withdrawal=withdrawal,
    )

    verification.npd_confirmed = result.is_self_employed
    verification.npd_checked_at = check.checked_at
    verification.npd_message = result.message
    verification.save(update_fields=["npd_confirmed", "npd_checked_at", "npd_message", "updated_at"])
    return check


def check_payout_eligibility(user, *, withdrawal=None, fresh: bool = False) -> PayoutEligibility:
    """Можно ли выплачивать этому пользователю прямо сейчас.

    fresh=True — обязательно спросить ФНС заново, не доверяя кэшу.
    Так вызывается гейт перед фактическим списанием: закон требует
    подтверждать статус самозанятого на момент каждой выплаты.
    fresh=False — можно ответить по недавней проверке; этого достаточно,
    чтобы нарисовать интерфейс.
    """
    if not withdrawal_requires_verification():
        return PayoutEligibility(True, "not_enforced", "Проверка верификации отключена")

    verification = get_verification(user)
    if verification is None:
        return PayoutEligibility(
            False, "verification_missing",
            "Для вывода средств нужно пройти верификацию: указать ФИО, ИНН и налоговый статус.",
        )

    if verification.status == IdentityVerification.Status.REJECTED:
        reason = verification.rejection_reason or "данные не прошли проверку"
        return PayoutEligibility(
            False, "verification_rejected",
            f"Верификация отклонена: {reason}. Исправьте данные и отправьте заново.",
        )

    if verification.status != IdentityVerification.Status.APPROVED:
        return PayoutEligibility(
            False, "verification_pending",
            "Верификация ещё на проверке. Выплата станет доступна после подтверждения.",
        )

    if not verification.requires_npd_check:
        return PayoutEligibility(True, "ok", "Верификация подтверждена")

    # Самозанятый: статус ФНС подтверждаем перед каждой выплатой.
    check = refresh_npd_status(verification, withdrawal=withdrawal, force=fresh)
    if check is None or check.is_self_employed is None:
        if allow_withdrawal_when_fns_down():
            logger.warning(
                "ФНС недоступна, выплата пользователю %s пропущена без подтверждения НПД", user.pk,
            )
            return PayoutEligibility(True, "fns_unavailable", "Статус НПД не проверен: сервис ФНС недоступен")
        return PayoutEligibility(
            False, "fns_unavailable",
            "Не удалось проверить статус самозанятого — сервис ФНС недоступен. Попробуйте позже.",
        )

    if check.is_self_employed is False:
        return PayoutEligibility(
            False, "npd_inactive",
            "По данным ФНС вы не числитесь плательщиком налога на профессиональный доход. "
            "Восстановите статус самозанятого или измените налоговый статус в анкете.",
        )

    return PayoutEligibility(True, "ok", "Статус самозанятого подтверждён")


def ensure_can_withdraw(user, *, withdrawal=None) -> PayoutEligibility:
    """Как check_payout_eligibility, но бросает VerificationRequired при отказе.

    Всегда идёт в ФНС заново: это точка, где деньги реально уходят.
    """
    result = check_payout_eligibility(user, withdrawal=withdrawal, fresh=True)
    if not result.allowed:
        raise VerificationRequired(result.message, result.code)
    return result


def submit_verification(user, *, last_name, first_name, middle_name="", birth_date=None,
                        inn, tax_status) -> IdentityVerification:
    """Создаёт или обновляет анкету и сразу спрашивает ФНС о статусе.

    Повторная подача после отказа возвращает анкету на проверку.
    """
    verification, _created = IdentityVerification.objects.update_or_create(
        user=user,
        defaults={
            "last_name": last_name,
            "first_name": first_name,
            "middle_name": middle_name or "",
            "birth_date": birth_date,
            "inn": inn,
            "tax_status": tax_status,
            "status": IdentityVerification.Status.PENDING,
            "rejection_reason": "",
            "reviewed_by": None,
            "reviewed_at": None,
        },
    )

    check = refresh_npd_status(verification, force=True)

    # Самозанятого, подтверждённого ФНС, принимаем автоматически:
    # первоисточник уже сказал всё, что нужно, ручная проверка ничего не добавит.
    if check is not None and check.is_self_employed is True:
        approve(verification, reviewer=None, note="Автоматически: статус НПД подтверждён ФНС")

    return verification


def approve(verification: IdentityVerification, *, reviewer=None, note: str = "") -> IdentityVerification:
    verification.status = IdentityVerification.Status.APPROVED
    verification.reviewed_by = reviewer
    verification.reviewed_at = timezone.now()
    verification.rejection_reason = ""
    if note:
        verification.npd_message = note
    verification.save(update_fields=[
        "status", "reviewed_by", "reviewed_at", "rejection_reason", "npd_message", "updated_at",
    ])
    _sync_user_flag(verification.user, True)
    return verification


def reject(verification: IdentityVerification, *, reviewer=None, reason: str = "") -> IdentityVerification:
    verification.status = IdentityVerification.Status.REJECTED
    verification.reviewed_by = reviewer
    verification.reviewed_at = timezone.now()
    verification.rejection_reason = reason or "Данные не подтверждены"
    verification.save(update_fields=[
        "status", "reviewed_by", "reviewed_at", "rejection_reason", "updated_at",
    ])
    _sync_user_flag(verification.user, False)
    return verification


def _sync_user_flag(user, value: bool) -> None:
    """Держит User.is_verified в согласии со статусом анкеты.

    Поле уже было в модели пользователя и использовалось в интерфейсе,
    поэтому не заводим второе, а поддерживаем существующее.
    """
    if getattr(user, "is_verified", None) != value:
        user.is_verified = value
        user.save(update_fields=["is_verified"])
