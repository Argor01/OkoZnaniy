from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from django.db import models
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from datetime import timedelta
from .models import Order, Transaction, Dispute, OrderFile, OrderComment, Bid
from .serializers import OrderSerializer, AvailableOrderSerializer, TransactionSerializer, DisputeSerializer, OrderFileSerializer, OrderCommentSerializer, BidSerializer
from apps.notifications.services import NotificationService
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import FileResponse
import mimetypes
import logging
import json

# Create your views here.
logger = logging.getLogger(__name__)


def _ensure_not_banned_for_contacts(user, action_detail):
    """Проверка бана за обмен контактами с авто-снятием истёкшего временного бана.

    Возвращает Response с 400, если пользователь забанен. Иначе None.
    action_detail — человекочитаемое описание действия, которое блокируется.
    """
    if not user or not user.is_authenticated:
        return None
    if getattr(user, 'role', None) in ('admin', 'director'):
        return None
    if hasattr(user, 'unban_for_contacts_if_expired'):
        user.unban_for_contacts_if_expired()
    if getattr(user, 'is_banned_for_contacts', False):
        return Response(
            {
                'detail': f'{action_detail} недоступно. Пользователь находится на проверке за обмен контактными данными.',
                'frozen': True,
                'frozen_reason': getattr(user, 'contact_ban_reason', None) or 'Пользователь находится на проверке'
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    return None

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_destroy(self, instance):
        """Запрещаем удаление заказов, которые уже в работе"""
        user = self.request.user
        
        # Проверяем, что пользователь имеет право удалять (только клиент)
        if instance.client_id != user.id:
            raise PermissionDenied('Только клиент может удалять свой заказ')
        
        # Можно удалять только заказы в статусе 'new' или 'completed'
        # Все остальные статусы означают, что заказ в работе
        if instance.status not in ['new', 'completed']:
            raise PermissionDenied(
                f'Нельзя удалить заказ в статусе "{instance.status}". '
                'Удаление возможно только для заказов в статусе "new" или "completed"'
            )
        
        # Для заказов в статусе 'new' дополнительно проверяем:
        if instance.status == 'new':
            # Нет ли назначенного эксперта
            if instance.expert_id:
                raise PermissionDenied('Нельзя удалить заказ с назначенным экспертом')
            
            # Нет ли принятых ставок
            if instance.bids.filter(status='accepted').exists():
                raise PermissionDenied('Нельзя удалить заказ с принятой ставкой')
        
        instance.delete()

    @staticmethod
    def _inactive_unassigned_filter():
        return models.Q(
            status='new',
            expert__isnull=True,
            created_at__lte=timezone.now() - timedelta(days=7),
        )

    def retrieve(self, request, *args, **kwargs):
        order = get_object_or_404(self.serializer_class.Meta.model, pk=kwargs.get('pk'))
        user = request.user
        
        # Staff, клиент заказа или эксперт заказа - полный доступ
        if user.is_staff or order.client_id == user.id or order.expert_id == user.id:
            serializer = self.get_serializer(order)
            return Response(serializer.data)
        
        # Клиенты могут просматривать любые заказы (для ознакомления)
        if getattr(user, 'role', None) == 'client':
            serializer = self.get_serializer(order)
            return Response(serializer.data)
        
        # Эксперты могут просматривать только доступные заказы
        if getattr(user, 'role', None) == 'expert' and order.status == 'new' and order.expert_id is None:
            serializer = self.get_serializer(order)
            return Response(serializer.data)
        
        return Response({'detail': 'Недостаточно прав.'}, status=status.HTTP_403_FORBIDDEN)

    def get_queryset(self):
        user = self.request.user
        queryset = self.queryset.prefetch_related(
            'bids__expert', 'files', 'comments', 'subject', 'topic', 'work_type', 'complexity'
        ).select_related('client', 'expert', 'expert_rating')
        
        # Staff видят все заказы
        if user.is_staff:
            base_queryset = queryset
        # Клиенты видят все заказы (для ознакомления в ленте)
        elif getattr(user, 'role', None) == 'client':
            base_queryset = queryset
        # Эксперты видят только свои заказы (как клиент или как исполнитель)
        elif getattr(user, 'role', None) == 'expert':
            base_filter = models.Q(client=user) | models.Q(expert=user)
            base_queryset = queryset.filter(base_filter)
        # Остальные пользователи видят только свои заказы
        else:
            base_filter = models.Q(client=user) | models.Q(expert=user)
            base_queryset = queryset.filter(base_filter)
        
        # Добавляем фильтрацию по статусу
        status = self.request.query_params.get('status')
        if status:
            base_queryset = base_queryset.filter(status=status)
        
        # Добавляем сортировку
        ordering = self.request.query_params.get('ordering', '-created_at')
        base_queryset = base_queryset.order_by(ordering)
        
        return base_queryset

    def get_serializer_class(self):
        if self.action == 'available':
            return AvailableOrderSerializer
        return super().get_serializer_class()

    def create(self, request, *args, **kwargs):
        blocked = _ensure_not_banned_for_contacts(request.user, 'Создание заказа')
        if blocked is not None:
            return blocked
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        # Дополнительная валидация дедлайна
        deadline = serializer.validated_data.get('deadline')
        if deadline and deadline <= timezone.now():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({
                'deadline': 'Дедлайн не может быть в прошлом'
            })
        
        serializer.save(client=self.request.user)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def available(self, request):
        """Список доступных заказов для исполнителя (новые, без назначенного эксперта)."""
        user = request.user
        if not user.is_staff and getattr(user, 'role', None) != 'expert':
            return Response({'detail': 'Недостаточно прав.'}, status=status.HTTP_403_FORBIDDEN)
        queryset = (
            self.queryset.filter(status='new', expert__isnull=True)
            .exclude(self._inactive_unassigned_filter())
            .select_related('subject', 'topic', 'work_type', 'complexity', 'client')
            .prefetch_related('files__uploaded_by')
            .annotate(responses_count=models.Count('bids', distinct=True))
        )
        
        try:
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            # Логируем ошибку для отладки
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Ошибка при получении доступных заказов: {str(e)}")
            
            # Возвращаем пустой список вместо ошибки 500
            return Response({
                'results': [],
                'count': 0,
                'error': 'Произошла ошибка при загрузке заказов. Попробуйте позже.'
            }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def reactivate(self, request, pk=None):
        order = self.get_object()
        user = request.user
        if order.client_id != user.id:
            return Response({'detail': 'Недостаточно прав.'}, status=status.HTTP_403_FORBIDDEN)
        if order.expert_id is not None or order.status != 'new':
            return Response({'detail': 'Активировать можно только новый заказ без эксперта.'}, status=status.HTTP_400_BAD_REQUEST)
        if not Order.objects.filter(pk=order.pk).filter(self._inactive_unassigned_filter()).exists():
            return Response({'detail': 'Заказ не находится в неактивных.'}, status=status.HTTP_400_BAD_REQUEST)

        order.created_at = timezone.now()
        order.save(update_fields=['created_at', 'updated_at'])
        return Response(self.get_serializer(order).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def take(self, request, pk=None):
        """Взять заказ в работу (только для роли expert)."""
        # Не используем get_object(), чтобы не упереться в get_queryset с фильтрацией по пользователю
        order = get_object_or_404(self.serializer_class.Meta.model, pk=pk)
        user = request.user
        blocked = _ensure_not_banned_for_contacts(user, 'Взятие заказа в работу')
        if blocked is not None:
            return blocked
        # Простейшая проверка роли для MVP
        if getattr(user, 'role', None) != 'expert':
            return Response({'detail': 'Только эксперт может взять заказ.'}, status=status.HTTP_403_FORBIDDEN)
        # Нельзя брать собственный заказ клиента
        if getattr(order, 'client_id', None) == user.id:
            return Response({'detail': 'Нельзя взять собственный заказ.'}, status=status.HTTP_400_BAD_REQUEST)
        if order.expert_id:
            return Response({'detail': 'У заказа уже есть назначенный эксперт.'}, status=status.HTTP_400_BAD_REQUEST)
        if order.status != 'new':
            return Response({'detail': 'Взять можно только заказ в статусе new.'}, status=status.HTTP_400_BAD_REQUEST)
        order.expert = user
        order.status = 'in_progress'
        order.save(update_fields=['expert', 'status', 'updated_at'])
        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def complete(self, request, pk=None):
        """Завершить заказ (эксперт переводит в done)."""
        order = self.get_object()
        user = request.user
        if getattr(user, 'role', None) != 'expert':
            return Response({'detail': 'Только эксперт может завершать заказ.'}, status=status.HTTP_403_FORBIDDEN)
        if order.expert_id != user.id:
            return Response({'detail': 'Вы не являетесь исполнителем этого заказа.'}, status=status.HTTP_403_FORBIDDEN)
        if order.status != 'in_progress':
            return Response({'detail': 'Завершить можно только заказ в работе.'}, status=status.HTTP_400_BAD_REQUEST)
        order.status = 'completed'
        order.save(update_fields=['status', 'updated_at'])
        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def submit(self, request, pk=None):
        """Эксперт отправляет работу на проверку: in_progress -> review."""
        order = self.get_object()
        user = request.user
        blocked = _ensure_not_banned_for_contacts(user, 'Отправка работы на проверку')
        if blocked is not None:
            return blocked
        if getattr(user, 'role', None) != 'expert' or order.expert_id != user.id:
            return Response({'detail': 'Недостаточно прав.'}, status=status.HTTP_403_FORBIDDEN)
        if order.status not in ['in_progress', 'revision']:
            return Response({'detail': 'Отправить на проверку можно только из статусов in_progress или revision.'}, status=status.HTTP_400_BAD_REQUEST)
        if order.deadline and order.deadline <= timezone.now():
            return Response({'detail': 'Срок сдачи истёк.'}, status=status.HTTP_400_BAD_REQUEST)
        order.status = 'review'
        order.save(update_fields=['status', 'updated_at'])
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def extend_deadline(self, request, pk=None):
        """Клиент продлевает дедлайн просроченного заказа: deadline -> новое значение, статус -> in_progress."""
        order = self.get_object()
        user = request.user
        if order.client_id != user.id:
            return Response({'detail': 'Недостаточно прав.'}, status=status.HTTP_403_FORBIDDEN)
        if not order.expert_id:
            return Response({'detail': 'У заказа нет назначенного эксперта.'}, status=status.HTTP_400_BAD_REQUEST)
        if order.status not in ['in_progress', 'revision']:
            return Response({'detail': 'Продлить дедлайн можно только для заказа в работе.'}, status=status.HTTP_400_BAD_REQUEST)
        if not order.deadline or order.deadline > timezone.now():
            return Response({'detail': 'Заказ не просрочен.'}, status=status.HTTP_400_BAD_REQUEST)

        new_deadline_raw = request.data.get('deadline')
        new_deadline = parse_datetime(new_deadline_raw) if isinstance(new_deadline_raw, str) else None
        if not new_deadline:
            return Response({'deadline': 'Некорректный дедлайн.'}, status=status.HTTP_400_BAD_REQUEST)
        if timezone.is_naive(new_deadline):
            new_deadline = timezone.make_aware(new_deadline, timezone.get_current_timezone())
        if new_deadline <= timezone.now():
            return Response({'deadline': 'Дедлайн не может быть в прошлом.'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = order.status
        order.deadline = new_deadline
        order.status = 'in_progress'
        order.save(update_fields=['deadline', 'status', 'updated_at'])

        if order.expert_id:
            NotificationService.create_notification(
                recipient=order.expert,
                type='status_changed',
                title='Дедлайн продлён',
                message=f"Клиент продлил дедлайн по заказу №{order.id} до {timezone.localtime(order.deadline).strftime('%d.%m.%Y %H:%M')}",
                related_object_id=order.id,
                related_object_type='order',
                data={'order_id': order.id, 'old_status': old_status, 'new_status': order.status}
            )
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def cancel_overdue(self, request, pk=None):
        """Клиент отменяет просроченный заказ: статус -> cancelled + уведомление эксперту."""
        order = self.get_object()
        user = request.user
        if order.client_id != user.id:
            return Response({'detail': 'Недостаточно прав.'}, status=status.HTTP_403_FORBIDDEN)
        if not order.expert_id:
            return Response({'detail': 'У заказа нет назначенного эксперта.'}, status=status.HTTP_400_BAD_REQUEST)
        if order.status not in ['in_progress', 'revision']:
            return Response({'detail': 'Отменить можно только заказ в работе.'}, status=status.HTTP_400_BAD_REQUEST)
        if not order.deadline or order.deadline > timezone.now():
            return Response({'detail': 'Заказ не просрочен.'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = order.status
        order.status = 'cancelled'
        order.save(update_fields=['status', 'updated_at'])

        if order.expert_id:
            NotificationService.create_notification(
                recipient=order.expert,
                type='status_changed',
                title='Заказ отменён',
                message=f"Клиент отменил заказ №{order.id} из‑за просрочки.",
                related_object_id=order.id,
                related_object_type='order',
                data={'order_id': order.id, 'old_status': old_status, 'new_status': order.status}
            )
            from apps.experts.services import ExpertStatisticsService
            ExpertStatisticsService.update_expert_statistics(order.expert)

        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def accept_bid(self, request, pk=None):
        """Клиент принимает ставку: назначает эксперта, фиксирует бюджет и создает чат с данными заказа."""
        blocked = _ensure_not_banned_for_contacts(request.user, 'Принятие ставки')
        if blocked is not None:
            return blocked
        order = self.get_object()
        user = request.user
        
        # Проверка прав: клиент-владелец, staff или director
        user_role = getattr(user, 'role', None)
        is_owner = order.client_id == user.id
        is_staff = user.is_staff or user_role in ['director', 'admin', 'arbitrator']
        
        # Логирование для отладки
        logger.info(f"accept_bid: user={user.id}, role={user_role}, is_owner={is_owner}, is_staff={is_staff}, order_client={order.client_id}")
        
        if not (is_owner or is_staff):
            logger.warning(f"accept_bid: Недостаточно прав для user={user.id}, role={user_role}")
            return Response({'detail': 'Недостаточно прав.'}, status=status.HTTP_403_FORBIDDEN)
        
        bid_id = request.data.get('bid_id')
        if not bid_id:
            return Response({'bid_id': 'Не указан ID ставки'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            bid = Bid.objects.select_related('expert', 'order').get(id=bid_id, order=order)
        except Bid.DoesNotExist:
            return Response({'detail': 'Ставка не найдена'}, status=status.HTTP_404_NOT_FOUND)
        
        # Назначаем эксперта и согласованную цену
        order.expert = bid.expert
        order.budget = bid.amount
        
        # Переводим заказ в in_progress, если он был в одном из допустимых статусов
        old_status = order.status
        if order.status in ['new', 'revision', 'review', 'waiting_payment']:
            order.status = 'in_progress'
        
        order.save(update_fields=['expert', 'budget', 'status', 'updated_at'])
        
        # Ищем существующий чат между клиентом и экспертом или создаем новый
        from apps.chat.models import Chat, Message
        
        # Ищем любой существующий чат между этими пользователями
        # (даже если в нем уже есть другие заказы)
        chat = Chat.objects.filter(
            client=order.client,
            expert=bid.expert,
        ).first()
        
        if chat:
            # Используем существующий чат
            # Если чат был без заказа - привязываем текущий
            if not chat.order:
                chat.order = order
                chat.save(update_fields=['order'])
            logger.info(f"Использован существующий чат {chat.id} для заказа {order.id}")
        else:
            # Создаем новый чат с заказом
            chat = Chat.objects.create(
                order=order,
                client=order.client,
                expert=bid.expert,
            )
            logger.info(f"Создан новый чат {chat.id} для заказа {order.id}")
        
        # Добавляем участников в любом случае
        chat.participants.add(order.client, bid.expert)
        
        # Созддаем сообщение с данными заказа для отображения карточки в чате
        # Это аналогично индивидуальному предложению, но сразу с принятым статусом
        offer_data = {
            'status': 'accepted',
            'order_id': order.id,
            'title': order.title or f'Заказ №{order.id}',
            'description': order.description or '',
            'cost': str(order.budget),
            'deadline': order.deadline.isoformat() if order.deadline else None,
            'subject_id': order.subject_id,
            'subject': order.custom_subject or (order.subject.name if order.subject else None),
            'work_type_id': order.work_type_id,
            'work_type': order.custom_work_type or (order.work_type.name if order.work_type else None),
            'expert_id': order.expert_id,
            'expert_username': order.expert.username if order.expert else None,
            'client_id': order.client_id,
            'accepted_at': timezone.now().isoformat(),
        }
        
        message_text = f'Вас назначили исполнителем по заказу {order.id}'
        message = Message(
            chat=chat,
            sender=order.client,
            text=message_text,
            message_type='offer',
            offer_data=offer_data,
        )
        try:
            message.full_clean()
            message.save()
            logger.info(f"Сообщение-оффер создано для чата {chat.id} по заказу {order.id}")
        except Exception as e:
            logger.error(f"Ошибка при создании сообщения: {str(e)}")
            # Продолжаем даже если сообщение не создалось - чат уже есть
        
        # Уведомляем эксперта о назначении на заказ
        try:
            NotificationService.create_notification(
                recipient=bid.expert,
                type='new_bid',  # Используем существующий тип
                title=f'Вас назначили исполнителем по заказу {order.id}',
                message=f'Вы назначены исполнителем заказа №{order.id}. Подробности в деталях заказа.',
                related_object_id=order.id,
                related_object_type='order'
            )
            # Уведомляем клиента о том, что эксперт назначен
            NotificationService.notify_new_bid(order, bid, bid.expert, is_updated=False)
        except Exception as e:
            logger.error(f"Ошибка при отправке уведомлений: {str(e)}")
        
        # Возвращаем ID чата, чтобы фронтенд мог сразу открыть его
        response_data = OrderSerializer(order).data
        response_data['chat_id'] = chat.id
        logger.info(f"accept_bid: заказ {order.id}, чат {chat.id}, эксперт {bid.expert.id}")
        return Response(response_data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def reject_bid(self, request, pk=None):
        """Клиент отклоняет ставку."""
        order = self.get_object()
        user = request.user
        if getattr(user, 'role', None) != 'client' or order.client_id != user.id:
            return Response({'detail': 'Недостаточно прав.'}, status=status.HTTP_403_FORBIDDEN)
        bid_id = request.data.get('bid_id')
        if not bid_id:
            return Response({'bid_id': 'Не указан ID ставки'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            bid = Bid.objects.get(id=bid_id, order=order)
        except Bid.DoesNotExist:
            return Response({'detail': 'Ставка не найдена'}, status=status.HTTP_404_NOT_FOUND)
        
        bid.status = 'rejected'
        bid.save(update_fields=['status'])
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def cancel_bid(self, request, pk=None):
        """Эксперт отменяет свою ставку."""
        order = self.get_object()
        user = request.user
        if getattr(user, 'role', None) != 'expert':
             return Response({'detail': 'Только эксперт может отменять ставку.'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            bid = Bid.objects.get(order=order, expert=user)
        except Bid.DoesNotExist:
             return Response({'detail': 'Ставка не найдена'}, status=status.HTTP_404_NOT_FOUND)

        bid.status = 'cancelled'
        bid.save(update_fields=['status'])
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def approve(self, request, pk=None):
        """Клиент принимает работу: review -> completed."""
        order = self.get_object()
        user = request.user
        if getattr(user, 'role', None) != 'client' or order.client_id != user.id:
            return Response({'detail': 'Недостаточно прав.'}, status=status.HTTP_403_FORBIDDEN)
        if order.status != 'review':
            return Response({'detail': 'Принять можно только из статуса review.'}, status=status.HTTP_400_BAD_REQUEST)
        order.status = 'completed'
        order.save(update_fields=['status', 'updated_at'])
        if order.expert_id:
            from apps.experts.models import ExpertStatistics

            stats, _ = ExpertStatistics.objects.get_or_create(expert=order.expert)
            stats.update_statistics()
        # Шлём уведомление о завершении заказа + просьбу клиенту оставить отзыв.
        try:
            NotificationService.notify_order_completed(order)
        except Exception:
            pass
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def revision(self, request, pk=None):
        blocked = _ensure_not_banned_for_contacts(request.user, 'Отправка на доработку')
        if blocked is not None:
            return blocked
        """Клиент отправляет на доработку: review -> revision."""
        order = self.get_object()
        user = request.user
        revision_comment = str(request.data.get('comment') or '').strip()
        if not revision_comment:
            revision_comment = str(request.query_params.get('comment') or '').strip()
        if not revision_comment:
            revision_comment = str(request.headers.get('X-Revision-Comment') or '').strip()
        if not revision_comment:
            try:
                raw_body = request.body.decode('utf-8') if getattr(request, 'body', None) else ''
                parsed = json.loads(raw_body) if raw_body else {}
                revision_comment = str((parsed or {}).get('comment') or '').strip()
            except Exception:
                revision_comment = ''
        if getattr(user, 'role', None) != 'client' or order.client_id != user.id:
            return Response({'detail': 'Недостаточно прав.'}, status=status.HTTP_403_FORBIDDEN)
        if order.status != 'review':
            return Response({'detail': 'На доработку можно отправить только из статуса review.'}, status=status.HTTP_400_BAD_REQUEST)
        if not revision_comment:
            return Response({'detail': 'Комментарий для доработки обязателен.'}, status=status.HTTP_400_BAD_REQUEST)
        order.status = 'revision'
        order.save(update_fields=['status', 'updated_at'])
        if order.expert_id and order.client_id:
            from apps.chat.models import Chat, Message

            chat, created = Chat.objects.get_or_create(
                order=order,
                client=order.client,
                expert=order.expert,
            )
            if created:
                chat.participants.add(order.client, order.expert)
            message_text = f'Клиент вернул работу на доработку\nКомментарий: {revision_comment}'
            message = Message(
                chat=chat,
                sender=order.client,
                text=message_text,
                message_type='system',
                offer_data={'revision_comment': revision_comment},
            )
            message.full_clean()
            message.save()
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def reject(self, request, pk=None):
        """Клиент отклоняет работу: review -> cancelled."""
        order = self.get_object()
        user = request.user
        if getattr(user, 'role', None) != 'client' or order.client_id != user.id:
            return Response({'detail': 'Недостаточно прав.'}, status=status.HTTP_403_FORBIDDEN)
        if order.status != 'review':
            return Response({'detail': 'Отклонить можно только из статуса review.'}, status=status.HTTP_400_BAD_REQUEST)
        old_status = order.status
        order.status = 'cancelled'
        order.save(update_fields=['status', 'updated_at'])
        if order.expert_id:
            NotificationService.notify_status_changed(order, old_status)
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'])
    def take_order(self, request, pk=None):
        blocked = _ensure_not_banned_for_contacts(request.user, 'Взятие заказа')
        if blocked is not None:
            return blocked
        order = self.get_object()
        if order.status != 'new':
            return Response(
                {'detail': 'Заказ уже взят в работу'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if request.user.role != 'expert':
            return Response(
                {'detail': 'Только эксперты могут брать заказы'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        old_status = order.status
        order.expert = request.user
        order.status = 'in_progress'
        order.save()
        
        NotificationService.notify_order_taken(order)
        NotificationService.notify_status_changed(order, old_status)
        
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'])
    def complete_order(self, request, pk=None):
        order = self.get_object()
        if order.expert != request.user:
            return Response(
                {'detail': 'Только назначенный эксперт может завершить заказ'},
                status=status.HTTP_403_FORBIDDEN
            )
        if order.status not in ['in_progress', 'revision']:
            return Response(
                {'detail': 'Неверный статус заказа'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_status = order.status
        order.status = 'completed'
        order.save()
        
        NotificationService.notify_status_changed(order, old_status)
        try:
            NotificationService.notify_order_completed(order)
        except Exception:
            pass

        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def create_dispute(self, request, pk=None):
        """Создание спора клиентом по заказу"""
        order = self.get_object()
        user = request.user
        
        # Проверяем права
        if user.role != 'client' or order.client != user:
            return Response(
                {'error': 'Только клиент может создать спор по своему заказу'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Проверяем, что заказ в подходящем статусе
        if order.status not in ['completed', 'review']:
            return Response(
                {'error': 'Спор можно создать только для завершенных заказов или заказов на проверке'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Проверяем, что спор еще не создан
        if hasattr(order, 'dispute'):
            return Response(
                {'error': 'Спор по этому заказу уже существует'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response(
                {'error': 'Укажите причину спора'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(reason) < 10:
            return Response(
                {'error': 'Причина спора должна содержать минимум 10 символов'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Создаем спор
        dispute = Dispute.objects.create(
            order=order,
            reason=reason
        )
        
        # Отправляем уведомление администраторам
        from apps.notifications.services import NotificationService
        NotificationService.notify_dispute_created(dispute)
        
        serializer = DisputeSerializer(dispute)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def create_review(self, request, pk=None):
        """Создание отзыва о работе эксперта"""
        order = self.get_object()
        user = request.user
        
        # Проверяем права - только клиент может оставить отзыв
        if user.role != 'client' or order.client_id != user.id:
            return Response(
                {'error': 'Только клиент может оставить отзыв'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Проверяем, что заказ завершен
        if order.status != 'completed':
            return Response(
                {'error': 'Отзыв можно оставить только после завершения заказа'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Проверяем, что есть эксперт
        if not order.expert_id:
            return Response(
                {'error': 'У заказа нет исполнителя'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        rating = request.data.get('rating')
        comment = request.data.get('comment', '').strip()
        
        if not rating:
            return Response(
                {'error': 'Оценка обязательна'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            rating = int(rating)
            if rating < 1 or rating > 5:
                raise ValueError()
        except (ValueError, TypeError):
            return Response(
                {'error': 'Оценка должна быть числом от 1 до 5'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Создаем или обновляем отзыв (используем ExpertRating)
        from apps.experts.models import ExpertRating
        
        review, created = ExpertRating.objects.update_or_create(
            order=order,
            defaults={
                'expert': order.expert,
                'client': user,
                'rating': rating,
                'comment': comment,
            }
        )
        
        # Обновляем статистику эксперта
        from apps.experts.models import ExpertStatistics
        stats, _ = ExpertStatistics.objects.get_or_create(expert=order.expert)
        stats.update_statistics()
        
        # Возвращаем данные отзыва
        return Response({
            'id': review.id,
            'rating': review.rating,
            'comment': review.comment,
            'created_at': review.created_at.isoformat(),
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def freeze(self, request, pk=None):
        """Заморозить заказ"""
        order = self.get_object()
        user = request.user
        
        # Проверяем права: админ или участник заказа
        is_admin = user.role == 'admin'
        is_client = order.client_id == user.id
        is_expert = order.expert_id == user.id
        
        if not (is_admin or is_client or is_expert):
            return Response(
                {'detail': 'Недостаточно прав для заморозки заказа'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        reason = request.data.get('reason', 'Заморожено пользователем').strip()
        order.freeze(reason)
        
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def unfreeze(self, request, pk=None):
        """Разморозить заказ"""
        order = self.get_object()
        user = request.user
        
        # Проверяем права: админ или участник заказа
        is_admin = user.role == 'admin'
        is_client = order.client_id == user.id
        is_expert = order.expert_id == user.id
        
        if not (is_admin or is_client or is_expert):
            return Response(
                {'detail': 'Недостаточно прав для разморозки заказа'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        order.unfreeze()
        
        return Response(OrderSerializer(order).data)

class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Transaction.objects.all()
        return Transaction.objects.filter(user=user)

class DisputeViewSet(viewsets.ModelViewSet):
    queryset = Dispute.objects.all()
    serializer_class = DisputeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or getattr(user, 'role', None) == 'admin':
            return Dispute.objects.all()
        return Dispute.objects.filter(order__client=user)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        dispute = self.get_object()
        user = request.user
        
        # Проверяем права: админ или назначенный арбитр
        is_admin = user.is_staff or getattr(user, 'role', None) == 'admin'
        is_assigned_arbitrator = dispute.arbitrator == user
        
        if not (is_admin or is_assigned_arbitrator):
            return Response(
                {"error": "Только администратор или назначенный арбитр может решить спор"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        dispute.resolved = True
        # Не перезаписываем арбитра, если он уже назначен
        if not dispute.arbitrator:
            dispute.arbitrator = request.user
        dispute.result = request.data.get('result', '')
        dispute.save()
        
        # Уведомляем участников о решении спора
        from apps.notifications.services import NotificationService
        NotificationService.notify_dispute_resolved(dispute)
        
        return Response(DisputeSerializer(dispute).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def assign_arbitrator(self, request, pk=None):
        """Назначение арбитра на спор (только для админов)"""
        dispute = self.get_object()
        user = request.user
        
        if user.role != 'admin':
            return Response(
                {'error': 'Только администратор может назначать арбитров'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        arbitrator_id = request.data.get('arbitrator_id')
        if not arbitrator_id:
            return Response(
                {'error': 'Укажите ID арбитра'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from apps.users.models import User
            arbitrator = User.objects.get(id=arbitrator_id, role='arbitrator')
        except User.DoesNotExist:
            return Response(
                {'error': 'Арбитр не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        dispute.arbitrator = arbitrator
        dispute.save()
        
        # Отправляем уведомление арбитру
        from apps.notifications.services import NotificationService
        NotificationService.notify_arbitrator_assigned(dispute)
        
        serializer = DisputeSerializer(dispute)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_disputes(self, request):
        """Получить споры для арбитра"""
        user = request.user
        
        if user.role == 'arbitrator':
            # Споры, назначенные на этого арбитра
            disputes = Dispute.objects.filter(arbitrator=user, resolved=False)
        elif user.role == 'admin':
            # Все нерешенные споры для админа
            disputes = Dispute.objects.filter(resolved=False)
        else:
            return Response(
                {'error': 'Доступно только для арбитров и администраторов'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Возвращаем в том же формате, что и основной list endpoint
        serializer = DisputeSerializer(disputes, many=True)
        return Response({
            'count': disputes.count(),
            'next': None,
            'previous': None,
            'results': serializer.data
        })

class OrderFileViewSet(viewsets.ModelViewSet):
    serializer_class = OrderFileSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        order_pk = self.kwargs.get('order_pk')
        user = self.request.user
        # Клиент или эксперт заказа, staff - полный доступ
        order = get_object_or_404(Order, pk=order_pk)
        is_participant = user.is_staff or order.client_id == user.id or order.expert_id == user.id
        # Клиенты могут просматривать файлы любых заказов (для ознакомления)
        is_client_viewing = getattr(user, 'role', None) == 'client'
        # Эксперты могут просматривать файлы доступных заказов
        is_public_expert = (
            getattr(user, 'role', None) == 'expert' and order.status == 'new' and order.expert_id is None
        )
        if not (is_participant or is_client_viewing or is_public_expert):
            return OrderFile.objects.none()
        return OrderFile.objects.filter(
            order_id=order_pk
        ).select_related('order', 'uploaded_by')

    def perform_create(self, serializer):
        order = Order.objects.get(id=self.kwargs['order_pk'])
        if not (self.request.user == order.client or self.request.user == order.expert):
            raise PermissionDenied(
                'Только клиент и эксперт могут добавлять файлы'
            )
        order_file = serializer.save(
            order_id=self.kwargs['order_pk'],
            uploaded_by=self.request.user
        )
        NotificationService.notify_file_uploaded(order_file)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_destroy(self, instance):
        order = instance.order
        user = self.request.user
        can_delete = (
            user.is_staff
            or instance.uploaded_by_id == user.id
            or order.client_id == user.id
            or order.expert_id == user.id
        )
        if not can_delete:
            raise PermissionDenied('Недостаточно прав для удаления файла.')

        storage_file = instance.file
        instance.delete()
        if storage_file:
            storage_file.delete(save=False)

    def _mark_expert_view(self, request, order_file):
        user = request.user
        if (
            getattr(user, 'role', None) == 'expert'
            and user.id != order_file.uploaded_by_id
            and order_file.expert_viewed_at is None
        ):
            order_file.expert_viewed_at = timezone.now()
            order_file.save(update_fields=['expert_viewed_at'])

    @action(detail=True, methods=['get'])
    def download(self, request, order_pk=None, pk=None):
        order_file = self.get_object()
        self._mark_expert_view(request, order_file)
        file_handle = order_file.file.open()
        
        # Получаем MIME-тип файла
        content_type, _ = mimetypes.guess_type(order_file.file.name)
        if not content_type:
            content_type = 'application/octet-stream'
            
        # Создаем HTTP-ответ с файлом
        response = FileResponse(file_handle, content_type=content_type)
        response['Content-Length'] = order_file.file.size
        response['Content-Disposition'] = f'attachment; filename="{order_file.filename()}"'
        
        return response

    @action(detail=True, methods=['get'])
    def view(self, request, order_pk=None, pk=None):
        order_file = self.get_object()
        self._mark_expert_view(request, order_file)
        file_handle = order_file.file.open()

        # Получаем MIME-тип файла
        content_type, _ = mimetypes.guess_type(order_file.file.name)
        if not content_type:
            content_type = 'application/octet-stream'

        # Inline просмотр в браузере (если браузер умеет отображать данный тип)
        response = FileResponse(file_handle, content_type=content_type)
        response['Content-Length'] = order_file.file.size
        response['Content-Disposition'] = f'inline; filename="{order_file.filename()}"'

        return response

class OrderCommentViewSet(viewsets.ModelViewSet):
    serializer_class = OrderCommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return OrderComment.objects.filter(
            order_id=self.kwargs['order_pk']
        )

    def perform_create(self, serializer):
        order = Order.objects.get(id=self.kwargs['order_pk'])
        if not (self.request.user == order.client or self.request.user == order.expert):
            raise PermissionDenied(
                'Только клиент и эксперт могут оставлять комментарии'
            )
        comment = serializer.save(
            order_id=self.kwargs['order_pk'],
            author=self.request.user
        )
        NotificationService.notify_new_comment(comment)

class BidViewSet(viewsets.ModelViewSet):
    serializer_class = BidSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        order_id = self.kwargs['order_pk']
        order = get_object_or_404(Order, id=order_id)
        user = self.request.user

        # Доступ к откликам:
        # - клиент (автор заказа) видит все отклики
        # - staff видит все
        # - эксперт видит только свой отклик
        if user.is_staff or order.client_id == user.id:
            return Bid.objects.filter(order_id=order_id).select_related('expert', 'order')

        if getattr(user, 'role', None) == 'expert':
            return Bid.objects.filter(order_id=order_id, expert_id=user.id).select_related('expert', 'order')

        return Bid.objects.none()

    def create(self, request, *args, **kwargs):
        blocked = _ensure_not_banned_for_contacts(request.user, 'Отклик на заказ')
        if blocked is not None:
            return blocked
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        order_id = self.kwargs['order_pk']
        order = get_object_or_404(Order, id=order_id)
        
        # Проверяем права
        user = self.request.user
        if getattr(user, 'role', None) != 'expert':
            raise PermissionDenied('Только эксперт может делать ставку.')
        
        if order.client_id == user.id:
            raise PermissionDenied('Нельзя ставить на свой заказ.')
        
        if order.status not in ['new', 'in_progress', 'revision', 'review']:
            raise PermissionDenied('Нельзя сделать ставку для текущего статуса заказа.')
        
        # Если эксперт уже назначен и это не он
        if order.expert_id and order.expert_id != user.id:
            raise PermissionDenied('У заказа уже есть назначенный эксперт.')
        
        # Создаем или обновляем ставку
        bid, created = Bid.objects.get_or_create(
            order=order, 
            expert=user, 
            defaults=serializer.validated_data
        )
        if not created:
            for attr, value in serializer.validated_data.items():
                setattr(bid, attr, value)
            bid.save()

        try:
            NotificationService.notify_new_bid(
                order=order,
                bid=bid,
                expert=user,
                is_updated=not created
            )
        except Exception:
            logger.exception("Не удалось создать уведомление о новом отклике", extra={"order_id": order.id, "bid_id": bid.id, "expert_id": user.id})
        
        return bid
