from decimal import Decimal
import uuid

from django.conf import settings as dj_settings

from django.utils import timezone
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.payments.models import Payment, PaymentMethod, PaymentStatus
from apps.payments.services import PaymentService
from apps.payments.providers.yookassa import ReceiptContactRequired

from .serializers import (
    TopupRequestSerializer, WalletBalanceSerializer,
    WalletStatsSerializer, WalletTransactionSerializer,
    WithdrawRequestSerializer,
)
from .models import WithdrawalRequest
from .policy import (
    money, percent, ACQUIRING_FEE_PERCENT, client_service_fee_percent, order_quote,
)
from .services import WalletService, InsufficientFunds
from apps.verification.services import VerificationRequired, ensure_can_withdraw

def _percent_label(value) -> str:
    """Процент для интерфейса: 25, 3.5, 10 — без хвостовых нулей.

    Общая ставка задаётся строкой, индивидуальная приходит из
    DecimalField с двумя знаками. Без выравнивания интерфейс показал бы
    одному клиенту «сбор 25%», а другому «сбор 10.00%».
    """
    text = '{:f}'.format(Decimal(str(value)))
    if '.' in text:
        text = text.rstrip('0').rstrip('.')
    return text or '0'


MIN_WITHDRAWAL = Decimal('100.00')
MAX_WITHDRAWAL = Decimal('500000.00')


def _sandbox_topup_allowed(user) -> bool:  # noqa: C901
    """Instant no-acquirer top-ups are allowed only when PAYMENTS_SANDBOX
    is enabled AND the account is staff or a @okoznaniy.test test user.
    This keeps sandbox credits out of reach of real end users."""
    if not getattr(dj_settings, 'PAYMENTS_SANDBOX', False):
        return False
    if getattr(user, 'is_staff', False):
        return True
    email = (getattr(user, 'email', '') or '').lower()
    return email.endswith('@okoznaniy.test')


class WalletViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    throttle_scope = 'wallet'

    @action(detail=False, methods=['get'])
    def me(self, request):
        data = WalletService.get_balance(request.user)
        return Response(WalletBalanceSerializer(data).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        data = WalletService.get_stats(request.user)
        return Response(WalletStatsSerializer(data).data)

    @action(detail=False, methods=['get'])
    def transactions(self, request):
        types = request.query_params.getlist('type')
        limit = int(request.query_params.get('limit') or 50)
        qs = WalletService.get_transactions(request.user, limit=limit, types=types or None)
        return Response(WalletTransactionSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def quote(self, request):
        """Разбивка суммы до оплаты: сколько спишется и сколько дойдёт.

        Единственный источник этих цифр для интерфейса. Раньше фронтенд
        считал сбор сам по зашитым процентам и расходился с сервером у
        клиентов с индивидуальной ставкой сервисного сбора.
        """
        raw = request.query_params.get('amount') or '0'
        try:
            amount = money(raw)
        except (ArithmeticError, TypeError, ValueError):
            return Response(
                {'detail': 'Некорректная сумма'}, status=status.HTTP_400_BAD_REQUEST,
            )
        if amount <= 0:
            return Response(
                {'detail': 'Некорректная сумма'}, status=status.HTTP_400_BAD_REQUEST,
            )

        if request.query_params.get('kind') == 'order':
            quote = order_quote(amount, client=request.user)
            return Response({
                'kind': 'order',
                'base_amount': str(quote['base_amount']),
                'service_fee': str(quote['service_fee']),
                'service_fee_percent': _percent_label(
                    client_service_fee_percent(request.user)
                ),
                'acquiring_fee': str(quote['acquiring_fee']),
                'acquiring_fee_percent': _percent_label(ACQUIRING_FEE_PERCENT),
                'total': str(quote['total']),
            })

        acquiring_fee = percent(amount, ACQUIRING_FEE_PERCENT)
        return Response({
            'kind': 'topup',
            'wallet_credit': str(amount),
            'acquiring_fee': str(acquiring_fee),
            'acquiring_fee_percent': _percent_label(ACQUIRING_FEE_PERCENT),
            'total': str(money(amount + acquiring_fee)),
        })

    @action(detail=False, methods=['post'])
    def topup(self, request):
        ser = TopupRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        amount: Decimal = ser.validated_data['amount']
        method = ser.validated_data['payment_method']
        idem_key = f'topup-{request.user.pk}-{amount}-{method}'
        from datetime import timedelta as _td
        idem_cutoff = timezone.now() - _td(seconds=60)
        existing = Payment.objects.filter(
            payment_id__startswith=f'topup-{request.user.pk}',
            status__in=[PaymentStatus.PENDING, PaymentStatus.COMPLETED],
            purpose=Payment.Purpose.TOPUP,
            user=request.user,
            created_at__gte=idem_cutoff,
        ).order_by('-created_at').first()
        if existing and money(existing.metadata.get('wallet_credit')) == amount and existing.payment_method == method:
            payment = existing
        else:
            acquiring_fee = percent(amount, ACQUIRING_FEE_PERCENT)
            payment = Payment.objects.create(
                amount=money(amount + acquiring_fee),
                payment_method=method,
                status=PaymentStatus.PENDING,
                purpose=Payment.Purpose.TOPUP,
                user=request.user,
                payment_id=f'topup-{request.user.pk}-{uuid.uuid4().hex}',
                metadata={'wallet_credit': str(amount), 'acquiring_fee': str(acquiring_fee)},
            )
        # Почту сохраняем и в платёж, и в профиль: чек нужен сейчас,
        # а профиль избавляет от повторного вопроса при следующей оплате.
        receipt_email = (ser.validated_data.get('receipt_email') or '').strip()
        if receipt_email:
            payment.metadata = {**(payment.metadata or {}), 'receipt_email': receipt_email}
            payment.save(update_fields=['metadata'])
            if not (request.user.email or '').strip():
                request.user.email = receipt_email
                request.user.save(update_fields=['email'])

        if _sandbox_topup_allowed(request.user):
            if payment.status != PaymentStatus.COMPLETED:
                payment.status = PaymentStatus.COMPLETED
                payment.paid_at = timezone.now()
                payment.save(update_fields=['status', 'paid_at'])
            bal = WalletService.get_balance(request.user)
            return Response({
                'payment_id': payment.payment_id,
                'amount': str(payment.amount),
                'wallet_credit': str(amount),
                'acquiring_fee': str(payment.metadata.get('acquiring_fee', '0.00')),
                'method': method,
                'sandbox': True,
                'status': 'completed',
                'payment_url': '/payment/result?payment=%s' % payment.payment_id,
                'balance': WalletBalanceSerializer(bal).data,
            })
        try:
            link = PaymentService.get_payment_link(payment)
        except ReceiptContactRequired as e:
            # Интерфейс по этому коду покажет поле почты и повторит оплату.
            payment.status = PaymentStatus.FAILED
            payment.save(update_fields=['status'])
            return Response(
                {'detail': str(e), 'code': 'receipt_email_required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:  # noqa: BLE001
            payment.status = PaymentStatus.FAILED
            payment.save(update_fields=['status'])
            return Response({'detail': str(e)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({
            'payment_id': payment.payment_id,
            'amount': str(payment.amount),
            'wallet_credit': str(amount),
            'acquiring_fee': str(payment.metadata.get('acquiring_fee', '0.00')),
            'method': method,
            'payment_url': link,
        })


    @action(detail=False, methods=['post'])
    def withdraw(self, request):
        ser = WithdrawRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        amount = ser.validated_data['amount']
        if amount < MIN_WITHDRAWAL:
            return Response(
                {'detail': f'Минимальная сумма вывода: {MIN_WITHDRAWAL} ₽'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if amount > MAX_WITHDRAWAL:
            return Response(
                {'detail': f'Максимальная сумма вывода за раз: {MAX_WITHDRAWAL} ₽'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from django.db.models import Sum as QSum
        from django.db.models import Q
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        daily_withdrawn = WithdrawalRequest.objects.filter(
            user=request.user,
            created_at__gte=today_start,
            status__in=[WithdrawalRequest.Status.PENDING, WithdrawalRequest.Status.PAID],
        ).aggregate(total=QSum('gross_amount'))['total'] or Decimal('0')
        if daily_withdrawn + amount > MAX_WITHDRAWAL:
            return Response(
                {'detail': f'Дневной лимит вывода превышен. Осталось: {MAX_WITHDRAWAL - daily_withdrawn} ₽'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            ensure_can_withdraw(request.user)
        except VerificationRequired as e:
            return Response(
                {'detail': e.message, 'code': e.code},
                status=status.HTTP_403_FORBIDDEN,
            )
        digits = ser.validated_data['card_number']
        masked = '**** **** **** ' + digits[-4:]
        try:
            with transaction.atomic():
                withdrawal = WalletService.withdraw(
                    request.user, amount,
                    description=f'Вывод на карту {masked}', return_details=True,
                )
                wr = WithdrawalRequest.objects.create(
                    user=request.user, amount=withdrawal['net'], gross_amount=withdrawal['gross'],
                    platform_fee=withdrawal['platform_fee'], acquiring_fee=withdrawal['acquiring_fee'], card_number=masked,
                    status=WithdrawalRequest.Status.PENDING, transaction=withdrawal['transaction'],
                )
        except InsufficientFunds as e:
            return Response({'detail': 'Недостаточно доступных средств'},
                            status=status.HTTP_400_BAD_REQUEST)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        data = WalletService.get_balance(request.user)
        return Response({
            'withdrawal_id': wr.id,
            'status': wr.status,
            'amount': str(withdrawal['net']),
            'gross_amount': str(withdrawal['gross']),
            'platform_fee': str(withdrawal['platform_fee']),
            'acquiring_fee': str(withdrawal['acquiring_fee']),
            'card': masked,
            'balance': WalletBalanceSerializer(data).data,
        }, status=status.HTTP_201_CREATED)
