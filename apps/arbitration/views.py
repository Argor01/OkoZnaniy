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
from apps.chat.services import get_or_create_order_chat
from apps.chat.websocket_utils import (
    notify_arbitration_message,
    notify_arbitration_status,
    notify_arbitration_activity,
    notify_chat_message,
)
from apps.notifications.models import NotificationType
from apps.notifications.services import NotificationService
from apps.core.safe_notify import safe_call
from apps.wallet.policy import order_quote, money
from apps.wallet.services import WalletService
from apps.orders.views import _active_order_hold
from decimal import Decimal

User = get_user_model()


class IsAdminUser(IsAuthenticated):
    """Проверка прав администратора"""
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return hasattr(request.user, 'role') and request.user.role == 'admin'


# Статусы арбитражного дела, в которых админ уже взял его в работу —
# только тогда разрешено писать сообщения и оформлять возврат.
ARBITRATION_IN_PROGRESS_STATUSES = (
    'under_review',
    'in_arbitration',
    'awaiting_response',
    'pending_approval',
)

# Финальные статусы арбитражного дела, после которых переписка и возврат закрыты.
ARBITRATION_CLOSED_STATUSES = (
    'decision_made',
    'closed',
    'rejected',
)

# Финальные статусы претензии (Complaint), после которых переписка закрыта.
COMPLAINT_CLOSED_STATUSES = ('resolved', 'closed')


def ensure_case_taken_into_work(case):
    """Возвращает Response с 400, если дело ещё не взято в работу,
    иначе None. Используется для блокировки write/refund до 'take_in_work'."""
    if case.status in ARBITRATION_IN_PROGRESS_STATUSES:
        return None
    if case.status == 'submitted':
        return Response(
            {'detail': 'Сначала возьмите дело в работу, чтобы писать или оформлять возврат.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response(
        {'detail': f'Действие недоступно для статуса «{case.get_status_display()}».'},
        status=status.HTTP_400_BAD_REQUEST,
    )


def ensure_case_not_closed(case):
    """Возвращает Response с 400, если дело уже в финальном статусе."""
    if case.status in ARBITRATION_CLOSED_STATUSES:
        return Response(
            {'detail': f'Дело завершено ({case.get_status_display()}). Писать и оформлять возврат нельзя.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return None


def _process_arbitration_refund(case, refund_percentage):
    """Финализация финансового решения по арбитражу.

    Распределяет замороженные средства:
    - Для заказов: refund_percentage% → клиенту, остальное → эксперту
    - Для покупок готовых работ: аналогичная логика

    Возвращает None при успехе или Response с ошибкой.
    """

    # Ветка для покупки готовой работы
    if case.purchase:
        purchase = case.purchase
        quote = order_quote(purchase.price_paid)
        hold_amount = money(quote['base_amount'] + quote['service_fee'])

        if hold_amount <= 0:
            return Response(
                {'detail': 'Нет средств для возврата по покупке.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        refund_decimal = Decimal(str(refund_percentage))
        client_amount = (hold_amount * refund_decimal / Decimal('100')).quantize(Decimal('0.01'))
        remaining_ratio = (Decimal('100') - refund_decimal) / Decimal('100')
        expert_amount = money(quote['base_amount'] * remaining_ratio)
        partner_amount = money(quote['service_fee'] * remaining_ratio)

        try:
            if client_amount > 0:
                WalletService.refund_hold(
                    purchase.buyer,
                    client_amount,
                    description=f'Арбитраж {case.case_number}: возврат за покупку «{purchase.work.title}» {refund_percentage}%',
                )

            if expert_amount > 0 or partner_amount > 0:
                WalletService.release_order_payment(
                    client=purchase.buyer,
                    expert=purchase.work.author,
                    base_amount=expert_amount,
                    service_fee=partner_amount,
                    source_key=f'purchase:{purchase.pk}',
                    description=f'Арбитраж {case.case_number}: распределение остатка за «{purchase.work.title}»',
                )

            if refund_percentage >= 100:
                purchase.status = 'refunded'
            elif refund_percentage > 0:
                purchase.status = 'completed'
            else:
                purchase.status = 'completed'
            purchase.save(update_fields=['status'])

        except Exception as e:
            return Response(
                {'detail': f'Ошибка при работе с кошельком: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return None

    # Ветка для заказа (существующая логика)
    order = case.order
    if not order or not order.client:
        return Response(
            {'detail': 'Заказ или клиент не найдены.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    active_hold = _active_order_hold(order)
    if active_hold <= 0:
        return Response(
            {'detail': 'Нет замороженных средств по заказу для возврата.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    refund_decimal = Decimal(str(refund_percentage))
    client_amount = money(active_hold * refund_decimal / Decimal('100'))
    quote = order_quote(order.final_price if order.final_price is not None else order.budget)
    full_escrow = money(quote['base_amount'] + quote['service_fee'])
    funded_ratio = min(Decimal('1'), money(active_hold) / full_escrow) if full_escrow else Decimal('0')
    remaining_ratio = funded_ratio * (Decimal('100') - refund_decimal) / Decimal('100')
    expert_amount = money(quote['base_amount'] * remaining_ratio)
    partner_amount = money(quote['service_fee'] * remaining_ratio)

    try:
        if client_amount > 0:
            WalletService.refund_hold(
                order.client,
                client_amount,
                order=order,
                description=f'Арбитраж {case.case_number}: возврат клиенту {refund_percentage}%',
            )

        if (expert_amount > 0 or partner_amount > 0) and order.expert:
            WalletService.release_order_payment(
                client=order.client,
                expert=order.expert,
                base_amount=expert_amount,
                service_fee=partner_amount,
                order=order,
                description=f'Арбитраж {case.case_number}: распределение остатка',
            )

        order.status = 'cancelled'
        order.save()

    except Exception as e:
        return Response(
            {'detail': f'Ошибка при работе с кошельком: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return None


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
        safe_call(NotificationService.create_notification, recipient=recipient,
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
            })


def build_order_chat_feed(case):
    """Собирает переписку по заказу для отображения администратору в арбитраже."""
    if not case.order_id or not case.order:
        return []

    client_id = case.order.client_id
    expert_id = case.order.expert_id
    participant_ids = {user_id for user_id in [client_id, expert_id] if user_id}
    if len(participant_ids) < 2:
        return []

    related_chats = Chat.objects.filter(order_id=case.order_id).filter(
        Q(client_id=client_id, expert_id=expert_id)
        | Q(client_id=expert_id, expert_id=client_id)
    )

    chat_messages = ChatMessage.objects.filter(
        chat__in=related_chats,
        sender_id__in=participant_ids,
    ).select_related('sender', 'chat').order_by('created_at', 'id')

    return [
        {
            'kind': 'message',
            'id': f'chat_{chat_message.id}',
            'sender': {
                'id': chat_message.sender.id,
                'first_name': chat_message.sender.first_name,
                'last_name': chat_message.sender.last_name,
                'username': chat_message.sender.username,
                'display_username': getattr(chat_message.sender, 'display_username', ''),
                'role': getattr(chat_message.sender, 'role', ''),
            },
            'text': chat_message.text or '',
            'message_type': chat_message.message_type,
            'is_internal': False,
            'source': 'order_chat',
            'source_label': 'Переписка по заказу',
            'chat_id': chat_message.chat_id,
            'chat_context_title': chat_message.chat.context_title,
            'file_name': chat_message.file_name,
            'file_url': chat_message.file.url if chat_message.file else None,
            'created_at': chat_message.created_at.isoformat(),
        }
        for chat_message in chat_messages
    ]


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
        queryset = super().get_queryset().select_related('order', 'order__client', 'order__expert', 'assigned_admin', 'purchase', 'purchase__work', 'purchase__work__author', 'purchase__buyer')
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
                'plaintiff', 'defendant', 'assigned_admin', 'order',
                'purchase', 'purchase__work', 'purchase__work__author', 'purchase__buyer',
            ).prefetch_related('assigned_users', 'messages', 'activities')
        
        # Обычные пользователи видят только свои дела (как истец или ответчик)
        queryset = queryset.filter(
            Q(plaintiff=user) | Q(defendant=user)
        ).select_related(
            'plaintiff', 'defendant', 'assigned_admin', 'order',
            'purchase', 'purchase__work', 'purchase__work__author', 'purchase__buyer',
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

        # Защита от ложного срабатывания авто-бана за обмен контактами:
        # если истец описал в претензии контактные данные ответчика (например,
        # цитирует сообщение нарушителя), детектор может ошибочно повесить
        # «is_banned_for_contacts» на истца. После подачи претензии снимаем с
        # истца этот флаг — он не виноват, что приводит факты как доказательство.
        try:
            user = request.user
            if getattr(user, 'is_banned_for_contacts', False):
                # Clear the false-positive contact ban, but DO NOT unfreeze the
                # related order/chat: they were just frozen for this arbitration.
                if hasattr(user, 'clear_contact_ban'):
                    user.clear_contact_ban(unfreeze_related=False)
                else:
                    user.is_banned_for_contacts = False
                    user.contact_ban_until = None
                    user.contact_ban_reason = None
                    user.save(update_fields=[
                        'is_banned_for_contacts', 'contact_ban_until', 'contact_ban_reason'
                    ])
        except Exception:
            pass
        
        log_activity(
            case,
            request.user,
            'submitted',
            f'Дело подано пользователем {request.user.get_full_name() or request.user.username}'
        )

        # Дополнительно отдельно уведомляем истца и ответчика о факте подачи претензии
        # (используем выделенный тип COMPLAINT_FILED, чтобы фронт мог показать соответствующую
        # карточку с переходом на дело и возможностью дать пояснения).
        try:
            from apps.notifications.services import NotificationService as _NS
            _NS.notify_complaint_filed(case)
        except Exception:
            # Если новый тип ещё не задеплоен в БД (миграция не накатилась),
            # не валим подачу претензии — оставляем только базовое status_changed.
            pass

        notify_case_participants(
            case,
            title=f'Открыт арбитраж {case.case_number}',
            message_text='По заказу открыт арбитраж. Заказ и переписка временно заморожены до решения.',
            exclude_user_ids=[case.plaintiff_id, case.defendant_id] if case.defendant_id else [],
            notification_type=NotificationType.STATUS_CHANGED,
        )
        
        return Response(
            ArbitrationCaseSerializer(case).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=False, methods=['post'], url_path='submit-purchase-dispute')
    def submit_purchase_dispute(self, request):
        """
        Подача спора по покупке готовой работы
        POST /api/arbitration/cases/submit-purchase-dispute/
        """
        from .serializers import PurchaseDisputeSerializer
        
        serializer = PurchaseDisputeSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        case = serializer.save()
        
        purchase = case.purchase
        
        # Обновляем статус покупки
        purchase.status = 'disputed'
        purchase.delivered_file = None
        purchase.delivered_file_name = ''
        purchase.delivered_file_type = ''
        purchase.delivered_file_size = 0
        purchase.save(update_fields=[
            'status', 'delivered_file', 'delivered_file_name',
            'delivered_file_type', 'delivered_file_size',
        ])
        
        # Уведомление продавцу
        try:
            NotificationService.create_notification(
                recipient=purchase.work.author,
                type=NotificationType.STATUS_CHANGED,
                title='Открыт спор по покупке',
                message=(
                    f'Покупатель {request.user.username} открыл спор по покупке '
                    f'«{purchase.work.title}». Доступ к файлу отозван, средства '
                    f'заморожены до решения арбитража.'
                ),
                related_object_id=case.id,
                related_object_type='arbitration_case',
                data={'case_id': case.id, 'purchase_id': purchase.id},
            )
        except Exception:
            pass
        
        log_activity(
            case, request.user, 'submitted',
            f'Спор по покупке открыт пользователем {request.user.get_full_name() or request.user.username}'
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
        """Отправить сообщение в дело.

        Правила:
        - истец может писать даже до взятия в работу (чтобы дополнить информацию);
        - админ и ответчик — только после взятия в работу;
        - в финальных статусах (decision_made / closed / rejected) переписка закрыта.
        """
        case = self.get_object()

        # 1. Финальный статус — отказ независимо от роли.
        closed_resp = ensure_case_not_closed(case)
        if closed_resp is not None:
            return closed_resp

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

        # 2. До взятия в работу — только стороны (истец и ответчик) могут писать.
        if case.status == 'submitted' and message_type == 'admin':
            return Response(
                {'error': 'Дело ещё не взято в работу. Стороны могут писать, '
                          'но администратор — пока нет.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Создаем сообщение
        message = ArbitrationMessage.objects.create(
            case=case,
            sender=request.user,
            message_type=message_type,
            text=text,
            is_internal=is_internal and request.user.role == 'admin'
        )

        # WebSocket уведомление о новом сообщении
        if not is_internal:
            try:
                message_data = ArbitrationMessageSerializer(message).data
                notify_arbitration_message(case.id, message_data)
            except Exception:
                pass
        
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
        """Обновить статус дела (только для админов)

        Валидные переходы:
        - submitted → under_review, closed, rejected
        - under_review → in_arbitration, awaiting_response, closed, rejected
        - awaiting_response → in_arbitration, under_review, closed, rejected
        - in_arbitration → awaiting_response, under_review, pending_approval, decision_made, closed, rejected
        - pending_approval → in_arbitration, decision_made, closed, rejected
        - decision_made → closed
        """
        case = self.get_object()
        new_status = request.data.get('status')

        if not new_status:
            return Response(
                {'error': 'Статус обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        valid_statuses = {s[0] for s in ArbitrationCase.STATUS_CHOICES}
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Неверный статус. Допустимые: {", ".join(valid_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        VALID_TRANSITIONS = {
            'submitted':       ['under_review', 'closed', 'rejected'],
            'under_review':    ['in_arbitration', 'awaiting_response', 'closed', 'rejected'],
            'awaiting_response': ['in_arbitration', 'under_review', 'closed', 'rejected'],
            'in_arbitration':  ['awaiting_response', 'under_review', 'pending_approval', 'decision_made', 'closed', 'rejected'],
            'pending_approval': ['in_arbitration', 'decision_made', 'closed', 'rejected'],
            'decision_made':   ['closed'],
        }

        allowed = VALID_TRANSITIONS.get(case.status, [])
        if new_status not in allowed:
            return Response(
                {'error': f'Нельзя перевести из «{case.get_status_display()}» в «{dict(ArbitrationCase.STATUS_CHOICES).get(new_status, new_status)}»'},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_status = case.status
        case.status = new_status
        
        if new_status == 'closed':
            case.closed_at = timezone.now()
        
        case.save()

        # WebSocket уведомление об изменении статуса
        try:
            notify_arbitration_status(
                case.id,
                {
                    'case_id': case.id,
                    'case_number': case.case_number,
                    'old_status': old_status,
                    'new_status': new_status,
                    'status_label': dict(ArbitrationCase.STATUS_CHOICES).get(new_status, new_status),
                }
            )
        except Exception:
            pass
        
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

        # Решение можно вынести только если дело взято в работу и ещё не закрыто.
        taken_resp = ensure_case_taken_into_work(case)
        if taken_resp is not None:
            return taken_resp
        closed_resp = ensure_case_not_closed(case)
        if closed_resp is not None:
            return closed_resp

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

        # Движение денег, если указан процент возврата
        if approved_refund_percentage is not None:
            wallet_error = _process_arbitration_refund(case, approved_refund_percentage)
            if wallet_error is not None:
                # Откатываем статус дела обратно
                case.status = 'in_arbitration'
                case.decision = ''
                case.decision_made_by = None
                case.decision_date = None
                case.approved_refund_percentage = None
                case.approved_refund_amount = None
                case.save()
                return wallet_error

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
        """Оформить возврат средств (только для админов).

        Ограничения:
        1. Дело должно быть взято в работу.
        2. Дело не должно быть в финальном статусе (decision_made/closed/rejected).
        3. Возврат можно оформить только один раз: если approved_refund_percentage
           уже задан, либо ранее уже логировался activity_type='refund_processed',
           повторный процесс-рефанд запрещён.
        """
        case = self.get_object()

        taken_resp = ensure_case_taken_into_work(case)
        if taken_resp is not None:
            return taken_resp
        closed_resp = ensure_case_not_closed(case)
        if closed_resp is not None:
            return closed_resp

        # Возврат уже был оформлен ранее? — отказ.
        if case.approved_refund_percentage is not None and case.approved_refund_percentage != '':
            return Response(
                {'detail': f'Возврат по этому делу уже оформлен ранее ({case.approved_refund_percentage}%). Повторное оформление невозможно.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        already_refunded = case.activities.filter(activity_type='refund_processed').exists()
        if already_refunded:
            return Response(
                {'detail': 'По этому делу уже был оформлен возврат. Повторное оформление невозможно.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        refund_percentage = request.data.get('refund_percentage', 0)
        refund_amount = request.data.get('refund_amount')
        require_approval = request.data.get('require_approval', False)

        try:
            refund_percentage = float(refund_percentage)
        except (TypeError, ValueError):
            refund_percentage = 0
        if not (1 <= refund_percentage <= 100):
            return Response(
                {'detail': 'Процент возврата должен быть от 1 до 100.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if require_approval:
            # Отправить на согласование — сохраняем предложенные суммы,
            # переводим в pending_approval. Финальное оформление — через
            # approve-refund.
            case.approved_refund_percentage = refund_percentage
            if refund_amount:
                case.approved_refund_amount = refund_amount
            case.status = 'pending_approval'
            case.save()

            log_activity(
                case,
                request.user,
                'refund_processed',
                f'Возврат {refund_percentage}% отправлен на согласование',
                {
                    'refund_percentage': str(refund_percentage),
                    'refund_amount': str(refund_amount) if refund_amount else None,
                    'require_approval': True,
                }
            )
            notify_case_participants(
                case,
                title=f'Арбитраж {case.case_number} — возврат на согласовании',
                message_text=f'Возврат {refund_percentage}% отправлен на согласование директору.',
                exclude_user_ids=[request.user.id],
                notification_type=NotificationType.STATUS_CHANGED,
            )
            return Response({
                'message': f'Возврат {refund_percentage}% отправлен на согласование',
                'case': ArbitrationCaseSerializer(case).data
            })

        # Без согласования — оформляем сразу
        case.approved_refund_percentage = refund_percentage
        if refund_amount:
            case.approved_refund_amount = refund_amount

        case.status = 'decision_made'
        case.save()

        # Движение денег через кошелёк
        wallet_error = _process_arbitration_refund(case, refund_percentage)
        if wallet_error is not None:
            # Откатываем статус дела обратно
            case.status = 'in_arbitration'
            case.approved_refund_percentage = None
            case.approved_refund_amount = None
            case.save()
            return wallet_error

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
        try:
            from apps.admin_panel.views import log_admin_action
            log_admin_action(
                request.user,
                'arbitration_refund_processed',
                f'Processed arbitration refund {refund_percentage}% for case {case.case_number}',
                target_user=getattr(case, 'plaintiff', None),
                object_type='arbitration_case',
                object_id=case.id,
                meta={'refund_percentage': refund_percentage, 'refund_amount': refund_amount},
            )
        except Exception:
            pass

        return Response({
            'message': f'Возврат {refund_percentage}% оформлен',
            'case': ArbitrationCaseSerializer(case).data
        })

    @action(detail=True, methods=['post'], url_path='approve-refund')
    def approve_refund(self, request, pk=None):
        """Согласовать возврат (директор). Дело должно быть в pending_approval."""
        case = self.get_object()

        if case.status != 'pending_approval':
            return Response(
                {'detail': 'Возврат не ожидает согласования.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        case.status = 'decision_made'
        case.decision_made_by = request.user
        case.decision_date = timezone.now()
        case.save()

        # Движение денег через кошелёк
        wallet_error = _process_arbitration_refund(case, case.approved_refund_percentage)
        if wallet_error is not None:
            # Откатываем статус дела обратно
            case.status = 'pending_approval'
            case.decision_made_by = None
            case.decision_date = None
            case.save()
            return wallet_error

        log_activity(
            case,
            request.user,
            'refund_processed',
            f'Возврат {case.approved_refund_percentage}% согласован директором',
            {
                'refund_percentage': str(case.approved_refund_percentage),
                'refund_amount': str(case.approved_refund_amount) if case.approved_refund_amount else None,
                'approved_by_director': True,
            }
        )
        try:
            from apps.admin_panel.views import log_admin_action
            log_admin_action(
                request.user,
                'arbitration_refund_approved',
                f'Approved arbitration refund {case.approved_refund_percentage}% for case {case.case_number}',
                target_user=getattr(case, 'plaintiff', None),
                object_type='arbitration_case',
                object_id=case.id,
                meta={
                    'refund_percentage': str(case.approved_refund_percentage),
                    'refund_amount': str(case.approved_refund_amount) if case.approved_refund_amount else None,
                },
            )
        except Exception:
            pass

        notify_case_participants(
            case,
            title=f'Арбитраж {case.case_number} — возврат согласован',
            message_text=f'Возврат {case.approved_refund_percentage}% согласован директором.',
            exclude_user_ids=[request.user.id],
            notification_type=NotificationType.STATUS_CHANGED,
        )

        return Response({
            'message': f'Возврат {case.approved_refund_percentage}% согласован',
            'case': ArbitrationCaseSerializer(case).data
        })

    @action(detail=True, methods=['post'], url_path='reject-refund')
    def reject_refund(self, request, pk=None):
        """Отклонить согласование возврата (директор). Возвращает дело в in_arbitration."""
        case = self.get_object()

        if case.status != 'pending_approval':
            return Response(
                {'detail': 'Возврат не ожидает согласования.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason = request.data.get('reason', '').strip()

        # Сохраняем предложенные суммы для лога, затем очищаем
        refused_percentage = case.approved_refund_percentage
        refused_amount = case.approved_refund_amount

        case.approved_refund_percentage = None
        case.approved_refund_amount = None
        case.status = 'in_arbitration'
        case.save()

        log_activity(
            case,
            request.user,
            'status_changed',
            f'Директор отклонил согласование возврата {refused_percentage}%'
            + (f'. Причина: {reason}' if reason else ''),
            {
                'old_status': 'pending_approval',
                'new_status': 'in_arbitration',
                'refused_refund_percentage': str(refused_percentage) if refused_percentage else None,
                'refused_refund_amount': str(refused_amount) if refused_amount else None,
                'reason': reason,
            }
        )
        try:
            from apps.admin_panel.views import log_admin_action
            log_admin_action(
                request.user,
                'arbitration_refund_rejected',
                f'Rejected arbitration refund {refused_percentage}% for case {case.case_number}',
                target_user=getattr(case, 'plaintiff', None),
                object_type='arbitration_case',
                object_id=case.id,
                meta={'reason': reason},
            )
        except Exception:
            pass

        notify_case_participants(
            case,
            title=f'Арбитраж {case.case_number} — возврат отклонён',
            message_text='Директор отклонил предложенный возврат. Дело продолжается.',
            exclude_user_ids=[request.user.id],
            notification_type=NotificationType.STATUS_CHANGED,
        )

        return Response({
            'message': 'Согласование возврата отклонено',
            'case': ArbitrationCaseSerializer(case).data
        })

    @action(detail=True, methods=['post'], url_path='close-case')
    def close_case(self, request, pk=None):
        """Закрыть дело (только для админов)"""
        case = self.get_object()

        taken_resp = ensure_case_taken_into_work(case)
        if taken_resp is not None:
            return taken_resp
        closed_resp = ensure_case_not_closed(case)
        if closed_resp is not None:
            return closed_resp

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
        """Лента переписки дела: только сообщения арбитража и чат заказа.

        Системные события (ArbitrationActivity) намеренно не включаются —
        по требованию заказчика админ и стороны видят только переписку и
        статус самого дела. Изменения статуса заказа/дела уже отражаются в
        карточке дела, отдельные «activity»-сообщения показывать не нужно.
        """
        case = self.get_object()

        # Сообщения арбитража
        messages = [
            {
                'kind': 'message',
                'id': f'msg_{m.id}',
                'sender': {
                    'id': m.sender.id,
                    'first_name': m.sender.first_name,
                    'last_name': m.sender.last_name,
                    'username': m.sender.username,
                    'display_username': getattr(m.sender, 'display_username', ''),
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

        # Чат заказа — показываем только админу, как переписку сторон по сделке
        order_chat_messages = []
        if request.user.role == 'admin' and case.order_id:
            order_chat_messages = build_order_chat_feed(case)

        # Объединяем и сортируем по времени
        feed = messages + order_chat_messages
        feed.sort(key=lambda x: x['created_at'])

        return Response({
            'messages': messages,
            'activities': [],  # оставлено для обратной совместимости с фронтом,
                                # но фактически системные события в ленту не идут
            'order_chat_messages': order_chat_messages,
            'feed': feed,
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

    def _serialize_complaint_chat_message(self, msg):
        return {
            'id': msg.id,
            'sender': {
                'id': msg.sender.id,
                'username': msg.sender.username,
                'first_name': msg.sender.first_name,
                'last_name': msg.sender.last_name,
                'role': getattr(msg.sender, 'role', ''),
            },
            'text': msg.text or '',
            'message_type': msg.message_type,
            'file_name': msg.file_name,
            'file_url': msg.file.url if msg.file else None,
            'created_at': msg.created_at.isoformat(),
        }

    def _get_review_for_admin_action(self, complaint, user):
        if user.role != 'admin':
            return None, Response(
                {'detail': 'Только администратор может управлять отзывом в жалобе'},
                status=status.HTTP_403_FORBIDDEN
            )

        if complaint.complaint_type != 'unjustified_review':
            return None, Response(
                {'detail': 'Это обращение не связано с обжалованием отзыва'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if complaint.status not in ['open', 'in_progress', 'resolved']:
            return None, Response(
                {'detail': 'Управлять отзывом можно только в активной или уже разрешенной жалобе'},
                status=status.HTTP_400_BAD_REQUEST
            )

        review = getattr(complaint.order, 'expert_rating', None) if complaint.order_id else None
        if review is None:
            return None, Response(
                {'detail': 'Отзыв по этому заказу не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        return review, None

    def _apply_review_decision(self, complaint, review, *, is_published, resolution):
        review.is_published = is_published
        review.is_appealed = True
        review.appeal_resolved = True
        review.appeal_at = review.appeal_at or timezone.now()
        review.appeal_resolution = resolution
        review.save()

        complaint.status = 'resolved'
        complaint.resolution = resolution
        complaint.resolved_at = timezone.now()
        complaint.save(update_fields=['status', 'resolution', 'resolved_at', 'updated_at'])

        if complaint.order:
            complaint.order.unfreeze()
    
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
        """При создании претензии автоматически замораживаем заказ и чат"""
        complaint = serializer.save()
        
        # Замораживаем заказ
        if complaint.order:
            complaint.order.freeze(f'Открыта претензия #{complaint.id}')
        
        # Замораживаем чаты заказа
        from apps.chat.models import Chat
        for chat in Chat.objects.filter(order=complaint.order):
            chat.freeze(f'Открыта претензия #{complaint.id}')
    
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
        
        # Размораживаем чаты заказа
        from apps.chat.models import Chat
        for chat in Chat.objects.filter(order_id=complaint.order_id):
            chat.unfreeze()
        
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
        
        # Размораживаем чаты заказа
        from apps.chat.models import Chat
        for chat in Chat.objects.filter(order_id=complaint.order_id):
            chat.unfreeze()
        
        return Response(ComplaintSerializer(complaint).data)

    @action(detail=True, methods=['post'], url_path='remove-review')
    def remove_review(self, request, pk=None):
        """Скрыть отзыв в рамках жалобы на отзыв."""
        complaint = self.get_object()
        review, error_response = self._get_review_for_admin_action(complaint, request.user)
        if error_response is not None:
            return error_response

        if not review.is_published:
            return Response(
                {'detail': 'Отзыв уже скрыт'},
                status=status.HTTP_400_BAD_REQUEST
            )

        resolution = request.data.get('resolution', '').strip() or 'Администратор убрал отзыв по результатам рассмотрения жалобы.'
        self._apply_review_decision(
            complaint,
            review,
            is_published=False,
            resolution=resolution,
        )
        return Response(ComplaintSerializer(complaint).data)

    @action(detail=True, methods=['post'], url_path='restore-review')
    def restore_review(self, request, pk=None):
        """Вернуть отзыв в публикацию в рамках жалобы на отзыв."""
        complaint = self.get_object()
        review, error_response = self._get_review_for_admin_action(complaint, request.user)
        if error_response is not None:
            return error_response

        if review.is_published:
            return Response(
                {'detail': 'Отзыв уже опубликован'},
                status=status.HTTP_400_BAD_REQUEST
            )

        resolution = request.data.get('resolution', '').strip() or 'Администратор вернул отзыв после повторной проверки жалобы.'
        self._apply_review_decision(
            complaint,
            review,
            is_published=True,
            resolution=resolution,
        )
        return Response(ComplaintSerializer(complaint).data)

    @action(detail=True, methods=['post'], url_path='appeal')
    def appeal_complaint(self, request, pk=None):
        """Обжаловать решение по претензии (доступно истцу и ответчику)"""
        complaint = self.get_object()
        user = request.user
        
        # Проверяем права - только истец или ответчик могут обжаловать
        is_plaintiff = complaint.plaintiff_id == user.id
        is_defendant = complaint.defendant_id == user.id
        
        if not (is_plaintiff or is_defendant):
            return Response(
                {'detail': 'Только стороны спора могут обжаловать решение'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Можно обжаловать только закрытую или решённую претензию
        if complaint.status not in ['closed', 'resolved']:
            return Response(
                {'detail': 'Можно обжаловать только закрытую или решённую претензию'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reason = request.data.get('reason', '').strip()
        
        try:
            complaint.appeal(user, reason)
        except ValueError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Замораживаем заказ и чаты снова
        if complaint.order:
            complaint.order.freeze(f'Претензия #{complaint.id} обжалована')
        
        from apps.chat.models import Chat
        for chat in Chat.objects.filter(order_id=complaint.order_id):
            chat.freeze(f'Претензия #{complaint.id} обжалована')
        
        return Response(ComplaintSerializer(complaint).data)
    
    @action(detail=False, methods=['get'], url_path='by-order/(?P<order_id>[^/.]+)')
    def by_order(self, request, order_id=None):
        """Получить претензии по заказу"""
        complaints = Complaint.objects.filter(
            order_id=order_id
        ).select_related('plaintiff', 'defendant', 'order')
        
        serializer = ComplaintSerializer(complaints, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='chat')
    def chat(self, request, pk=None):
        """Получить чат претензии (переписку по связанному заказу)"""
        complaint = self.get_object()
        
        if not complaint.order_id:
            return Response({'messages': [], 'chat_id': None})
        
        # Получаем чат по заказу
        related_chats = Chat.objects.filter(order_id=complaint.order_id).order_by('-created_at')
        chat = related_chats.first()
        
        if not chat:
            return Response({'messages': [], 'chat_id': None})
        
        # Получаем сообщения из чата
        messages = ChatMessage.objects.filter(chat=chat).select_related('sender').order_by('created_at')
        
        messages_data = [self._serialize_complaint_chat_message(msg) for msg in messages]
        
        return Response({
            'chat_id': chat.id,
            'chat_context_title': chat.context_title,
            'messages': messages_data,
        })

    @action(detail=True, methods=['post'], url_path='send-message')
    def send_message(self, request, pk=None):
        complaint = self.get_object()
        text = (request.data.get('message') or request.data.get('text') or '').strip()

        if not text:
            return Response({'detail': 'Сообщение не может быть пустым'}, status=status.HTTP_400_BAD_REQUEST)

        if complaint.status in COMPLAINT_CLOSED_STATUSES:
            return Response(
                {'detail': 'Претензия уже завершена. Писать в неё нельзя.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        is_complainant = user.id == complaint.plaintiff_id
        is_admin = getattr(user, 'role', None) == 'admin'
        if not (is_complainant or is_admin):
            return Response({'detail': 'Только истец и администратор могут писать во время претензии'}, status=status.HTTP_403_FORBIDDEN)

        if not complaint.order_id or not complaint.order:
            return Response({'detail': 'Чат заказа недоступен'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            chat = get_or_create_order_chat(complaint.order)
        except ValueError:
            chat = Chat.objects.filter(order_id=complaint.order_id).order_by('-created_at').first()

        if not chat:
            return Response({'detail': 'Чат заказа не найден'}, status=status.HTTP_404_NOT_FOUND)

        message = ChatMessage.objects.create(
            chat=chat,
            sender=user,
            text=text,
            message_type='text',
        )
        data = self._serialize_complaint_chat_message(message)

        try:
            notify_chat_message(chat.id, data)
        except Exception:
            pass

        return Response(data, status=status.HTTP_201_CREATED)
