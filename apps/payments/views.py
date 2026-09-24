import logging
from django.db import transaction
from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from .models import Payment, PaymentMethod
from .serializers import PaymentSerializer
from .services import PaymentService
from .providers.yookassa import ReceiptContactRequired
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
        from django.db.models import Q
        return self.queryset.filter(
            Q(order__client=user) | Q(user=user)
        ).distinct().select_related('order')

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

        if payment_method not in PaymentService._NORMALIZE_METHOD:
            return Response(
                {'error': 'Неподдерживаемый метод оплаты'},
                status=status.HTTP_400_BAD_REQUEST
            )

        receipt_email = (request.data.get('receipt_email') or '').strip()
        try:
            with transaction.atomic():
                payment = PaymentService.create_payment(order, payment_method)
                if receipt_email:
                    # См. пополнение кошелька: чек сейчас, профиль — на будущее.
                    payment.metadata = {
                        **(payment.metadata or {}), 'receipt_email': receipt_email,
                    }
                    payment.save(update_fields=['metadata'])
                    if not (request.user.email or '').strip():
                        request.user.email = receipt_email
                        request.user.save(update_fields=['email'])
            payment_link = PaymentService.get_payment_link(payment)
        except ReceiptContactRequired as e:
            # Интерфейс по этому коду покажет поле почты и повторит оплату.
            return Response(
                {'error': str(e), 'detail': str(e), 'code': 'receipt_email_required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
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

    @action(detail=False, methods=['get'], url_path='status')
    def payment_status(self, request):
        """Статус платежа по нашему payment_id.

        Нужен странице возврата с платёжной формы: плательщик приходит
        обратно раньше, чем уведомление от банка, и должен видеть, чем
        всё закончилось. Выборка идёт через get_queryset, поэтому чужой
        платёж по этому адресу не посмотреть.
        """
        payment_id = request.query_params.get('payment')
        if not payment_id:
            return Response(
                {'error': 'Не указан payment'}, status=status.HTTP_400_BAD_REQUEST,
            )
        payment = self.get_queryset().filter(payment_id=payment_id).first()
        if payment is None:
            return Response(
                {'error': 'Платёж не найден'}, status=status.HTTP_404_NOT_FOUND,
            )
        return Response({
            'payment_id': payment.payment_id,
            'status': payment.status,
            'amount': str(payment.amount),
            'order_id': payment.order_id,
            'purpose': payment.purpose,
            'paid_at': payment.paid_at,
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

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny])
    def process_callback(self, request, pk=None):
        payment = get_object_or_404(Payment, pk=pk)

        rail = PaymentService._NORMALIZE_METHOD.get(payment.payment_method)
        if rail == PaymentMethod.CARD:
            from .providers.alfabank import AlfaBankClient
            if not AlfaBankClient().verify_callback_signature(request.data):
                logger.warning("Invalid AlfaBank callback signature for payment %s", pk)
                return Response({'status': 'invalid_signature'}, status=status.HTTP_403_FORBIDDEN)
        elif rail == PaymentMethod.SBP:
            from .providers.sbp import SBPClient
            if not SBPClient().verify_callback_signature(request.data):
                logger.warning("Invalid SBP callback signature for payment %s", pk)
                return Response({'status': 'invalid_signature'}, status=status.HTTP_403_FORBIDDEN)

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


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def payment_methods(request):
    """Способы оплаты, доступные прямо сейчас.

    Список собирается по настроенным эквайерам, поэтому интерфейс не
    предлагает то, что заведомо не проведётся.
    """
    return Response(PaymentService.available_methods())


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def tbank_callback(request):
    """Signed T-Bank notification endpoint; returns the acknowledgement T-Bank expects."""
    order_id = request.data.get('OrderId')
    if not order_id:
        return Response('ERROR', status=status.HTTP_400_BAD_REQUEST)
    try:
        success = PaymentService.process_payment_callback(order_id, request.data)
    except Exception:
        logger.exception('T-Bank callback failed for OrderId=%s', order_id)
        return Response('ERROR', status=status.HTTP_400_BAD_REQUEST)
    return Response('OK' if success else 'ERROR', status=status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST)


@api_view(['POST', 'GET'])
@permission_classes([permissions.AllowAny])
def uralsib_callback(request):
    """Уведомление о платеже от шлюза RBS Банка Уралсиб.

    RBS шлёт колбэк как GET с параметрами в query string либо как POST.
    Отвечаем 200 в любом случае: шлюз повторяет доставку при ошибке,
    а решение об оплате принимается по запросу статуса, не по колбэку.
    """
    from .services import PaymentService

    data = request.data if request.method == 'POST' and request.data else request.query_params
    data = {k: v for k, v in data.items()}
    logger.info('Уралсиб RBS колбэк: %s', {k: v for k, v in data.items() if k != 'checksum'})

    try:
        rbs_client = PaymentService._card_rbs_client()
        payment = rbs_client.process_callback(data) if rbs_client else None
    except Exception:  # noqa: BLE001
        logger.exception('Уралсиб RBS: ошибка обработки колбэка')
        return HttpResponse('ERROR', status=200)

    if payment is None:
        return HttpResponse('OK', status=200)

    with transaction.atomic():
        PaymentService.process_payment_callback(payment.payment_id, data)
    return HttpResponse('OK', status=200)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def yookassa_callback(request):
    """Уведомление о платеже от ЮKassa.

    Подписи у уведомления нет, поэтому проверяем адрес отправителя, а
    решение об оплате принимает провайдер — по ответу API, а не по телу
    уведомления.

    Коды ответа выбраны под поведение ЮKassa: всё, что не 2xx, она
    повторит в течение суток. Поэтому 500 отдаём только при сбое на нашей
    стороне, который имеет смысл повторить, а на чужой или неактуальный
    платёж отвечаем 200, чтобы не собирать бесконечные ретраи.
    """
    from .providers.yookassa import YooKassaClient, callback_client_ip, is_trusted_ip

    sender_ip = callback_client_ip(request)
    if not is_trusted_ip(sender_ip):
        logger.warning('ЮKassa: уведомление с недоверенного адреса %s', sender_ip)
        return HttpResponse('FORBIDDEN', status=status.HTTP_403_FORBIDDEN)

    data = request.data if isinstance(request.data, dict) else {}
    logger.info(
        'ЮKassa колбэк: event=%s object=%s',
        data.get('event'), (data.get('object') or {}).get('id'),
    )

    try:
        payment = YooKassaClient().process_callback(data)
    except Exception:  # noqa: BLE001
        logger.exception('ЮKassa: ошибка обработки уведомления')
        # Просим повторить: возможно, шлюз был недоступен на запросе статуса.
        return HttpResponse('ERROR', status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    if payment is None:
        return HttpResponse('OK', status=status.HTTP_200_OK)

    try:
        with transaction.atomic():
            PaymentService.process_payment_callback(payment.payment_id, data)
    except Exception:  # noqa: BLE001
        logger.exception('ЮKassa: не удалось провести платёж %s', payment.payment_id)
        return HttpResponse('ERROR', status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return HttpResponse('OK', status=status.HTTP_200_OK)
