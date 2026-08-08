"""
Centralized wallet/balance service.

All movements of money inside the platform go through here so we have one
auditable code path. We reuse the existing ``User.balance`` /
``User.frozen_balance`` fields and the ``orders.Transaction`` model
(extended with new types and made order-nullable) — no duplicate ledger.

Concurrency model: each balance-changing call wraps a row-level
``select_for_update`` on the affected user(s) inside an atomic block.
That gives us serialisable behaviour for hot users even under load.

All API is intentionally tiny — call sites read like accounting entries.
"""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import Iterable, Optional

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone
from datetime import timedelta
from .policy import (EXPERT_WITHDRAWAL_FEE_PERCENT, ACQUIRING_FEE_PERCENT, REFERRAL_LIFETIME_DAYS, money, percent, withdrawal_quote)

from apps.orders.models import Transaction, TransactionType

log = logging.getLogger(__name__)
User = get_user_model()

ZERO = Decimal('0.00')

# Default platform commission on expert payouts (orders + shop sales).
DEFAULT_COMMISSION_PERCENT = Decimal(
    str(getattr(settings, 'PLATFORM_COMMISSION_PERCENT', 0))
)

# Username for the synthetic system account that collects platform fees.
SYSTEM_COMMISSION_USERNAME = '_system_commission'


# ----------------------------- helpers -----------------------------

def _q(amount) -> Decimal:
    """Coerce to Decimal with 2 decimals."""
    if not isinstance(amount, Decimal):
        amount = Decimal(str(amount))
    return amount.quantize(Decimal('0.01'))


def _lock_user(user_id: int) -> User:
    return User.objects.select_for_update().get(pk=user_id)


def get_system_account() -> User:
    """Lazy-create the system commission account."""
    user, _ = User.objects.get_or_create(
        username=SYSTEM_COMMISSION_USERNAME,
        defaults={
            'first_name': 'Система',
            'last_name': 'Комиссия',
            'email': 'system@okoznaniy.local',
            'is_active': False,  # never logs in
        },
    )
    return user


class InsufficientFunds(ValueError):
    pass


class WalletService:
    """Atomic balance operations."""

    # --------------- queries ---------------
    @staticmethod
    def get_balance(user) -> dict:
        u = User.objects.only('balance', 'frozen_balance', 'pending_balance').get(pk=user.pk)
        balance = u.balance or ZERO
        frozen = u.frozen_balance or ZERO
        pending = u.pending_balance or ZERO
        return {
            'balance': balance,
            'frozen_balance': frozen,
            'pending_balance': pending,
            'available_balance': balance - frozen,
        }

    @staticmethod
    def get_transactions(user, *, limit: int = 100, types: Optional[Iterable[str]] = None):
        qs = Transaction.objects.filter(user=user).order_by('-timestamp')
        if types:
            qs = qs.filter(type__in=list(types))
        return qs[:limit]

    @staticmethod
    def get_stats(user) -> dict:
        qs = Transaction.objects.filter(user=user)
        total_topup = qs.filter(type=TransactionType.TOPUP).aggregate(s=Sum('amount'))['s'] or ZERO
        total_spent = qs.filter(type__in=[
            TransactionType.PURCHASE,
            TransactionType.RELEASE,
        ]).aggregate(s=Sum('amount'))['s'] or ZERO
        total_earned = qs.filter(type=TransactionType.PAYOUT).aggregate(s=Sum('amount'))['s'] or ZERO
        return {
            'total_topup': total_topup,
            'total_spent': total_spent,
            'total_earned': total_earned,
        }

    # --------------- core operations ---------------

    @staticmethod
    @transaction.atomic
    def topup(user, amount, *, payment=None, order=None, description: str = '') -> Transaction:
        """Credit user's balance after a successful external payment."""
        amount = _q(amount)
        if amount <= 0:
            raise ValueError('Top-up amount must be positive')
        u = _lock_user(user.pk)
        u.balance = (u.balance or ZERO) + amount
        u.save(update_fields=['balance'])
        return Transaction.objects.create(
            user=u, amount=amount, type=TransactionType.TOPUP, order=order,
            description=description or 'Пополнение баланса',
            payment=payment, balance_after=u.balance,
        )

    @staticmethod
    @transaction.atomic
    def hold(user, amount, *, order=None, description: str = '') -> Transaction:
        """Freeze ``amount`` on the client's balance (escrow for an order)."""
        amount = _q(amount)
        if amount <= 0:
            raise ValueError('Hold amount must be positive')
        u = _lock_user(user.pk)
        available = (u.balance or ZERO) - (u.frozen_balance or ZERO)
        if available < amount:
            raise InsufficientFunds(
                f'Not enough available funds: need {amount}, have {available}'
            )
        u.frozen_balance = (u.frozen_balance or ZERO) + amount
        u.save(update_fields=['frozen_balance'])
        return Transaction.objects.create(
            user=u, amount=amount, type=TransactionType.HOLD, order=order,
            description=description or (f'Заморозка по заказу #{order.id}' if order else 'Заморозка средств'),
            balance_after=u.balance,
        )

    @staticmethod
    @transaction.atomic
    def refund_hold(user, amount, *, order=None, description: str = '') -> Transaction:
        """Unfreeze and keep on the client's available balance."""
        amount = _q(amount)
        if amount <= 0:
            raise ValueError('Refund amount must be positive')
        u = _lock_user(user.pk)
        u.frozen_balance = max(ZERO, (u.frozen_balance or ZERO) - amount)
        u.save(update_fields=['frozen_balance'])
        return Transaction.objects.create(
            user=u, amount=amount, type=TransactionType.REFUND, order=order,
            description=description or (f'Возврат по заказу #{order.id}' if order else 'Возврат средств'),
            balance_after=u.balance,
        )

    @staticmethod
    @transaction.atomic
    def release_to_expert(
        *, client, expert, amount, order=None,
        commission_percent: Optional[Decimal] = None,
        description: str = '',
    ) -> dict:
        """Release a held amount: client.frozen -- amount; client.balance -- amount;
        expert.balance += (amount - fee); system.balance += fee."""
        amount = _q(amount)
        if amount <= 0:
            raise ValueError('Release amount must be positive')
        if commission_percent is None:
            commission_percent = DEFAULT_COMMISSION_PERCENT
        fee = _q(amount * commission_percent / Decimal(100))
        payout = _q(amount - fee)

        sys_user = get_system_account()

        # Lock all three accounts in a stable order to avoid deadlocks.
        ids = sorted({client.pk, expert.pk, sys_user.pk})
        locked = {u.pk: u for u in User.objects.select_for_update().filter(pk__in=ids)}
        c = locked[client.pk]
        e = locked[expert.pk]
        s = locked[sys_user.pk]

        if (c.frozen_balance or ZERO) < amount:
            raise InsufficientFunds('Held amount is less than release amount')
        if (c.balance or ZERO) < amount:
            raise InsufficientFunds('Client balance is less than release amount')

        c.frozen_balance = (c.frozen_balance or ZERO) - amount
        c.balance = (c.balance or ZERO) - amount
        e.balance = (e.balance or ZERO) + payout
        s.balance = (s.balance or ZERO) + fee
        c.save(update_fields=['frozen_balance', 'balance'])
        e.save(update_fields=['balance'])
        s.save(update_fields=['balance'])

        t_release = Transaction.objects.create(
            user=c, amount=amount, type=TransactionType.RELEASE, order=order,
            description=description or f'Списание по заказу #{order.id}' if order else 'Списание',
            balance_after=c.balance,
        )
        Transaction.objects.create(
            user=e, amount=payout, type=TransactionType.PAYOUT, order=order,
            description=f'Выплата по заказу #{order.id}' if order else 'Выплата',
            balance_after=e.balance,
        )
        if fee > 0:
            Transaction.objects.create(
                user=s, amount=fee, type=TransactionType.COMMISSION, order=order,
                description=f'Комиссия платформы по заказу #{order.id}' if order else 'Комиссия',
                balance_after=s.balance,
            )
        return {
            'release_tx': t_release,
            'payout': payout,
            'fee': fee,
            'commission_percent': commission_percent,
        }

    @staticmethod
    @transaction.atomic
    def direct_transfer(
        *, payer, recipient, amount,
        commission_percent: Optional[Decimal] = None,
        description: str = '',
        order=None,
        purpose: str = TransactionType.PURCHASE,
    ) -> dict:
        """Spend from payer.balance immediately (no escrow) and credit recipient
        minus platform fee. Used for shop purchases of ready works."""
        amount = _q(amount)
        if amount <= 0:
            raise ValueError('Transfer amount must be positive')
        if commission_percent is None:
            commission_percent = DEFAULT_COMMISSION_PERCENT
        fee = _q(amount * commission_percent / Decimal(100))
        payout = _q(amount - fee)
        sys_user = get_system_account()

        ids = sorted({payer.pk, recipient.pk, sys_user.pk})
        locked = {u.pk: u for u in User.objects.select_for_update().filter(pk__in=ids)}
        p = locked[payer.pk]
        r = locked[recipient.pk]
        s = locked[sys_user.pk]

        available = (p.balance or ZERO) - (p.frozen_balance or ZERO)
        if available < amount:
            raise InsufficientFunds(f'Not enough funds: need {amount}, have {available}')
        p.balance = (p.balance or ZERO) - amount
        r.balance = (r.balance or ZERO) + payout
        s.balance = (s.balance or ZERO) + fee
        p.save(update_fields=['balance'])
        r.save(update_fields=['balance'])
        s.save(update_fields=['balance'])
        t = Transaction.objects.create(
            user=p, amount=amount, type=purpose, order=order,
            description=description or 'Покупка',
            balance_after=p.balance,
        )
        Transaction.objects.create(
            user=r, amount=payout, type=TransactionType.PAYOUT, order=order,
            description=f'Продажа: {description}' if description else 'Продажа',
            balance_after=r.balance,
        )
        if fee > 0:
            Transaction.objects.create(
                user=s, amount=fee, type=TransactionType.COMMISSION, order=order,
                description=description or 'Комиссия платформы',
                balance_after=s.balance,
            )
        return {'transaction': t, 'payout': payout, 'fee': fee}

    @staticmethod
    @transaction.atomic
    def withdraw(user, amount, *, description: str = 'Вывод средств', return_details: bool = False):
        """Debit gross requested amount and return transparent fee breakdown."""
        quote = withdrawal_quote(amount, getattr(user, 'role', 'client'))
        u = _lock_user(user.pk)
        available = (u.balance or ZERO) - (u.frozen_balance or ZERO)
        if available < quote['gross']:
            raise InsufficientFunds(f"Not enough funds: need {quote['gross']}, have {available}")
        u.balance = (u.balance or ZERO) - quote['gross']
        u.save(update_fields=['balance'])
        tx = Transaction.objects.create(
            user=u, amount=quote['gross'], type=TransactionType.WITHDRAWAL,
            description=(f"{description}; к выплате {quote['net']} ₽, комиссия платформы "
                         f"{quote['platform_fee']} ₽, эквайринг {quote['acquiring_fee']} ₽"),
            balance_after=u.balance,
        )
        if quote['platform_fee'] > 0:
            system = _lock_user(get_system_account().pk)
            system.balance = (system.balance or ZERO) + quote['platform_fee']
            system.save(update_fields=['balance'])
            Transaction.objects.create(
                user=system, amount=quote['platform_fee'], type=TransactionType.COMMISSION,
                description=f'Комиссия с вывода пользователя #{u.pk}', balance_after=system.balance,
            )
        details = {'transaction': tx, **quote}
        return details if return_details else tx

    @staticmethod
    @transaction.atomic
    def release_order_payment(*, client, expert, base_amount, service_fee, order=None, description='', source_key='') -> dict:
        """Release escrow exactly per TZ: full base to author, 25% to partner or directors."""
        base_amount, service_fee = money(base_amount), money(service_fee)
        total = money(base_amount + service_fee)
        linked_at = getattr(client, 'partner_linked_at', None) or getattr(client, 'date_joined', None)
        partner = getattr(client, 'partner', None)
        if partner and linked_at and linked_at < timezone.now() - timedelta(days=REFERRAL_LIFETIME_DAYS):
            partner = None
        system = get_system_account()
        recipient = partner or system
        ids = sorted({client.pk, expert.pk, recipient.pk})
        locked = {u.pk: u for u in User.objects.select_for_update().filter(pk__in=ids)}
        c, e, r = locked[client.pk], locked[expert.pk], locked[recipient.pk]
        if (c.frozen_balance or ZERO) < total or (c.balance or ZERO) < total:
            raise InsufficientFunds('Held amount is less than required order allocation')
        c.frozen_balance -= total
        c.balance -= total
        e.balance = (e.balance or ZERO) + base_amount
        r.balance = (r.balance or ZERO) + service_fee
        c.save(update_fields=['frozen_balance', 'balance'])
        e.save(update_fields=['balance'])
        r.save(update_fields=['balance'])
        release = Transaction.objects.create(user=c, amount=total, type=TransactionType.RELEASE, order=order, description=description or 'Списание резерва', balance_after=c.balance)
        Transaction.objects.create(user=e, amount=base_amount, type=TransactionType.PAYOUT, order=order, description=description or 'Выплата автору', balance_after=e.balance)
        Transaction.objects.create(user=r, amount=service_fee, type=TransactionType.PARTNER_PAYOUT if partner else TransactionType.COMMISSION, order=order, description='Реферальная комиссия 25%' if partner else 'Комиссия директорам 25%', balance_after=r.balance)
        if partner:
            from apps.users.models import PartnerEarning
            earning, _ = PartnerEarning.objects.get_or_create(
                partner=r, referral=c, order=order, earning_type='order', source_key=source_key or (f'order:{order.pk}' if order else ''),
                defaults={'amount': service_fee, 'commission_rate': 25, 'source_amount': base_amount, 'is_paid': True},
            )
            if not earning.is_paid:
                earning.is_paid = True
                earning.save(update_fields=['is_paid'])
        return {'release_tx': release, 'payout': base_amount, 'service_fee': service_fee, 'partner_id': partner.pk if partner else None}

    @staticmethod
    @transaction.atomic
    def payout_to_partner(partner, earning_ids: list[int]) -> dict:
        """Transfer unpaid partner earnings to the partner's wallet balance.

        Called by an admin to actually credit money that was previously sitting
        in ``pending_balance``.  Each earning is marked ``is_paid=True`` and
        the partner's ``balance`` is increased by the total.
        """
        from apps.users.models import PartnerEarning

        if not earning_ids:
            raise ValueError('No earning IDs provided')

        u = _lock_user(partner.pk)

        earnings = list(
            PartnerEarning.objects.select_for_update()
            .filter(pk__in=earning_ids, partner=u, is_paid=False)
        )
        if len(earnings) != len(earning_ids):
            found_ids = {e.pk for e in earnings}
            missing = set(earning_ids) - found_ids
            raise ValueError(
                f'Earnings not found or already paid: {missing}'
            )

        total = _q(sum(e.amount for e in earnings))

        u.balance = (u.balance or ZERO) + total
        u.pending_balance = max(ZERO, (u.pending_balance or ZERO) - total)
        u.save(update_fields=['balance', 'pending_balance'])

        for earning in earnings:
            earning.is_paid = True
            earning.save(update_fields=['is_paid'])

        tx = Transaction.objects.create(
            user=u,
            amount=total,
            type=TransactionType.PARTNER_PAYOUT,
            description=f'Выплата начислений ({len(earnings)} шт.)',
            balance_after=u.balance,
        )

        return {
            'transaction': tx,
            'amount': total,
            'earnings_count': len(earnings),
        }
