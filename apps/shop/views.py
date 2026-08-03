import mimetypes
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Avg, Count, Exists, OuterRef, Q
from django.http import FileResponse
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.chat.services import ensure_order_chat_started
from apps.orders.models import Order, TransactionType
from apps.wallet.services import InsufficientFunds, WalletService
from .models import FavoriteWork, Purchase, ReadyWork, ReadyWorkFile
from .serializers import CreateReadyWorkSerializer, PurchaseSerializer, ReadyWorkSerializer


class IsExpertOrStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        role = getattr(user, 'role', None)
        return bool(user and user.is_authenticated and (user.is_staff or role == 'expert'))


class ReadyWorkViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = ReadyWork.objects.filter(
            is_active=True,
            moderation_status=ReadyWork.ModerationStatus.APPROVED,
        ).select_related('subject', 'work_type', 'author').order_by('-created_at')
        user = self.request.user

        if user.is_authenticated:
            queryset = queryset.annotate(
                is_favorite=Exists(FavoriteWork.objects.filter(user=user, work=OuterRef('pk')))
            )

        is_favorite_filter = self.request.query_params.get('is_favorite')
        if is_favorite_filter == 'true' and user.is_authenticated:
            queryset = queryset.filter(is_favorite=True)

        subject = self.request.query_params.get('subject')
        if subject:
            queryset = queryset.filter(subject_id=subject)

        work_type = self.request.query_params.get('work_type')
        if work_type:
            queryset = queryset.filter(work_type_id=work_type)

        author = self.request.query_params.get('author')
        if author:
            queryset = queryset.filter(author_id=author)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(description__icontains=search))

        queryset = queryset.annotate(
            rating_avg=Avg('purchase__rating'),
            rating_count=Count('purchase__rating'),
            purchase_count=Count('purchase', distinct=True),
        )

        return queryset.select_related('subject', 'work_type', 'author').prefetch_related('files')

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateReadyWorkSerializer
        return ReadyWorkSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        import logging

        logger = logging.getLogger(__name__)
        logger.info('[ReadyWorkViewSet.create] Data keys: %s, FILES keys: %s', list(request.data.keys()), list(request.FILES.keys()))

        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.warning('[ReadyWorkViewSet.create] Validation errors: %s', serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        work_files = request.FILES.getlist('work_files')
        if work_files:
            max_files = getattr(settings, 'MAX_READY_WORK_FILES', 5)
            if len(work_files) > max_files:
                return Response({'detail': f'Максимум файлов на работу: {max_files}'}, status=status.HTTP_400_BAD_REQUEST)

            allowed_extensions = getattr(settings, 'ALLOWED_EXTENSIONS', [])
            max_size = getattr(settings, 'MAX_UPLOAD_SIZE', 50 * 1024 * 1024)
            for uploaded_file in work_files:
                ext = (uploaded_file.name.split('.')[-1].lower() if '.' in uploaded_file.name else '') or ''
                if allowed_extensions and ext not in allowed_extensions:
                    return Response(
                        {'detail': f'Недопустимый тип файла. Разрешены: {", ".join(allowed_extensions)}'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if uploaded_file.size > max_size:
                    return Response(
                        {'detail': f'Размер файла не должен превышать {max_size // (1024 * 1024)} МБ.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        if work_files:
            serializer.validated_data['work_files'] = work_files

        work = serializer.save(author=request.user)
        response_serializer = ReadyWorkSerializer(work, context={'request': request})
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=['get'])
    def my_works(self, request):
        works = ReadyWork.objects.filter(author=request.user).select_related('subject', 'work_type')
        serializer = self.get_serializer(works, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def toggle_favorite(self, request, pk=None):
        work = self.get_object()
        favorite, created = FavoriteWork.objects.get_or_create(user=request.user, work=work)

        if not created:
            favorite.delete()
            return Response({'status': 'removed', 'is_favorite': False})

        return Response({'status': 'added', 'is_favorite': True})

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def purchase(self, request, pk=None):
        work = self.get_object()

        if work.author == request.user:
            return Response({'error': 'Нельзя купить собственную работу'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        transfer_deadline = now + timedelta(days=max(work.execution_days, 1))
        order = Order.objects.create(
            client=request.user,
            expert=work.author,
            subject=work.subject,
            work_type=work.work_type,
            title=work.title,
            description=work.description,
            deadline=transfer_deadline,
            budget=work.price,
            original_price=work.price,
            final_price=work.price,
            status=Order.READY_WORK_TRANSFER,
            transfer_started_at=now,
            transfer_deadline=transfer_deadline,
            is_ready_work_purchase=True,
        )
        try:
            # Деньги сразу «оплачены», но лежат в эскроу до передачи работы.
            # Если заказ отменят — вернём покупателю через WalletService.refund_hold.
            WalletService.hold(
                request.user,
                work.price,
                order=order,
                description=f'Резерв на покупку готовой работы "{work.title}"',
            )
        except InsufficientFunds:
            order.delete()
            return Response(
                {'detail': 'Недостаточно средств на кошельке для покупки готовой работы.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ensure_order_chat_started(
            order,
            sender=request.user,
            text=f'Создан заказ по готовой работе "{work.title}"',
        )

        purchase = Purchase.objects.create(
            work=work,
            buyer=request.user,
            order=order,
            price_paid=work.price,
        )

        serializer = PurchaseSerializer(purchase, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PurchaseViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PurchaseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Purchase.objects.filter(buyer=self.request.user).select_related(
            'work',
            'work__subject',
            'work__work_type',
            'work__author',
            'order',
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def cancel(self, request, pk=None):
        """Покупатель отменяет заказ по готовой работе:
        деньги возвращаются на кошелёк, статус заказа → cancelled.

        Если таймер передачи уже истёк, дополнительно:
          • эксперту автоматически выставляется отзыв 1★;
          • эксперт получает уведомление об отмене и о низком рейтинге;
          • клиент видит предупреждение об этом до подтверждения (на фронте).
        До истечения таймера отмена запрещена — деньги лежат в эскроу, пока
        эксперт не загрузит готовую работу."""
        purchase = self.get_object()
        order = purchase.order

        if order is None:
            return Response(
                {'detail': 'У покупки нет связанного заказа.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if order.status != Order.READY_WORK_TRANSFER:
            return Response(
                {'detail': f'Отменить можно только заказ в статусе «Передача готовой работы». Текущий: «{order.get_status_display()}».'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Клиент может отменить заказ только после истечения таймера передачи.
        from apps.orders.services import OrderActionService
        if not OrderActionService.is_transfer_deadline_passed(order):
            return Response(
                {'detail': 'Отменить покупку готовой работы можно только после истечения таймера передачи. Дождитесь загрузки работы экспертом или истечения срока.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        expert = order.expert
        already_auto_reviewed = bool(getattr(order, 'auto_bad_review_issued', False))

        refunded = WalletService.refund_hold(
            request.user,
            purchase.price_paid,
            order=order,
            description=(
                f'Возврат по покупке готовой работы «{purchase.work.title}» '
                f'(таймер передачи истёк, клиент отменил заказ)'
            ),
        )

        order.status = 'cancelled'
        order.save(update_fields=['status', 'updated_at'])

        # Авто-отзыв 1★ эксперту (если ещё не выставлен) — клиент отменил
        # покупку после истечения таймера, значит эксперт не выполнил обязательство.
        auto_review = None
        if expert is not None and not already_auto_reviewed:
            try:
                from apps.experts.models import ExpertReview
                auto_review, created = ExpertReview.objects.get_or_create(
                    order=order,
                    defaults={
                        'expert': expert,
                        'client': request.user,
                        'rating': 1,
                        'comment': 'Эксперт не загрузил готовую работу в установленный срок.',
                        'is_published': True,
                    },
                )
                if not created and auto_review.rating != 1:
                    auto_review.rating = 1
                    auto_review.comment = 'Эксперт не загрузил готовую работу в установленный срок.'
                    auto_review.is_published = True
                    auto_review.save(update_fields=['rating', 'comment', 'is_published', 'updated_at'])
            except Exception:
                auto_review = None

            order.auto_bad_review_issued = True
            order.save(update_fields=['auto_bad_review_issued', 'updated_at'])

        # Уведомления обеим сторонам
        try:
            from apps.notifications.services import NotificationService
            from apps.notifications.models import NotificationType

            if expert is not None:
                NotificationService.create_notification(
                    recipient=expert,
                    type=NotificationType.STATUS_CHANGED,
                    title='Заказ отменён клиентом',
                    message=(
                        f'Клиент отменил заказ №{order.id} «{purchase.work.title}» '
                        f'после истечения таймера передачи. '
                        f'Средства возвращены покупателю, эксперту выставлен автоматический отзыв 1★.'
                    ),
                    related_object_id=order.id,
                    related_object_type='order',
                    data={
                        'order_id': order.id,
                        'old_status': Order.READY_WORK_TRANSFER,
                        'new_status': 'cancelled',
                        'reason': 'transfer_deadline_expired',
                    },
                )

            NotificationService.create_notification(
                recipient=request.user,
                type=NotificationType.STATUS_CHANGED,
                title='Заказ отменён',
                message=(
                    f'Заказ №{order.id} «{purchase.work.title}» отменён. '
                    f'Средства возвращены на ваш кошелёк. '
                    f'Эксперту выставлен автоматический отзыв 1★.'
                ),
                related_object_id=order.id,
                related_object_type='order',
                data={
                    'order_id': order.id,
                    'old_status': Order.READY_WORK_TRANSFER,
                    'new_status': 'cancelled',
                    'reason': 'transfer_deadline_expired',
                },
            )
        except Exception:
            pass

        # Пересчёт статистики эксперта, если выставлен авто-отзыв.
        if expert is not None and auto_review is not None:
            try:
                from apps.experts.services import ExpertStatisticsService
                ExpertStatisticsService.update_expert_statistics(expert)
            except Exception:
                pass

        return Response({
            'status': 'cancelled',
            'order_status': order.status,
            'refunded_amount': str(purchase.price_paid),
            'transaction_id': refunded.id,
            'auto_review_issued': bool(auto_review is not None),
        })

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def confirm_received(self, request, pk=None):
        """Покупатель подтверждает, что готовая работа получена:
        деньги из эскроу уходят эксперту (минус комиссия платформы),
        статус заказа → completed."""
        purchase = self.get_object()
        order = purchase.order

        if order is None:
            return Response(
                {'detail': 'У покупки нет связанного заказа.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if order.status != Order.READY_WORK_TRANSFER:
            return Response(
                {'detail': f'Подтвердить можно только заказ в статусе «Передача готовой работы». Текущий: «{order.get_status_display()}».'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = WalletService.release_to_expert(
            client=request.user,
            expert=purchase.work.author,
            amount=purchase.price_paid,
            order=order,
            description=f'Выплата по покупке готовой работы «{purchase.work.title}»',
        )

        order.status = 'completed'
        order.save(update_fields=['status', 'updated_at'])

        return Response({
            'status': 'completed',
            'order_status': order.status,
            'expert_payout': str(result['payout']),
            'platform_fee': str(result['fee']),
        })

    @action(detail=True, methods=['post'])
    def rate(self, request, pk=None):
        purchase = self.get_object()
        rating = request.data.get('rating')
        if rating is None or rating == '':
            return Response({'detail': 'rating обязателен'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            rating = int(rating)
        except (TypeError, ValueError):
            return Response({'detail': 'rating должен быть числом'}, status=status.HTTP_400_BAD_REQUEST)
        if rating < 1 or rating > 5:
            return Response({'detail': 'rating должен быть в диапазоне 1..5'}, status=status.HTTP_400_BAD_REQUEST)

        purchase.rating = rating
        purchase.rated_at = timezone.now()
        purchase.save(update_fields=['rating', 'rated_at'])
        return Response(PurchaseSerializer(purchase, context={'request': request}).data)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        purchase = self.get_object()
        if not purchase.delivered_file:
            return Response({'detail': 'Файл недоступен'}, status=status.HTTP_404_NOT_FOUND)

        file_handle = purchase.delivered_file.open()
        content_type, _ = mimetypes.guess_type(purchase.delivered_file.name)
        if not content_type:
            content_type = 'application/octet-stream'

        filename = purchase.delivered_file_name or purchase.delivered_file.name.split('/')[-1]
        response = FileResponse(file_handle, content_type=content_type)
        response['Content-Length'] = purchase.delivered_file.size
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
