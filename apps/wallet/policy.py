"""Single source of truth for money rules from the approved specification."""
from decimal import Decimal, ROUND_HALF_UP
from django.conf import settings

MONEY = Decimal('0.01')
CLIENT_SERVICE_FEE_PERCENT = Decimal(str(getattr(settings, 'CLIENT_SERVICE_FEE_PERCENT', '25')))
ACQUIRING_FEE_PERCENT = Decimal(str(getattr(settings, 'ACQUIRING_FEE_PERCENT', '1.5')))
EXPERT_WITHDRAWAL_FEE_PERCENT = Decimal(str(getattr(settings, 'EXPERT_WITHDRAWAL_FEE_PERCENT', '15')))
CLIENT_WITHDRAWAL_FEE_PERCENT = Decimal(str(getattr(settings, 'CLIENT_WITHDRAWAL_FEE_PERCENT', '0')))
PARTNER_COMMISSION_PERCENT = Decimal(str(getattr(settings, 'PARTNER_COMMISSION_PERCENT', '25')))
REFERRAL_LIFETIME_DAYS = int(getattr(settings, 'REFERRAL_LIFETIME_DAYS', 183))
GUARANTEE_DAYS = int(getattr(settings, 'GUARANTEE_DAYS', 10))
ALLOWED_PREPAYMENT_PERCENTAGES = (25, 50, 75, 100)


def money(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(MONEY, rounding=ROUND_HALF_UP)


def percent(amount, rate) -> Decimal:
    return money(money(amount) * Decimal(str(rate)) / Decimal('100'))


def order_quote(base_amount) -> dict:
    """The acquirer charges 1.5% over base + 25% client service fee."""
    base = money(base_amount)
    service_fee = percent(base, CLIENT_SERVICE_FEE_PERCENT)
    subtotal = base + service_fee
    acquiring_fee = percent(subtotal, ACQUIRING_FEE_PERCENT)
    return {
        'base_amount': base,
        'service_fee': service_fee,
        'acquiring_fee': acquiring_fee,
        'total': money(subtotal + acquiring_fee),
    }


def withdrawal_quote(amount, role) -> dict:
    """Amount is what the user requests; fees are retained from that amount."""
    gross = money(amount)
    platform_rate = EXPERT_WITHDRAWAL_FEE_PERCENT if role == 'expert' else CLIENT_WITHDRAWAL_FEE_PERCENT
    platform_fee = percent(gross, platform_rate)
    acquiring_fee = percent(gross, ACQUIRING_FEE_PERCENT)
    net = money(gross - platform_fee - acquiring_fee)
    if net <= 0:
        raise ValueError('Сумма вывода после комиссий должна быть положительной')
    return {'gross': gross, 'platform_fee': platform_fee, 'acquiring_fee': acquiring_fee, 'net': net}
