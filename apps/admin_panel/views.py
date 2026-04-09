from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db.models import Q, Count
from django.utils import timezone

from .models import SupportRequest, SupportMessage, Claim, ClaimMessage, AdminChatRoom, AdminChatMessage, TicketActivity
from .serializers import (
    SupportRequestSerializer, SupportMessageSerializer,
    ClaimSerializer, ClaimMessageSerializer, AdminChatRoomSerializer, AdminChatMessageSerializer
)
from apps.director.models import DirectorChatRoom, DirectorChatMessage
from apps.director.serializers import DirectorChatRoomSerializer, DirectorChatMessageSerializer
from apps.notifications.models import NotificationType
from apps.notifications.services import NotificationService
from apps.users.serializers import UserSerializer
from apps.orders.models import Order
from apps.orders.serializers import OrderSerializer

User = get_user_model()


def can_access_ticket(user, ticket):
    """Доступ к обращению есть у администратора и владельца обращения."""
    if not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'role', None) == 'admin':
        return True
    return getattr(ticket, 'user_id', None) == user.id


def log_activity(actor, activity_type, text, meta=None, support_request=None, claim=None):
    """Записать событие в ленту активности тикета"""
    TicketActivity.objects.create(
        actor=actor,
        activity_type=activity_type,
        text=text,
        meta=meta or {},
        support_request=support_request,
        claim=claim,
    )


class IsAdminUser(IsAuthenticated):
    """Проверка прав администратора"""
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == 'admin'


# ============= УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ =============

@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_all_users(request):
    """Получить всех пользователей"""
    users = User.objects.all().order_by('-date_joined')
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_blocked_users(request):
    """Получить заблокированных пользователей"""
    users = User.objects.filter(is_active=False).order_by('-date_joined')
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def block_user(request, user_id):
    """Заблокировать пользователя"""
    try:
        user = User.objects.get(id=user_id)
        user.is_active = False
        user.save()
        return Response({'message': 'Пользователь заблокирован'})
    except User.DoesNotExist:
        return Response({'error': 'Пользователь не найден'}, status=404)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def unblock_user(request, user_id):
    """Разблокировать пользователя"""
    try:
        user = User.objects.get(id=user_id)
        user.is_active = True
        user.save()
        return Response({'message': 'Пользователь разблокирован'})
    except User.DoesNotExist:
        return Response({'error': 'Пользователь не найден'}, status=404)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def change_user_role(request, user_id):
    """Изменить роль пользователя"""
    try:
        user = User.objects.get(id=user_id)
        new_role = request.data.get('role')
        if new_role in ['client', 'expert', 'partner', 'admin', 'director']:
            user.role = new_role
            user.save()
            return Response({'message': f'Роль изменена на {new_role}'})
        return Response({'error': 'Недопустимая роль'}, status=400)
    except User.DoesNotExist:
        return Response({'error': 'Пользователь не найден'}, status=404)


# ============= УПРАВЛЕНИЕ ЗАКАЗАМИ =============

@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_all_orders(request):
    """Получить все заказы"""
    orders = Order.objects.all().select_related('client', 'expert').order_by('-created_at')
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_problem_orders(request):
    """Получить проблемные заказы"""
    problem_orders = Order.objects.filter(
        Q(status='disputed') | 
        Q(status='cancelled') |
        Q(has_issues=True)
    ).select_related('client', 'expert').order_by('-created_at')
    serializer = OrderSerializer(problem_orders, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def change_order_status(request, order_id):
    """Изменить статус заказа"""
    try:
        order = Order.objects.get(id=order_id)
        new_status = request.data.get('status')
        order.status = new_status
        order.save()
        return Response({'message': 'Статус заказа изменен'})
    except Order.DoesNotExist:
        return Response({'error': 'Заказ не найден'}, status=404)


# ============= ПОДДЕРЖКА =============

class SupportRequestViewSet(viewsets.ModelViewSet):
    """ViewSet для запросов в поддержку"""
    queryset = SupportRequest.objects.all()
    serializer_class = SupportRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.action in ['create', 'list', 'retrieve', 'send_message']:
            return [IsAuthenticated()]
        return [IsAdminUser()]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.role != 'admin':
            return queryset.filter(user=self.request.user)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def take_request(self, request, pk=None):
        """Взять запрос в работу"""
        support_request = self.get_object()
        support_request.admin = request.user
        support_request.status = 'in_progress'
        support_request.save()
        log_activity(request.user, 'status_change', f'Статус изменён на «В работе»',
                     meta={'new': 'in_progress'}, support_request=support_request)
        return Response({'message': 'Запрос взят в работу'})

    @action(detail=True, methods=['post'])
    def assign_users(self, request, pk=None):
        """Назначить пользователей на тикет"""
        support_request = self.get_object()
        user_ids = request.data.get('user_ids', [])

        if not isinstance(user_ids, list):
            return Response({'error': 'user_ids должен быть списком'}, status=400)

        users = User.objects.filter(id__in=user_ids)
        if len(users) != len(user_ids):
            return Response({'error': 'Некоторые пользователи не найдены'}, status=400)

        support_request.assigned_users.set(users)
        names = ', '.join(f'{u.first_name} {u.last_name}'.strip() or u.username for u in users)
        log_activity(request.user, 'observer_added',
                     f'Назначены наблюдатели: {names}' if names else 'Наблюдатели обновлены',
                     meta={'user_ids': user_ids}, support_request=support_request)
        return Response({'message': f'Назначено {len(users)} пользователей'})

    @action(detail=True, methods=['post'])
    def add_tag(self, request, pk=None):
        """Добавить тег к тикету"""
        support_request = self.get_object()
        tag = request.data.get('tag', '').strip()
        if not tag:
            return Response({'error': 'Тег не может быть пустым'}, status=400)
        support_request.add_tag(tag)
        log_activity(request.user, 'tag_added', f'Добавлен тег {tag}',
                     meta={'tag': tag}, support_request=support_request)
        return Response({'message': f'Тег {tag} добавлен', 'tags': support_request.get_tags_list()})

    @action(detail=True, methods=['post'])
    def remove_tag(self, request, pk=None):
        """Удалить тег из тикета"""
        support_request = self.get_object()
        tag = request.data.get('tag', '').strip()
        if not tag:
            return Response({'error': 'Тег не может быть пустым'}, status=400)
        support_request.remove_tag(tag)
        log_activity(request.user, 'tag_removed', f'Удалён тег {tag}',
                     meta={'tag': tag}, support_request=support_request)
        return Response({'message': f'Тег {tag} удален', 'tags': support_request.get_tags_list()})

    @action(detail=True, methods=['post'])
    def update_tags(self, request, pk=None):
        """Обновить все теги тикета"""
        support_request = self.get_object()
        tags = request.data.get('tags', '')
        support_request.tags = tags
        support_request.save(update_fields=['tags'])
        return Response({'message': 'Теги обновлены', 'tags': support_request.get_tags_list()})

    @action(detail=True, methods=['post'])
    def complete_request(self, request, pk=None):
        """Завершить запрос"""
        support_request = self.get_object()
        support_request.status = 'completed'
        support_request.completed_at = timezone.now()
        support_request.save()
        log_activity(request.user, 'completed', 'Тикет завершён',
                     support_request=support_request)
        return Response({'message': 'Запрос завершен'})

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Отправить сообщение в запрос"""
        support_request = self.get_object()
        msg_text = request.data.get('message', '')
        if not msg_text.strip():
            return Response({'error': 'Сообщение не может быть пустым'}, status=400)
        message = SupportMessage.objects.create(
            request=support_request,
            sender=request.user,
            message=msg_text,
            is_admin=(request.user.role in ['admin', 'director'])
        )
        log_activity(request.user, 'message', msg_text, support_request=support_request)
        if request.user.role in ['admin', 'director'] and support_request.user_id:
            NotificationService.create_notification(
                recipient=support_request.user,
                type=NotificationType.NEW_COMMENT,
                title=f"Ответ по обращению #{support_request.ticket_number}",
                message="Поддержка оставила новый комментарий по вашему обращению.",
                related_object_id=support_request.id,
                related_object_type='support_request',
                data={
                    'ticket_type': 'support_request',
                    'ticket_id': support_request.id,
                    'ticket_number': support_request.ticket_number,
                }
            )
        serializer = SupportMessageSerializer(message)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def transfer_to_arbitration(self, request, pk=None):
        """Передать обращение в арбитраж (создать арбитражное дело)"""
        support_request = self.get_object()
        
        from apps.arbitration.models import ArbitrationCase
        from apps.arbitration.serializers import ArbitrationCaseSerializer
        
        # Создаём арбитражное дело на основе обращения
        case_data = {
            'plaintiff_id': support_request.user_id,
            'subject': support_request.subject,
            'description': support_request.description,
            'reason': 'other',
            'priority': support_request.priority,
        }
        
        serializer = ArbitrationCaseSerializer(data=case_data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        arbitration_case = serializer.save()
        
        # Автоматически подаём дело
        arbitration_case.submit()
        
        # Удаляем обращение после успешной передачи в арбитраж
        support_request_id = support_request.id
        support_request.delete()
        
        log_activity(
            request.user,
            'transferred_to_arbitration',
            f'Обращение #{support_request.ticket_number} передано в арбитраж',
            meta={'support_request_id': support_request_id, 'case_id': arbitration_case.id}
        )
        
        return Response({
            'message': 'Обращение передано в арбитраж',
            'case': ArbitrationCaseSerializer(arbitration_case).data
        })

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_status = instance.status
        old_priority = instance.priority
        response = super().partial_update(request, *args, **kwargs)
        instance.refresh_from_db()
        if instance.status != old_status:
            status_labels = dict(SupportRequest.STATUS_CHOICES)
            log_activity(request.user, 'status_change',
                         f'Статус изменён: «{status_labels.get(old_status, old_status)}» → «{status_labels.get(instance.status, instance.status)}»',
                         meta={'old': old_status, 'new': instance.status},
                         support_request=instance)
        if instance.priority != old_priority:
            priority_labels = dict(SupportRequest.PRIORITY_CHOICES)
            log_activity(request.user, 'priority_change',
                         f'Приоритет изменён: «{priority_labels.get(old_priority, old_priority)}» → «{priority_labels.get(instance.priority, instance.priority)}»',
                         meta={'old': old_priority, 'new': instance.priority},
                         support_request=instance)
        return response


# ============= ОБРАЩЕНИЯ (CLAIMS) =============

class ClaimViewSet(viewsets.ModelViewSet):
    """ViewSet для обращений"""
    queryset = Claim.objects.all()
    serializer_class = ClaimSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """
        Разные права для разных действий:
        - create: любой авторизованный пользователь
        - list, retrieve: только администраторы или владелец претензии
        - update, partial_update, destroy, actions: только администраторы
        """
        if self.action in ['create', 'send_message']:
            return [IsAuthenticated()]
        elif self.action in ['list', 'retrieve']:
            # Для list и retrieve проверим в get_queryset
            return [IsAuthenticated()]
        else:
            # Для всех остальных действий (update, delete, actions) - только админы
            return [IsAdminUser()]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Администраторы видят все претензии
        if user.role == 'admin':
            status_filter = self.request.query_params.get('status')
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            return queryset
        
        # Обычные пользователи видят только свои претензии
        queryset = queryset.filter(user=user)
        return queryset
    
    def perform_create(self, serializer):
        """При создании претензии автоматически устанавливаем пользователя"""
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def take_in_work(self, request, pk=None):
        """Взять обращение в работу"""
        claim = self.get_object()
        claim.admin = request.user
        claim.status = 'in_progress'
        claim.save()
        log_activity(request.user, 'status_change', 'Статус изменён на «В работе»',
                     meta={'new': 'in_progress'}, claim=claim)
        return Response({'message': 'Обращение взято в работу'})
    
    @action(detail=True, methods=['post'])
    def complete_claim(self, request, pk=None):
        """Завершить обращение"""
        claim = self.get_object()
        claim.status = 'completed'
        claim.resolution = request.data.get('resolution', '')
        claim.completed_at = timezone.now()
        claim.save()
        log_activity(request.user, 'completed', 'Обращение завершено', claim=claim)
        return Response({'message': 'Обращение завершено'})
    
    @action(detail=True, methods=['post'])
    def process_refund(self, request, pk=None):
        """Обработка возврата средств по претензии"""
        claim = self.get_object()
        refund_percentage = request.data.get('refund_percentage', 0)
        refund_amount = request.data.get('refund_amount')
        
        # Сохраняем информацию о возврате
        claim.refund_percentage = refund_percentage
        if refund_amount:
            claim.refund_amount = refund_amount
        claim.status = 'completed'
        claim.completed_at = timezone.now()
        claim.save()
        
        log_activity(
            request.user,
            'completed',
            f'Оформлен возврат: {refund_percentage}%',
            meta={'refund_percentage': refund_percentage, 'refund_amount': refund_amount},
            claim=claim
        )
        return Response({'message': f'Возврат {refund_percentage}% оформлен'})
    
    @action(detail=True, methods=['post'])
    def reject_claim(self, request, pk=None):
        """Отклонить обращение"""
        claim = self.get_object()
        reason = request.data.get('reason', '')
        claim.status = 'completed'
        claim.resolution = f"Отклонено: {reason}"
        claim.completed_at = timezone.now()
        claim.save()
        log_activity(request.user, 'completed', f'Обращение отклонено: {reason}', claim=claim)
        return Response({'message': 'Обращение отклонено'})
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Отправить сообщение в претензию"""
        claim = self.get_object()
        msg_text = request.data.get('message', '')
        if not msg_text.strip():
            return Response({'error': 'Сообщение не может быть пустым'}, status=400)
        msg = ClaimMessage.objects.create(
            claim=claim,
            sender=request.user,
            message=msg_text,
            is_admin=(request.user.role in ['admin', 'director'])
        )
        log_activity(request.user, 'message', msg_text, claim=claim)
        if request.user.role in ['admin', 'director'] and claim.user_id:
            NotificationService.create_notification(
                recipient=claim.user,
                type=NotificationType.NEW_COMMENT,
                title=f"Ответ по обращению #{claim.ticket_number}",
                message="Поддержка оставила новый комментарий по вашему обращению.",
                related_object_id=claim.id,
                related_object_type='claim',
                data={
                    'ticket_type': 'claim',
                    'ticket_id': claim.id,
                    'ticket_number': claim.ticket_number,
                }
            )
        serializer = ClaimMessageSerializer(msg)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def assign_users(self, request, pk=None):
        """Назначить пользователей на претензию"""
        claim = self.get_object()
        user_ids = request.data.get('user_ids', [])
        
        if not isinstance(user_ids, list):
            return Response({'error': 'user_ids должен быть списком'}, status=400)
        
        users = User.objects.filter(id__in=user_ids)
        if len(users) != len(user_ids):
            return Response({'error': 'Некоторые пользователи не найдены'}, status=400)
        
        claim.assigned_users.set(users)
        names = ', '.join(f'{u.first_name} {u.last_name}'.strip() or u.username for u in users)
        log_activity(request.user, 'observer_added',
                     f'Назначены наблюдатели: {names}' if names else 'Наблюдатели обновлены',
                     meta={'user_ids': user_ids}, claim=claim)
        return Response({'message': f'Назначено {len(users)} пользователей'})
    
    @action(detail=True, methods=['post'])
    def add_tag(self, request, pk=None):
        """Добавить тег к претензии"""
        claim = self.get_object()
        tag = request.data.get('tag', '').strip()
        
        if not tag:
            return Response({'error': 'Тег не может быть пустым'}, status=400)
        
        claim.add_tag(tag)
        log_activity(request.user, 'tag_added', f'Добавлен тег {tag}',
                     meta={'tag': tag}, claim=claim)
        return Response({'message': f'Тег {tag} добавлен', 'tags': claim.get_tags_list()})
    
    @action(detail=True, methods=['post'])
    def remove_tag(self, request, pk=None):
        """Удалить тег из претензии"""
        claim = self.get_object()
        tag = request.data.get('tag', '').strip()
        
        if not tag:
            return Response({'error': 'Тег не может быть пустым'}, status=400)
        
        claim.remove_tag(tag)
        log_activity(request.user, 'tag_removed', f'Удалён тег {tag}',
                     meta={'tag': tag}, claim=claim)
        return Response({'message': f'Тег {tag} удален', 'tags': claim.get_tags_list()})
    
    @action(detail=True, methods=['post'])
    def update_tags(self, request, pk=None):
        """Обновить все теги претензии"""
        claim = self.get_object()
        tags = request.data.get('tags', '')
        claim.tags = tags
        claim.save(update_fields=['tags'])
        return Response({'message': 'Теги обновлены', 'tags': claim.get_tags_list()})

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_status = instance.status
        old_priority = instance.priority
        response = super().partial_update(request, *args, **kwargs)
        instance.refresh_from_db()
        if instance.status != old_status:
            status_labels = dict(Claim.STATUS_CHOICES)
            log_activity(request.user, 'status_change',
                         f'Статус изменён: «{status_labels.get(old_status, old_status)}» → «{status_labels.get(instance.status, instance.status)}»',
                         meta={'old': old_status, 'new': instance.status},
                         claim=instance)
        if instance.priority != old_priority:
            priority_labels = dict(Claim.PRIORITY_CHOICES)
            log_activity(request.user, 'priority_change',
                         f'Приоритет изменён: «{priority_labels.get(old_priority, old_priority)}» → «{priority_labels.get(instance.priority, instance.priority)}»',
                         meta={'old': old_priority, 'new': instance.priority},
                         claim=instance)
        return response


# ============= ЧАТЫ АДМИНИСТРАТОРОВ И ДИРЕКТОРА =============

class AdminChatRoomViewSet(viewsets.ModelViewSet):
    """ViewSet для чатов администраторов и директора (использует DirectorChatRoom)"""
    queryset = DirectorChatRoom.objects.all()
    serializer_class = DirectorChatRoomSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        """Показываем только чаты, где пользователь - участник"""
        return DirectorChatRoom.objects.filter(
            members=self.request.user,
            is_active=True
        ).prefetch_related('members', 'messages__sender').order_by('-updated_at')

    def perform_create(self, serializer):
        """При создании комнаты автоматически добавляем всех admin и director"""
        # Проверяем, существует ли уже чат с таким названием
        name = serializer.validated_data.get('name')
        if name:
            existing_room = DirectorChatRoom.objects.filter(
                name=name,
                is_active=True
            ).first()
            if existing_room:
                # Возвращаем существующий чат вместо создания нового
                staff = User.objects.filter(role__in=['admin', 'director'], is_active=True)
                existing_room.members.add(*staff)
                existing_room.save()
                # Вызываем исключение, чтобы остановить создание нового чата
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'name': 'Чат с таким названием уже существует'})
        
        room = serializer.save(created_by=self.request.user)
        staff = User.objects.filter(role__in=['admin', 'director'], is_active=True)
        room.members.set(staff)
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Отправить сообщение в чат"""
        room = self.get_object()
        message_text = request.data.get('message')
        
        if not message_text:
            return Response({'error': 'message обязателен'}, status=400)
        
        message = DirectorChatMessage.objects.create(
            room=room,
            sender=request.user,
            message=message_text
        )
        serializer = DirectorChatMessageSerializer(message)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def join_room(self, request, pk=None):
        """Присоединиться к чату"""
        room = self.get_object()
        room.members.add(request.user)
        return Response({'message': 'Вы присоединились к чату'})

    @action(detail=True, methods=['post'])
    def add_all_staff(self, request, pk=None):
        """Добавить всех admin и director в комнату"""
        room = self.get_object()
        staff = User.objects.filter(role__in=['admin', 'director'], is_active=True)
        room.members.add(*staff)
        return Response({'message': f'Добавлено {staff.count()} сотрудников'})
    
    @action(detail=True, methods=['post'])
    def leave_room(self, request, pk=None):
        """Покинуть чат"""
        room = self.get_object()
        room.members.remove(request.user)
        return Response({'message': 'Вы покинули чат'})

    @action(detail=True, methods=['get', 'post'])
    def messages(self, request, pk=None):
        """Получить или отправить сообщения в чат"""
        room = self.get_object()
        if request.method == 'GET':
            msgs = room.messages.select_related('sender').order_by('created_at')
            serializer = DirectorChatMessageSerializer(msgs, many=True)
            return Response(serializer.data)
        
        # POST
        msg_text = request.data.get('message', '').strip()
        if not msg_text:
            return Response({'error': 'Сообщение не может быть пустым'}, status=400)
        
        # Автоматически добавляем отправителя в участники
        room.members.add(request.user)
        msg = DirectorChatMessage.objects.create(room=room, sender=request.user, message=msg_text)
        serializer = DirectorChatMessageSerializer(msg)
        return Response(serializer.data, status=201)

    @action(detail=True, methods=['post'])
    def invite(self, request, pk=None):
        """Пригласить пользователя в чат"""
        room = self.get_object()
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id обязателен'}, status=400)
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'Пользователь не найден'}, status=404)
        
        room.members.add(user)
        return Response({'message': f'{user.first_name} {user.last_name} добавлен в чат'})


# ============= ПРЯМЫЕ ЧАТЫ (личные сообщения между сотрудниками) =============

@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_direct_chats(request):
    """Получить все прямые чаты текущего пользователя"""
    from apps.chat.models import Chat, Message
    chats = Chat.objects.filter(
        participants=request.user,
        order__isnull=True,
    ).prefetch_related('participants', 'messages__sender').order_by('-id')

    result = []
    for chat in chats:
        other = chat.participants.exclude(id=request.user.id).first()
        if not other:
            continue
        last_msg = chat.messages.last()
        unread = chat.messages.filter(is_read=False).exclude(sender=request.user).count()
        result.append({
            'id': chat.id,
            'other_user': {
                'id': other.id,
                'first_name': other.first_name,
                'last_name': other.last_name,
                'role': getattr(other, 'role', ''),
                'email': other.email,
            },
            'last_message': {'text': last_msg.text, 'created_at': last_msg.created_at.isoformat()} if last_msg else None,
            'unread_count': unread,
        })
    return Response(result)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def get_or_create_direct_chat(request):
    """Получить или создать прямой чат с пользователем"""
    from apps.chat.models import Chat
    user_id = request.data.get('user_id')
    if not user_id:
        return Response({'error': 'user_id обязателен'}, status=400)
    try:
        other = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Пользователь не найден'}, status=404)

    # Ищем существующий прямой чат между двумя пользователями
    chat = Chat.objects.filter(
        participants=request.user, order__isnull=True
    ).filter(participants=other).first()

    if not chat:
        chat = Chat.objects.create()
        chat.participants.add(request.user, other)

    return Response({'chat_id': chat.id})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_direct_chat_messages(request, chat_id):
    """Получить сообщения прямого чата"""
    from apps.chat.models import Chat, Message
    try:
        chat = Chat.objects.get(id=chat_id, participants=request.user)
    except Chat.DoesNotExist:
        return Response({'error': 'Чат не найден'}, status=404)

    # Помечаем как прочитанные
    Message.objects.filter(chat=chat, is_read=False).exclude(sender=request.user).update(is_read=True)

    msgs = chat.messages.select_related('sender').order_by('created_at')
    return Response([
        {
            'id': m.id,
            'text': m.text,
            'sender': {
                'id': m.sender.id,
                'first_name': m.sender.first_name,
                'last_name': m.sender.last_name,
                'role': getattr(m.sender, 'role', ''),
            },
            'created_at': m.created_at.isoformat(),
            'is_mine': m.sender_id == request.user.id,
        }
        for m in msgs
    ])


@api_view(['POST'])
@permission_classes([IsAdminUser])
def send_direct_message(request, chat_id):
    """Отправить сообщение в прямой чат"""
    from apps.chat.models import Chat, Message
    try:
        chat = Chat.objects.get(id=chat_id, participants=request.user)
    except Chat.DoesNotExist:
        return Response({'error': 'Чат не найден'}, status=404)

    text = request.data.get('message', '').strip()
    if not text:
        return Response({'error': 'Сообщение не может быть пустым'}, status=400)

    msg = Message.objects.create(chat=chat, sender=request.user, text=text, message_type='text')
    return Response({
        'id': msg.id,
        'text': msg.text,
        'sender': {
            'id': request.user.id,
            'first_name': request.user.first_name,
            'last_name': request.user.last_name,
            'role': getattr(request.user, 'role', ''),
        },
        'created_at': msg.created_at.isoformat(),
        'is_mine': True,
    }, status=201)


# ============= СТАТИСТИКА =============

@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_admin_stats(request):
    """Получить общую статистику для админ-панели"""
    stats = {
        'total_users': User.objects.count(),
        'active_users': User.objects.filter(is_active=True).count(),
        'blocked_users': User.objects.filter(is_active=False).count(),
        'total_orders': Order.objects.count(),
        'active_orders': Order.objects.filter(status__in=['pending', 'in_progress']).count(),
        'problem_orders': Order.objects.filter(Q(status='disputed') | Q(status='cancelled')).count(),
        'open_support_requests': SupportRequest.objects.filter(status='open').count(),
        'new_claims': Claim.objects.filter(status='new').count(),
    }
    return Response(stats)


# ============= ЧАТЫ С ТЕХПОДДЕРЖКОЙ =============

@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_support_chats(request):
    """Получить все чаты с техподдержкой"""
    from apps.chat.models import Chat, Message
    
    # Находим пользователя техподдержки (та же логика, что в apps/users/views.py)
    qs = User.objects.filter(is_active=True)
    support_user = qs.filter(is_staff=True, username__iexact='support').first()
    if not support_user:
        support_user = qs.filter(is_staff=True, username__iexact='administrator').first() or qs.filter(
            is_staff=True, username__iexact='admin'
        ).first()
    if not support_user:
        support_user = qs.filter(is_staff=True).order_by('id').first()
    
    if not support_user:
        return Response({'error': 'Пользователь техподдержки не найден'}, status=404)
    
    # Получаем все чаты с участием техподдержки
    chats = Chat.objects.filter(participants=support_user).prefetch_related(
        'participants', 'messages', 'messages__sender'
    ).order_by('-id')
    
    # Формируем ответ в формате, совместимом с SupportChatsSection
    result = []
    for chat in chats:
        # Находим клиента (не техподдержка)
        client = chat.participants.exclude(id=support_user.id).first()
        if not client:
            continue
            
        last_message = chat.messages.last()
        unread_count = chat.messages.filter(is_read=False).exclude(sender=request.user).count()
        
        # Получаем все сообщения чата
        messages = []
        for msg in chat.messages.all():
            messages.append({
                'id': msg.id,
                'text': msg.text,
                'sender': {
                    'id': msg.sender.id,
                    'first_name': msg.sender.first_name,
                    'last_name': msg.sender.last_name,
                    'role': msg.sender.role,
                    'is_admin': msg.sender.role == 'admin',
                },
                'created_at': msg.created_at.isoformat(),
                'is_mine': msg.sender == request.user,
            })
        
        result.append({
            'id': chat.id,
            'client': {
                'id': client.id,
                'username': client.username,
                'first_name': client.first_name,
                'last_name': client.last_name,
                'email': client.email,
                'avatar': None,
            },
            'admin': {
                'id': support_user.id,
                'first_name': support_user.first_name,
                'last_name': support_user.last_name,
                'role': support_user.role,
            } if support_user else None,
            'status': 'open',  # Можно добавить логику определения статуса
            'priority': 'medium',  # Можно добавить логику определения приоритета
            'subject': chat.context_title or 'Обращение в поддержку',
            'messages': messages,
            'last_message': {
                'text': last_message.text if last_message else '',
                'created_at': last_message.created_at.isoformat() if last_message else '',
            } if last_message else None,
            'unread_count': unread_count,
            'created_at': chat.messages.first().created_at.isoformat() if chat.messages.exists() else '',
            'updated_at': last_message.created_at.isoformat() if last_message else '',
        })
    
    return Response(result)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def send_support_chat_message(request, chat_id):
    """Отправить сообщение в чат техподдержки"""
    from apps.chat.models import Chat, Message
    
    try:
        chat = Chat.objects.get(id=chat_id)
    except Chat.DoesNotExist:
        return Response({'error': 'Чат не найден'}, status=404)
    
    message_text = request.data.get('message', '')
    if not message_text:
        return Response({'error': 'Сообщение не может быть пустым'}, status=400)
    
    # Создаем сообщение
    message = Message.objects.create(
        chat=chat,
        sender=request.user,
        text=message_text,
        message_type='text'
    )
    
    return Response({
        'id': message.id,
        'text': message.text,
        'sender': {
            'id': message.sender.id,
            'first_name': message.sender.first_name,
            'last_name': message.sender.last_name,
            'role': message.sender.role,
            'is_admin': message.sender.role == 'admin',
        },
        'created_at': message.created_at.isoformat(),
        'is_mine': True,
    })


# ============= ПРОСМОТР ПЕРЕПИСОК ПОЛЬЗОВАТЕЛЕЙ =============

@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_user_chats(request):
    """Получить все переписки пользователей на платформе"""
    from apps.chat.models import Chat, Message
    from django.db.models import Max, Count, Q
    
    # Получаем все чаты с аннотациями
    chats = Chat.objects.annotate(
        last_message_time=Max('messages__created_at'),
        message_count=Count('messages')
    ).filter(
        message_count__gt=0  # Только чаты с сообщениями
    ).select_related(
        'order', 'client', 'expert'
    ).prefetch_related(
        'participants', 'messages', 'messages__sender'
    ).order_by('-last_message_time')
    
    # Формируем ответ
    result = []
    for chat in chats:
        participants_list = []
        for participant in chat.participants.all():
            participants_list.append({
                'id': participant.id,
                'username': participant.username,
                'first_name': participant.first_name,
                'last_name': participant.last_name,
                'email': participant.email,
                'role': participant.role,
                'avatar': None,
                'online': False,  # Можно добавить логику определения онлайн-статуса
            })
        
        last_message = chat.messages.last()
        
        # Получаем все сообщения чата
        messages = []
        for msg in chat.messages.all():
            messages.append({
                'id': msg.id,
                'text': msg.text,
                'file': msg.file.url if msg.file else None,
                'file_name': msg.file_name,
                'message_type': msg.message_type,
                'offer_data': msg.offer_data,
                'sender': {
                    'id': msg.sender.id,
                    'username': msg.sender.username,
                    'first_name': msg.sender.first_name,
                    'last_name': msg.sender.last_name,
                    'role': msg.sender.role,
                },
                'is_read': msg.is_read,
                'created_at': msg.created_at.isoformat(),
            })
        
        chat_data = {
            'id': chat.id,
            'order_id': chat.order.id if chat.order else None,
            'order_title': chat.order.title if chat.order else None,
            'context_title': chat.context_title,
            'participants': participants_list,
            'client': {
                'id': chat.client.id,
                'username': chat.client.username,
                'first_name': chat.client.first_name,
                'last_name': chat.client.last_name,
                'email': chat.client.email,
            } if chat.client else None,
            'expert': {
                'id': chat.expert.id,
                'username': chat.expert.username,
                'first_name': chat.expert.first_name,
                'last_name': chat.expert.last_name,
                'email': chat.expert.email,
            } if chat.expert else None,
            'messages': messages,
            'last_message': {
                'text': last_message.text if last_message else '',
                'sender': {
                    'first_name': last_message.sender.first_name,
                    'last_name': last_message.sender.last_name,
                } if last_message else None,
                'created_at': last_message.created_at.isoformat() if last_message else '',
            } if last_message else None,
            'message_count': chat.message_count,
            'created_at': chat.messages.first().created_at.isoformat() if chat.messages.exists() else '',
            'updated_at': last_message.created_at.isoformat() if last_message else '',
        }
        
        result.append(chat_data)
    
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_user_history(request, user_id):
    """История пользователя: тикеты, заказы, регистрация"""
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Пользователь не найден'}, status=404)

    # Тикеты поддержки
    support_requests = SupportRequest.objects.filter(user=user).order_by('-created_at').values(
        'id', 'ticket_number', 'subject', 'status', 'priority', 'created_at', 'completed_at'
    )

    # Претензии
    claims = Claim.objects.filter(user=user).order_by('-created_at').values(
        'id', 'ticket_number', 'subject', 'status', 'priority', 'claim_type', 'created_at', 'completed_at'
    )

    # Заказы
    orders = Order.objects.filter(
        Q(client=user) | Q(expert=user)
    ).order_by('-created_at').values(
        'id', 'title', 'status', 'created_at', 'price'
    )[:20]

    return Response({
        'user': {
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'role': user.role,
            'is_active': user.is_active,
            'date_joined': user.date_joined,
        },
        'support_requests': list(support_requests),
        'claims': list(claims),
        'orders': list(orders),
        'stats': {
            'total_tickets': support_requests.count() + claims.count(),
            'open_tickets': SupportRequest.objects.filter(user=user, status='open').count() +
                           Claim.objects.filter(user=user, status='open').count(),
            'total_orders': Order.objects.filter(Q(client=user) | Q(expert=user)).count(),
        }
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def report_message(request, message_id):
    """Создать жалобу на сообщение"""
    from apps.chat.models import Message, ContactViolationLog
    
    try:
        message = Message.objects.select_related('chat', 'sender').get(id=message_id)
    except Message.DoesNotExist:
        return Response({'error': 'Сообщение не найдено'}, status=404)
    
    reason = request.data.get('reason', 'Жалоба от администратора')
    action = request.data.get('action', 'warning')  # warning, ban, message_blocked
    notes = request.data.get('notes', '')
    
    # Создаем лог нарушения
    violation = ContactViolationLog.objects.create(
        user=message.sender,
        chat=message.chat,
        message=message,
        violation_text=message.text,
        action_taken=action,
        notes=f"{reason}. {notes}".strip()
    )
    
    # Если действие - бан, блокируем пользователя
    if action == 'ban':
        message.sender.is_active = False
        message.sender.save()
    
    return Response({
        'status': 'success',
        'violation_id': violation.id,
        'message': f'Жалоба зарегистрирована. Действие: {violation.get_action_taken_display()}'
    })


# ============= ЛЕНТА АКТИВНОСТИ ТИКЕТА =============

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_ticket_activity(request, ticket_type, pk):
    """
    Возвращает объединённую ленту:
    - Сообщения из тикета (SupportMessage / ClaimMessage)
    - События активности (TicketActivity)
    - Сообщения из связанного support_chat (если есть)
    """
    from .serializers import TicketActivitySerializer

    if ticket_type == 'support-requests':
        try:
            ticket = SupportRequest.objects.get(pk=pk)
        except SupportRequest.DoesNotExist:
            return Response({'error': 'Тикет не найден'}, status=404)
        if not can_access_ticket(request.user, ticket):
            return Response({'error': 'Недостаточно прав'}, status=403)

        # Сообщения тикета
        ticket_messages = [
            {
                'kind': 'message',
                'id': f'tm_{m.id}',
                'sender': {
                    'id': m.sender.id,
                    'first_name': m.sender.first_name,
                    'last_name': m.sender.last_name,
                    'role': getattr(m.sender, 'role', ''),
                },
                'text': m.message,
                'is_admin': m.is_admin,
                'source': 'ticket',
                'created_at': m.created_at.isoformat(),
            }
            for m in ticket.messages.select_related('sender').all()
        ]

        # Сообщения из связанного чата
        chat_messages = []
        if ticket.support_chat_id:
            from apps.chat.models import Message as ChatMessage
            for m in ChatMessage.objects.filter(chat_id=ticket.support_chat_id).select_related('sender').order_by('created_at'):
                chat_messages.append({
                    'kind': 'message',
                    'id': f'cm_{m.id}',
                    'sender': {
                        'id': m.sender.id,
                        'first_name': m.sender.first_name,
                        'last_name': m.sender.last_name,
                        'role': getattr(m.sender, 'role', ''),
                    },
                    'text': m.text,
                    'is_admin': getattr(m.sender, 'role', '') in ['admin', 'director'],
                    'source': 'chat',
                    'created_at': m.created_at.isoformat(),
                })

        # Активность
        activities = [
            {
                'kind': 'activity',
                'id': f'act_{a.id}',
                'activity_type': a.activity_type,
                'text': a.text,
                'meta': a.meta,
                'actor': {
                    'id': a.actor.id if a.actor else None,
                    'first_name': a.actor.first_name if a.actor else '',
                    'last_name': a.actor.last_name if a.actor else '',
                } if a.actor else None,
                'created_at': a.created_at.isoformat(),
            }
            for a in ticket.activities.select_related('actor').all()
        ]

    elif ticket_type == 'claims':
        try:
            ticket = Claim.objects.get(pk=pk)
        except Claim.DoesNotExist:
            return Response({'error': 'Тикет не найден'}, status=404)
        if not can_access_ticket(request.user, ticket):
            return Response({'error': 'Недостаточно прав'}, status=403)

        ticket_messages = [
            {
                'kind': 'message',
                'id': f'tm_{m.id}',
                'sender': {
                    'id': m.sender.id,
                    'first_name': m.sender.first_name,
                    'last_name': m.sender.last_name,
                    'role': getattr(m.sender, 'role', ''),
                },
                'text': m.message,
                'is_admin': m.is_admin,
                'source': 'ticket',
                'created_at': m.created_at.isoformat(),
            }
            for m in ticket.messages.select_related('sender').all()
        ]

        chat_messages = []

        activities = [
            {
                'kind': 'activity',
                'id': f'act_{a.id}',
                'activity_type': a.activity_type,
                'text': a.text,
                'meta': a.meta,
                'actor': {
                    'id': a.actor.id if a.actor else None,
                    'first_name': a.actor.first_name if a.actor else '',
                    'last_name': a.actor.last_name if a.actor else '',
                } if a.actor else None,
                'created_at': a.created_at.isoformat(),
            }
            for a in ticket.activities.select_related('actor').all()
        ]
    else:
        return Response({'error': 'Неверный тип тикета'}, status=400)

    # Объединяем и сортируем по времени
    all_items = ticket_messages + chat_messages + activities
    all_items.sort(key=lambda x: x['created_at'])

    return Response({
        'messages': ticket_messages + chat_messages,
        'activities': activities,
        'feed': all_items,
    })
