import logging
from django.db import transaction
from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from .models import Payment, PaymentMethod
from .serializers import PaymentSerializer
from .services import PaymentService
try:
    from .utils import generate_qr_code
except ImportError:
    def generate_qr_code(payment):
        raise NotImplementedError("QR code generation not configured")
from apps.orders.models import Order

logger = logging.getLogger('oko.payments')


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return self.queryset.select_related('order', 'order__client')
        return self.queryset.filter(order__client=user).select_related('order')

    @action(detail=False, methods=['post'])
    def create_payment(self, request):
        order_id = request.data.get('order_id')
        payment_method = request.data.get('payment_method')

        if not order_id or not payment_method:
            return Response(
                {'error': 'Необходимо указать order_id и payment_method'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            order = Order.objects.get(id=order_id, client=request.user)
        except Order.DoesNotExist:
            return Response(
                {'error': 'Заказ не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        if payment_method not in PaymentMethod.values:
            return Response(
                {'error': 'Неподдерживаемый метод оплаты'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                payment = PaymentService.create_payment(order, payment_method)
            payment_link = PaymentService.get_payment_link(payment)
        except Exception as e:
            logger.error("Payment creation failed for order %s: %s", order_id, e, exc_info=True)
            return Response(
                {'error': 'Ошибка создания платежа. Попробуйте снова.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            'payment': PaymentSerializer(payment).data,
            'payment_link': payment_link
        })

    @action(detail=True, methods=['get'])
    def qr_code(self, request, pk=None):
        payment = self.get_object()
        try:
            qr_code = generate_qr_code(payment)
            return HttpResponse(qr_code, content_type='image/png')
        except Exception as e:
            logger.error("QR code generation failed for payment %s: %s", pk, e, exc_info=True)
            return Response(
                {'error': 'Ошибка генерации QR-кода'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def process_callback(self, request, pk=None):
        payment = self.get_object()
        try:
            with transaction.atomic():
                success = PaymentService.process_payment_callback(
                    payment.payment_id,
                    request.data
                )
        except Exception as e:
            logger.error("Payment callback failed for %s: %s", pk, e, exc_info=True)
            return Response({'status': 'failed'}, status=status.HTTP_400_BAD_REQUEST)

        if success:
            return Response({'status': 'success'})
        return Response(
            {'status': 'failed'},
            status=status.HTTP_400_BAD_REQUEST
        )
