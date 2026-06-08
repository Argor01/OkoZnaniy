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

from apps.orders.models import Transaction, TransactionType

log = logging.getLogger(__name__)
User = get_user_model()

ZERO = Decimal('0.00')

# Default platform commission on expert payouts (orders + shop sales).
DEFAULT_COMMISSION_PERCENT = Decimal(
    str(getattr(settings, 'PLATFORM_COMMISSION_PERCENT', 15))
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
        u = User.objects.only('balance', 'frozen_balance').get(pk=user.pk)
        balance = u.balance or ZERO
        frozen = u.frozen_balance or ZERO
        return {
            'balance': balance,
            'frozen_balance': frozen,
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
            TransactionType.HOLD,
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
    def topup(user, amount, *, payment=None, description: str = '') -> Transaction:
        """Credit user's balance after a successful external payment."""
        amount = _q(amount)
        if amount <= 0:
            raise ValueError('Top-up amount must be positive')
        u = _lock_user(user.pk)
        u.balance = (u.balance or ZERO) + amount
        u.save(update_fields=['balance'])
        return Transaction.objects.create(
            user=u, amount=amount, type=TransactionType.TOPUP,
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
            user=p, amount=amount, type=purpose,
            description=description or 'Покупка',
            balance_after=p.balance,
        )
        Transaction.objects.create(
            user=r, amount=payout, type=TransactionType.PAYOUT,
            description=f'Продажа: {description}' if description else 'Продажа',
            balance_after=r.balance,
        )
        if fee > 0:
            Transaction.objects.create(
                user=s, amount=fee, type=TransactionType.COMMISSION,
                description=description or 'Комиссия платформы',
                balance_after=s.balance,
            )
        return {'transaction': t, 'payout': payout, 'fee': fee}

    @staticmethod
    @transaction.atomic
    def withdraw(user, amount, *, description: str = 'Вывод средств') -> Transaction:
        """Expert withdraws to their card (we just debit and record; the actual
        bank transfer is handled out of band by finance ops)."""
        amount = _q(amount)
        if amount <= 0:
            raise ValueError('Withdraw amount must be positive')
        u = _lock_user(user.pk)
        available = (u.balance or ZERO) - (u.frozen_balance or ZERO)
        if available < amount:
            raise InsufficientFunds(f'Not enough funds: need {amount}, have {available}')
        u.balance = (u.balance or ZERO) - amount
        u.save(update_fields=['balance'])
        return Transaction.objects.create(
            user=u, amount=amount, type=TransactionType.WITHDRAWAL,
            description=description, balance_after=u.balance,
        )
