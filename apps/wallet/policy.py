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


def withdrawal_fee_percent(role, user=None) -> Decimal:
    """Процент удержания при выводе: персональный, иначе общий по роли.

    Считаем в одном месте — как и сервисный сбор с клиента, чтобы расчёт
    в кошельке и в интерфейсе не разошёлся.
    """
    override = getattr(user, 'withdrawal_fee_percent', None) if user is not None else None
    if override is not None:
        return Decimal(str(override))
    return EXPERT_WITHDRAWAL_FEE_PERCENT if role == 'expert' else CLIENT_WITHDRAWAL_FEE_PERCENT


def order_payment_amount(order):
    """Сумма заказа: согласованная цена, иначе бюджет."""
    amount = order.final_price if order.final_price is not None else order.budget
    if amount in (None, ''):
        return Decimal('0.00')
    return money(amount)


def order_active_hold(order):
    """Сколько заказчик сейчас держит в резерве по заказу."""
    from django.db import models as dj_models
    from apps.orders.models import Transaction, TransactionType

    rows = Transaction.objects.filter(
        order=order,
        user=order.client,
        type__in=[TransactionType.HOLD, TransactionType.RELEASE, TransactionType.REFUND],
    ).values('type').annotate(total=dj_models.Sum('amount'))
    totals = {row['type']: row['total'] for row in rows}
    return money(
        (totals.get(TransactionType.HOLD) or 0)
        - (totals.get(TransactionType.RELEASE) or 0)
        - (totals.get(TransactionType.REFUND) or 0)
    )


def order_remaining_payment(order):
    """Остаток до полной оплаты заказа.

    Ровно та величина, которой не хватает для приёмки работы: пока она
    больше нуля, заказ принять нельзя.
    """
    if not getattr(order, 'expert_id', None):
        return Decimal('0.00')
    amount = order_payment_amount(order)
    if amount <= 0:
        return Decimal('0.00')
    quote = order_quote(amount, client=order.client)
    required = money(quote['base_amount'] + quote['service_fee'])
    # Releasing escrow pays the author; it does not make the client unpaid again.
    from django.db.models import Sum
    from apps.orders.models import Transaction, TransactionType
    rows = Transaction.objects.filter(order=order, user=order.client,
        type__in=[TransactionType.HOLD, TransactionType.PURCHASE, TransactionType.REFUND],
    ).values('type').annotate(total=Sum('amount'))
    totals = {row['type']: row['total'] for row in rows}
    paid = money((totals.get(TransactionType.HOLD) or 0)
                 + (totals.get(TransactionType.PURCHASE) or 0)
                 - (totals.get(TransactionType.REFUND) or 0))
    return max(Decimal('0.00'), money(required - paid))


def withdrawal_quote(amount, role, user=None) -> dict:
    """Amount is what the user requests; fees are retained from that amount."""
    gross = money(amount)
    platform_rate = withdrawal_fee_percent(role, user)
    platform_fee = percent(gross, platform_rate)
    # Вывод — это перевод на карту, у него свой тариф, не равный ставке
    # приёма платежей.
    acquiring_fee = percent(gross, PAYOUT_ACQUIRING_FEE_PERCENT)
    net = money(gross - platform_fee - acquiring_fee)
    if net <= 0:
        raise ValueError('Сумма вывода после комиссий должна быть положительной')
    return {'gross': gross, 'platform_fee': platform_fee, 'acquiring_fee': acquiring_fee, 'net': net}


def order_paid_amount(order):
    from django.db.models import Sum
    from apps.orders.models import Transaction, TransactionType
    rows = Transaction.objects.filter(order=order, user_id=order.client_id,
        type__in=[TransactionType.HOLD, TransactionType.PURCHASE, TransactionType.REFUND],
    ).values('type').annotate(total=Sum('amount'))
    totals = {r['type']: r['total'] for r in rows}
    return max(Decimal('0.00'), money((totals.get(TransactionType.HOLD) or 0)
        + (totals.get(TransactionType.PURCHASE) or 0) - (totals.get(TransactionType.REFUND) or 0)))
