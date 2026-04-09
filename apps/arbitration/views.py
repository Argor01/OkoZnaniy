from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db import models
from django.db.models import Q
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import ArbitrationCase, ArbitrationMessage, ArbitrationActivity, Complaint
from .serializers import (
    ArbitrationCaseSerializer,
    ArbitrationCaseListSerializer,
    ArbitrationMessageSerializer,
    ArbitrationActivitySerializer,
    ArbitrationSubmissionSerializer,
    ComplaintSerializer
)
from apps.orders.models import Order
from apps.chat.models import Chat, Message as ChatMessage
from apps.notifications.models import NotificationType
from apps.notifications.services import NotificationService

User = get_user_model()


class IsAdminUser(IsAuthenticated):
    """Проверка прав администратора"""
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return hasattr(request.user, 'role') and request.user.role == 'admin'


def log_activity(case, actor, activity_type, description, metadata=None):
    """Записать событие в ленту активности"""
    ArbitrationActivity.objects.create(
        case=case,
        actor=actor,
        activity_type=activity_type,
        description=description,
        metadata=metadata or {}
    )


def freeze_case_context(case):
    """Заморозить заказ и связанный чат на время арбитража."""
    if not case.order_id:
        return

    order = case.order
    if order:
        order.freeze(f'Открыт арбитраж {case.case_number}')
        if not order.has_issues:
            order.has_issues = True
            order.save(update_fields=['has_issues', 'updated_at'])

    for chat in Chat.objects.filter(order_id=case.order_id):
        chat.freeze(f'Открыт арбитраж {case.case_number}')


def unfreeze_case_context(case):
    """Разморозить заказ и чат, если по заказу не осталось активных арбитражей."""
    if not case.order_id:
        return

    has_active_cases = ArbitrationCase.objects.filter(order_id=case.order_id).exclude(
        id=case.id
    ).exclude(status__in=['closed', 'rejected']).exists()

    if has_active_cases:
        return

    order = case.order
    if order:
        order.unfreeze()
        if order.has_issues:
            order.has_issues = False
            order.save(update_fields=['has_issues', 'updated_at'])

    for chat in Chat.objects.filter(order_id=case.order_id):
        chat.unfreeze()


def notify_case_participants(case, *, title, message_text, exclude_user_ids=None, notification_type=NotificationType.NEW_COMMENT):
    exclude_ids = set(exclude_user_ids or [])
    recipients = []
    for user in [case.plaintiff, case.defendant]:
        if user and user.id not in exclude_ids:
            recipients.append(user)

    for recipient in recipients:
        NotificationService.create_notification(
            recipient=recipient,
            type=notification_type,
            title=title,
            message=message_text,
            related_object_id=case.id,
            related_object_type='arbitration_case',
            data={
                'ticket_type': 'arbitration_case',
                'case_id': case.id,
                'case_number': case.case_number,
                'order_id': case.order_id,
            }
        )


class ArbitrationCaseViewSet(viewsets.ModelViewSet):
    """ViewSet для арбитражных дел"""
    queryset = ArbitrationCase.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ArbitrationCaseListSerializer
        elif self.action == 'submit_claim':
            return ArbitrationSubmissionSerializer
        return ArbitrationCaseSerializer
    
    def get_permissions(self):
        """
        Разные права для разных действий:
        - create, submit_claim: любой авторизованный пользователь
        - list, retrieve: пользователь видит свои дела или админы видят все
        - update, partial_update, destroy, admin actions: только администраторы
        """
        if self.action in ['create', 'submit_claim', 'send_message', 'activity_feed']:
            return [IsAuthenticated()]
        elif self.action in ['list', 'retrieve', 'my_cases']:
            return [IsAuthenticated()]
        else:
            return [IsAdminUser()]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Администраторы видят все дела
        if user.role == 'admin':
            # Фильтры для админов
            status_filter = self.request.query_params.get('status')
            priority_filter = self.request.query_params.get('priority')
            assigned_to_me = self.request.query_params.get('assigned_to_me')
            
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            if priority_filter:
                queryset = queryset.filter(priority=priority_filter)
            if assigned_to_me == 'true':
                queryset = queryset.filter(assigned_admin=user)
            
            return queryset.select_related(
                'plaintiff', 'defendant', 'assigned_admin', 'order'
            ).prefetch_related('assigned_users', 'messages', 'activities')
        
        # Обычные пользователи видят только свои дела (как истец или ответчик)
        queryset = queryset.filter(
            Q(plaintiff=user) | Q(defendant=user)
        ).select_related(
            'plaintiff', 'defendant', 'assigned_admin', 'order'
        ).prefetch_related('messages')
        
        return queryset
    
    def perform_create(self, serializer):
        """При создании дела автоматически устанавливаем истца"""
        case = serializer.save(plaintiff=self.request.user)
        log_activity(
            case,
            self.request.user,
            'created',
            f'Дело создано пользователем {self.request.user.get_full_name() or self.request.user.username}'
        )
    
    @action(detail=False, methods=['post'], url_path='submit-claim')
    def submit_claim(self, request):
        """
        Пошаговая подача претензии
        POST /api/arbitration/cases/submit-claim/
        """
        serializer = ArbitrationSubmissionSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        case = serializer.save()
        
        # Автоматически подаем дело
        case.submit()
        freeze_case_context(case)
        
        log_activity(
            case,
            request.user,
            'submitted',
            f'Дело подано пользователем {request.user.get_full_name() or request.user.username}'
        )

        notify_case_participants(
            case,
            title=f'Открыт арбитраж {case.case_number}',
            message_text='По заказу открыт арбитраж. Заказ и переписка временно заморожены до решения.',
            exclude_user_ids=[],
            notification_type=NotificationType.STATUS_CHANGED,
        )
        
        return Response(
            ArbitrationCaseSerializer(case).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=False, methods=['get'], url_path='my-cases')
    def my_cases(self, request):
        """Получить все дела текущего пользователя"""
        cases = self.get_queryset().filter(
            Q(plaintiff=request.user) | Q(defendant=request.user)
        )
        serializer = ArbitrationCaseListSerializer(cases, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='take-in-work')
    def take_in_work(self, request, pk=None):
        """Взять дело в работу (только для админов)"""
        case = self.get_object()
        
        old_status = case.status
        if case.status == 'submitted':
            case.status = 'under_review'
        elif case.status in ['draft', 'awaiting_response']:
            case.status = 'in_arbitration'
        
        case.assigned_admin = request.user
        case.save()
        
        log_activity(
            case,
            request.user,
            'admin_assigned',
            f'Администратор {request.user.get_full_name() or request.user.username} взял дело в работу',
            {'old_status': old_status, 'new_status': case.status}
        )

        notify_case_participants(
            case,
            title=f'Арбитраж {case.case_number} принят в работу',
            message_text='Администратор взял арбитраж в работу. Следите за обновлениями в центре обращений.',
            exclude_user_ids=[request.user.id],
            notification_type=NotificationType.STATUS_CHANGED,
        )
        
        return Response({
            'message': 'Дело взято в работу',
            'case': ArbitrationCaseSerializer(case).data
        })
    
    @action(detail=True, methods=['post'], url_path='send-message')
    def send_message(self, request, pk=None):
        """Отправить сообщение в дело"""
        case = self.get_object()
        text = request.data.get('message', '').strip()
        is_internal = request.data.get('is_internal', False)
        
        if not text:
            return Response(
                {'error': 'Сообщение не может быть пустым'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Определяем тип сообщения
        if request.user.role == 'admin':
            message_type = 'admin'
        elif request.user == case.plaintiff:
            message_type = 'plaintiff'
        elif request.user == case.defendant:
            message_type = 'defendant'
        else:
            return Response(
                {'error': 'У вас нет прав для отправки сообщений в это дело'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Создаем сообщение
        message = ArbitrationMessage.objects.create(
            case=case,
            sender=request.user,
            message_type=message_type,
            text=text,
            is_internal=is_internal and request.user.role == 'admin'
        )
        
        # Логируем активность
        if not is_internal:
            log_activity(
                case,
                request.user,
                'message_sent',
                f'Сообщение от {request.user.get_full_name() or request.user.username}'
            )
            notify_case_participants(
                case,
                title=f'Новое сообщение по арбитражу {case.case_number}',
                message_text='По арбитражу появился новый комментарий. Откройте центр обращений, чтобы посмотреть детали.',
                exclude_user_ids=[request.user.id],
            )
        
        return Response(
            ArbitrationMessageSerializer(message).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'], url_path='update-status')
    def update_status(self, request, pk=None):
        """Обновить статус дела (только для админов)"""
        case = self.get_object()
        new_status = request.data.get('status')
        
        if not new_status:
            return Response(
                {'error': 'Статус обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_status = case.status
        case.status = new_status
        
        if new_status == 'closed':
            case.closed_at = timezone.now()
        
        case.save()
        
        status_labels = dict(ArbitrationCase.STATUS_CHOICES)
        log_activity(
            case,
            request.user,
            'status_changed',
            f'Статус изменен: {status_labels.get(old_status, old_status)} → {status_labels.get(new_status, new_status)}',
            {'old_status': old_status, 'new_status': new_status}
        )

        if new_status in ['closed', 'rejected']:
            unfreeze_case_context(case)

        notify_case_participants(
            case,
            title=f'Обновлён статус арбитража {case.case_number}',
            message_text=f'Статус арбитража изменён на «{status_labels.get(new_status, new_status)}».',
            exclude_user_ids=[request.user.id],
            notification_type=NotificationType.STATUS_CHANGED,
        )
        
        return Response({
            'message': 'Статус обновлен',
            'case': ArbitrationCaseSerializer(case).data
        })
    
    @action(detail=True, methods=['post'], url_path='make-decision')
    def make_decision(self, request, pk=None):
        """Принять решение по делу (только для админов)"""
        case = self.get_object()
        decision_text = request.data.get('decision', '').strip()
        approved_refund_percentage = request.data.get('approved_refund_percentage')
        approved_refund_amount = request.data.get('approved_refund_amount')
        
        if not decision_text:
            return Response(
                {'error': 'Текст решения обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        case.decision = decision_text
        case.decision_made_by = request.user
        case.decision_date = timezone.now()
        case.status = 'decision_made'
        
        if approved_refund_percentage is not None:
            case.approved_refund_percentage = approved_refund_percentage
        if approved_refund_amount is not None:
            case.approved_refund_amount = approved_refund_amount
        
        case.save()
        
        log_activity(
            case,
            request.user,
            'decision_made',
            f'Решение принято администратором {request.user.get_full_name() or request.user.username}',
            {
                'approved_refund_percentage': str(approved_refund_percentage) if approved_refund_percentage else None,
                'approved_refund_amount': str(approved_refund_amount) if approved_refund_amount else None
            }
        )
        
        return Response({
            'message': 'Решение принято',
            'case': ArbitrationCaseSerializer(case).data
        })
    
    @action(detail=True, methods=['post'], url_path='process-refund')
    def process_refund(self, request, pk=None):
        """Оформить возврат средств (только для админов)"""
        case = self.get_object()
        refund_percentage = request.data.get('refund_percentage', 0)
        refund_amount = request.data.get('refund_amount')
        
        case.approved_refund_percentage = refund_percentage
        if refund_amount:
            case.approved_refund_amount = refund_amount
        
        case.status = 'decision_made'
        case.save()
        
        log_activity(
            case,
            request.user,
            'refund_processed',
            f'Оформлен возврат: {refund_percentage}%',
            {
                'refund_percentage': str(refund_percentage),
                'refund_amount': str(refund_amount) if refund_amount else None
            }
        )
        
        return Response({
            'message': f'Возврат {refund_percentage}% оформлен',
            'case': ArbitrationCaseSerializer(case).data
        })
    
    @action(detail=True, methods=['post'], url_path='close-case')
    def close_case(self, request, pk=None):
        """Закрыть дело (только для админов)"""
        case = self.get_object()
        final_message = request.data.get('message', '').strip()
        
        if final_message:
            # Отправляем финальное сообщение
            ArbitrationMessage.objects.create(
                case=case,
                sender=request.user,
                message_type='admin',
                text=final_message,
                is_internal=False
            )
        
        case.status = 'closed'
        case.closed_at = timezone.now()
        case.save()
        unfreeze_case_context(case)
        
        log_activity(
            case,
            request.user,
            'closed',
            f'Дело закрыто администратором {request.user.get_full_name() or request.user.username}'
        )

        notify_case_participants(
            case,
            title=f'Арбитраж {case.case_number} закрыт',
            message_text='Арбитраж завершён. Заказ и переписка снова доступны в обычном режиме.',
            exclude_user_ids=[request.user.id],
            notification_type=NotificationType.STATUS_CHANGED,
        )
        
        return Response({
            'message': 'Дело закрыто',
            'case': ArbitrationCaseSerializer(case).data
        })
    
    @action(detail=True, methods=['post'], url_path='assign-users')
    def assign_users(self, request, pk=None):
        """Назначить наблюдателей на дело (только для админов)"""
        case = self.get_object()
        user_ids = request.data.get('user_ids', [])
        
        if not isinstance(user_ids, list):
            return Response(
                {'error': 'user_ids должен быть списком'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        users = User.objects.filter(id__in=user_ids)
        if len(users) != len(user_ids):
            return Response(
                {'error': 'Некоторые пользователи не найдены'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        case.assigned_users.set(users)
        
        names = ', '.join(
            f'{u.first_name} {u.last_name}'.strip() or u.username
            for u in users
        )
        log_activity(
            case,
            request.user,
            'observer_added',
            f'Назначены наблюдатели: {names}' if names else 'Наблюдатели обновлены',
            {'user_ids': user_ids}
        )
        
        return Response({
            'message': f'Назначено {len(users)} наблюдателей',
            'case': ArbitrationCaseSerializer(case).data
        })
    
    @action(detail=True, methods=['get'], url_path='activity-feed')
    def activity_feed(self, request, pk=None):
        """Получить объединенную ленту сообщений и активностей"""
        case = self.get_object()
        
        # Сообщения
        messages = [
            {
                'kind': 'message',
                'id': f'msg_{m.id}',
                'sender': {
                    'id': m.sender.id,
                    'first_name': m.sender.first_name,
                    'last_name': m.sender.last_name,
                    'role': getattr(m.sender, 'role', ''),
                },
                'text': m.text,
                'message_type': m.message_type,
                'is_internal': m.is_internal,
                'created_at': m.created_at.isoformat(),
            }
            for m in case.messages.select_related('sender').all()
            if not m.is_internal or request.user.role == 'admin'
        ]
        
        # Активности
        activities = [
            {
                'kind': 'activity',
                'id': f'act_{a.id}',
                'activity_type': a.activity_type,
                'text': a.description,
                'description': a.description,
                'metadata': a.metadata,
                'actor': {
                    'id': a.actor.id if a.actor else None,
                    'first_name': a.actor.first_name if a.actor else '',
                    'last_name': a.actor.last_name if a.actor else '',
                } if a.actor else None,
                'created_at': a.created_at.isoformat(),
            }
            for a in case.activities.select_related('actor').all()
        ]

        order_chat_messages = []
        if request.user.role == 'admin' and case.order_id:
            chat_messages = ChatMessage.objects.filter(
                chat__order_id=case.order_id
            ).select_related('sender', 'chat').order_by('created_at')

            for chat_message in chat_messages:
                order_chat_messages.append({
                    'kind': 'message',
                    'id': f'chat_{chat_message.id}',
                    'sender': {
                        'id': chat_message.sender.id,
                        'first_name': chat_message.sender.first_name,
                        'last_name': chat_message.sender.last_name,
                        'role': getattr(chat_message.sender, 'role', ''),
                    },
                    'text': chat_message.text or (chat_message.file_name or 'Файл в чате заказа'),
                    'message_type': chat_message.message_type,
                    'is_internal': False,
                    'source': 'order_chat',
                    'chat_id': chat_message.chat_id,
                    'created_at': chat_message.created_at.isoformat(),
                })
        
        # Объединяем и сортируем
        feed = messages + activities + order_chat_messages
        feed.sort(key=lambda x: x['created_at'])
        
        return Response({
            'messages': messages,
            'activities': activities,
            'order_chat_messages': order_chat_messages,
            'feed': feed
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def arbitration_stats(request):
    """Статистика по арбитражу для админ-панели"""
    # Проверяем, что пользователь - админ
    if not hasattr(request.user, 'role') or request.user.role != 'admin':
        return Response(
            {'detail': 'У вас нет прав для просмотра статистики'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    stats = {
        'total_cases': ArbitrationCase.objects.count(),
        'new_cases': ArbitrationCase.objects.filter(status='submitted').count(),
        'in_progress': ArbitrationCase.objects.filter(
            status__in=['under_review', 'in_arbitration']
        ).count(),
        'awaiting_decision': ArbitrationCase.objects.filter(
            status='awaiting_response'
        ).count(),
        'closed_cases': ArbitrationCase.objects.filter(status='closed').count(),
        'urgent_cases': ArbitrationCase.objects.filter(
            priority='urgent',
            status__in=['submitted', 'under_review', 'in_arbitration']
        ).count(),
    }
    return Response(stats)


class ComplaintViewSet(viewsets.ModelViewSet):
    """ViewSet для претензий по заказам"""
    queryset = Complaint.objects.all()
    serializer_class = ComplaintSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Пользователи видят только свои претензии (как истец или ответчик)"""
        user = self.request.user
        queryset = Complaint.objects.select_related('order', 'plaintiff', 'defendant')
        
        # Админы видят все претензии
        if user.role == 'admin':
            # Фильтр по статусу для админов
            status_filter = self.request.query_params.get('status')
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            return queryset
        
        # Обычные пользователи видят только свои претензии
        queryset = queryset.filter(
            models.Q(plaintiff=user) | models.Q(defendant=user)
        )
        
        # Фильтр по статусу
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset
    
    def perform_create(self, serializer):
        """При создании претензии автоматически замораживаем заказ"""
        complaint = serializer.save()
        
        # Замораживаем заказ
        if complaint.order:
            complaint.order.freeze(f'Открыта претензия #{complaint.id}')
    
    @action(detail=True, methods=['patch'], url_path='close')
    def close_complaint(self, request, pk=None):
        """Закрыть претензию (доступно истцу, ответчику или админу)"""
        complaint = self.get_object()
        user = request.user
        
        # Проверяем права
        is_plaintiff = complaint.plaintiff_id == user.id
        is_defendant = complaint.defendant_id == user.id
        is_admin = user.role == 'admin'
        
        if not (is_plaintiff or is_defendant or is_admin):
            return Response(
                {'detail': 'Недостаточно прав для закрытия претензии'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Можно закрыть только открытую претензию
        if complaint.status not in ['open', 'in_progress']:
            return Response(
                {'detail': 'Можно закрыть только открытую претензию'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        resolution = request.data.get('resolution', '').strip()
        
        # Закрываем претензию
        complaint.close(resolution)
        
        # Размораживаем заказ
        if complaint.order:
            complaint.order.unfreeze()
        
        return Response(ComplaintSerializer(complaint).data)
    
    @action(detail=True, methods=['patch'], url_path='resolve')
    def resolve_complaint(self, request, pk=None):
        """Разрешить претензию (только для админов)"""
        complaint = self.get_object()
        user = request.user
        
        if user.role != 'admin':
            return Response(
                {'detail': 'Только администратор может разрешить претензию'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        resolution = request.data.get('resolution', '').strip()
        if not resolution:
            return Response(
                {'detail': 'Резолюция обязательна'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Разрешаем претензию
        complaint.resolve(resolution)
        
        # Размораживаем заказ
        if complaint.order:
            complaint.order.unfreeze()
        
        return Response(ComplaintSerializer(complaint).data)
    
    @action(detail=False, methods=['get'], url_path='by-order/(?P<order_id>[^/.]+)')
    def by_order(self, request, order_id=None):
        """Получить претензии по заказу"""
        complaints = Complaint.objects.filter(
            order_id=order_id
        ).select_related('plaintiff', 'defendant', 'order')
        
        serializer = ComplaintSerializer(complaints, many=True)
        return Response(serializer.data)
