"""Single source of truth for money rules from the approved specification."""
from decimal import Decimal, ROUND_HALF_UP
from django.conf import settings

MONEY = Decimal('0.01')
CLIENT_SERVICE_FEE_PERCENT = Decimal(str(getattr(settings, 'CLIENT_SERVICE_FEE_PERCENT', '25')))
# Приём платежей и выплаты тарифицируются эквайером по-разному, поэтому
# ставки разные. ACQUIRING_FEE_PERCENT — то, что банк удерживает с
# входящего платежа; эта сумма добавляется сверху и её платит клиент.
ACQUIRING_FEE_PERCENT = Decimal(str(getattr(settings, 'ACQUIRING_FEE_PERCENT', '3.5')))
# PAYOUT_ACQUIRING_FEE_PERCENT — стоимость перевода на карту при выводе,
# она удерживается из суммы вывода.
PAYOUT_ACQUIRING_FEE_PERCENT = Decimal(
    str(getattr(settings, 'PAYOUT_ACQUIRING_FEE_PERCENT', '1.5'))
)
EXPERT_WITHDRAWAL_FEE_PERCENT = Decimal(str(getattr(settings, 'EXPERT_WITHDRAWAL_FEE_PERCENT', '15')))
CLIENT_WITHDRAWAL_FEE_PERCENT = Decimal(str(getattr(settings, 'CLIENT_WITHDRAWAL_FEE_PERCENT', '0')))
PARTNER_COMMISSION_PERCENT = Decimal(str(getattr(settings, 'PARTNER_COMMISSION_PERCENT', '25')))
REFERRAL_LIFETIME_DAYS = int(getattr(settings, 'REFERRAL_LIFETIME_DAYS', 183))
GUARANTEE_DAYS = int(getattr(settings, 'GUARANTEE_DAYS', 10))
ALLOWED_PREPAYMENT_PERCENTAGES = (0, 25, 50, 75, 100)


def money(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(MONEY, rounding=ROUND_HALF_UP)


def percent(amount, rate) -> Decimal:
    return money(money(amount) * Decimal(str(rate)) / Decimal('100'))


def client_service_fee_percent(client=None) -> Decimal:
    """Процент сервисного сбора для конкретного клиента.

    У пользователя может быть индивидуальный процент: пусто — общий процент
    площадки, 0 — без комиссии. Это единственное место, где решается ставка:
    если резерв и списание посчитают её по-разному, эскроу разъедется.
    """
    override = getattr(client, 'service_fee_percent', None) if client is not None else None
    if override is None:
        return CLIENT_SERVICE_FEE_PERCENT
    return Decimal(str(override))


def order_quote(base_amount, client=None) -> dict:
    """Эквайринг добавляется сверху, сервисный сбор — по ставке клиента.

    Комиссия банка ложится на плательщика: он видит её отдельной строкой
    и оплачивает вместе с заказом. Если считать её внутри суммы, разницу
    доплачивает площадка.
    """
    base = money(base_amount)
    service_fee = percent(base, client_service_fee_percent(client))
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
    # Вывод — это перевод на карту, у него свой тариф, не равный ставке
    # приёма платежей.
    acquiring_fee = percent(gross, PAYOUT_ACQUIRING_FEE_PERCENT)
    net = money(gross - platform_fee - acquiring_fee)
    if net <= 0:
        raise ValueError('Сумма вывода после комиссий должна быть положительной')
    return {'gross': gross, 'platform_fee': platform_fee, 'acquiring_fee': acquiring_fee, 'net': net}
