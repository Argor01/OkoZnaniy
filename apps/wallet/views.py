from decimal import Decimal

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.payments.models import Payment, PaymentMethod, PaymentStatus
from apps.payments.services import PaymentService

from .serializers import (
    TopupRequestSerializer, WalletBalanceSerializer,
    WalletStatsSerializer, WalletTransactionSerializer,
    WithdrawRequestSerializer,
)
from .models import WithdrawalRequest
from .services import WalletService, InsufficientFunds


class WalletViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

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

    @action(detail=False, methods=['post'])
    def topup(self, request):
        ser = TopupRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        amount: Decimal = ser.validated_data['amount']
        method = ser.validated_data['payment_method']
        payment = Payment.objects.create(
            amount=amount,
            payment_method=method,
            status=PaymentStatus.PENDING,
            purpose=Payment.Purpose.TOPUP,
            user=request.user,
            payment_id=f'topup-{request.user.pk}-{int(timezone.now().timestamp())}',
        )
        try:
            link = PaymentService.get_payment_link(payment)
        except Exception as e:  # noqa: BLE001
            payment.status = PaymentStatus.FAILED
            payment.save(update_fields=['status'])
            return Response({'detail': str(e)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({
            'payment_id': payment.payment_id,
            'amount': str(amount),
            'method': method,
            'payment_url': link,
        })


    @action(detail=False, methods=['post'])
    def withdraw(self, request):
        ser = WithdrawRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        amount = ser.validated_data['amount']
        digits = ser.validated_data['card_number']
        masked = '**** **** **** ' + digits[-4:]
        try:
            tx = WalletService.withdraw(
                request.user, amount,
                description=f'Вывод на карту {masked}',
            )
        except InsufficientFunds as e:
            return Response({'detail': 'Недостаточно доступных средств'},
                            status=status.HTTP_400_BAD_REQUEST)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        wr = WithdrawalRequest.objects.create(
            user=request.user, amount=amount, card_number=masked,
            status=WithdrawalRequest.Status.PENDING, transaction=tx,
        )
        data = WalletService.get_balance(request.user)
        return Response({
            'withdrawal_id': wr.id,
            'status': wr.status,
            'amount': str(amount),
            'card': masked,
            'balance': WalletBalanceSerializer(data).data,
        }, status=status.HTTP_201_CREATED)
