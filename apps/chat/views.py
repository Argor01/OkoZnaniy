from django.conf import settings
from django.shortcuts import render
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q, Max, Count, Sum, Prefetch
import logging

from django.db import transaction, IntegrityError
from .models import Chat, Message, SupportChat, SupportMessage, ChatPin
from .serializers import ChatListSerializer, ChatDetailSerializer, MessageSerializer, SupportChatSerializer, SupportMessageSerializer
from .services import ensure_order_chat_started, get_or_create_direct_chat, get_or_create_order_chat, readable_messages_for_chat, unread_messages_for_user
from .websocket_utils import notify_chat_message, notify_typing
from apps.orders.models import Order, OrderFile, Transaction, TransactionType
from apps.notifications.models import NotificationType
from apps.notifications.services import NotificationService
from apps.core.safe_notify import safe_call
from apps.wallet.services import InsufficientFunds, WalletService
from apps.wallet.policy import order_quote, money
from decimal import Decimal, InvalidOperation


def _contact_ban_response(user, action_detail='\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435'):
    if not user or not getattr(user, 'is_authenticated', False):
        return None
    if getattr(user, 'role', None) in ['admin', 'director']:
        return None
    if hasattr(user, 'is_contact_ban_active'):
        is_banned = user.is_contact_ban_active()
    else:
        if hasattr(user, 'unban_for_contacts_if_expired'):
            user.unban_for_contacts_if_expired()
        is_banned = getattr(user, 'is_banned_for_contacts', False)
    if not is_banned:
        return None
    return Response(
        {
            'detail': f'{action_detail} \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e. \u041f\u0440\u043e\u0444\u0438\u043b\u044c\u0020\u0437\u0430\u0431\u043b\u043e\u043a\u0438\u0440\u043e\u0432\u0430\u043d\u0020\u0437\u0430\u0020\u043e\u0431\u043c\u0435\u043d\u0020\u043a\u043e\u043d\u0442\u0430\u043a\u0442\u043d\u044b\u043c\u0438\u0020\u0434\u0430\u043d\u043d\u044b\u043c\u0438.',
            'frozen': True,
            'frozen_reason': getattr(user, 'contact_ban_reason', None) or '\u041f\u0440\u043e\u0444\u0438\u043b\u044c\u0020\u0437\u0430\u0431\u043b\u043e\u043a\u0438\u0440\u043e\u0432\u0430\u043d\u0020\u0437\u0430\u0020\u043e\u0431\u043c\u0435\u043d\u0020\u043a\u043e\u043d\u0442\u0430\u043a\u0442\u043d\u044b\u043c\u0438\u0020\u0434\u0430\u043d\u043d\u044b\u043c\u0438',
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


def _active_order_hold(order):
    rows = Transaction.objects.filter(
        order=order,
        user=order.client,
        type__in=[TransactionType.HOLD, TransactionType.RELEASE, TransactionType.REFUND],
    ).values('type').annotate(total=Sum('amount'))
    totals = {row['type']: row['total'] for row in rows}
    return money(
        (totals.get(TransactionType.HOLD) or 0)
        - (totals.get(TransactionType.RELEASE) or 0)
        - (totals.get(TransactionType.REFUND) or 0)
    )


def _fund_individual_offer(order, client, expert, base_amount, prepayment_percent):
    from apps.wallet.models import Settlement

    percent_value = 50 if prepayment_percent is None else int(prepayment_percent)
    if percent_value < 0 or percent_value > 100:
        raise ValueError('Процент предоплаты должен быть от 0 до 100.')

    quote = order_quote(base_amount, client=client)
    full_amount = money(quote['base_amount'] + quote['service_fee'])
    target = money(full_amount * Decimal(percent_value) / Decimal('100'))
    settlement = Settlement.objects.select_for_update().filter(order=order).first()
    already_funded = money(
        (settlement.funded_base + settlement.funded_service_fee) if settlement else 0
    )

    if settlement and already_funded > target:
        WalletService.refund_distributed_escrow(
            settlement,
            amount=money(already_funded - target),
            description=f'Корректировка резерва по заказу #{order.id}',
        )
        settlement.refresh_from_db()
        already_funded = money(settlement.funded_base + settlement.funded_service_fee)

    result = None
    delta = money(target - already_funded)
    if delta > 0:
        result = WalletService.fund_distributed_escrow(
            client=client,
            expert=expert,
            base_amount=quote['base_amount'],
            service_fee=quote['service_fee'],
            fund_amount=delta,
            order=order,
            description=f'Предоплата {percent_value}% по заказу #{order.id}',
        )
        settlement = result['settlement']

    if settlement:
        settlement.base_amount = quote['base_amount']
        settlement.service_fee = quote['service_fee']
        settlement.save(update_fields=['base_amount', 'service_fee'])
    return result


def _contact_ban_other_response(user, action_detail='Действие'):
    if not user:
        return None
    if hasattr(user, 'unban_for_contacts_if_expired'):
        user.unban_for_contacts_if_expired()
    if not getattr(user, 'is_banned_for_contacts', False):
        return None
    return Response(
        {
            'detail': (
                f'{action_detail} временно недоступно. Собеседник нарушил правила платформы, '
                'поэтому переписка заморожена до решения администратора.'
            ),
            'frozen': True,
            'frozen_reason': (
                'Собеседник нарушил правила платформы: обмен контактными данными запрещен. '
                'Переписка временно недоступна до решения администратора.'
            ),
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


logger = logging.getLogger("oko.chat")


def _chat_is_dispute_evidence(chat) -> bool:
    """Была ли по заказу этого чата жалоба или арбитраж.

    Такую переписку стирать нельзя: это доказательства по спору, а спор
    можно возобновить и после решения.
    """
    order_ids = set()
    if chat.order_id:
        order_ids.add(chat.order_id)
    for data in chat.messages.filter(message_type='offer').values_list('offer_data', flat=True):
        if not isinstance(data, dict):
            continue
        try:
            order_id = int(data.get('order_id', 0))
        except (TypeError, ValueError):
            continue
        if order_id > 0:
            order_ids.add(order_id)
    if not order_ids:
        return False
    from apps.arbitration.models import ArbitrationCase, Complaint
    return (ArbitrationCase.objects.filter(order_id__in=order_ids).exists()
            or Complaint.objects.filter(order_id__in=order_ids).exists())



class ChatViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления обычными чатами между клиентами и экспертами.
    
    ВАЖНО: Чаты с технической поддержкой НЕ отображаются в этом списке.
    Они управляются через отдельный SupportChatViewSet и отображаются
    только в разделе "Чаты поддержки" в админ-панели.
    
    Фильтрация чатов поддержки происходит по:
    1. SUPPORT_USER_ID - ID пользователя технической поддержки (из настроек)
    2. context_title - чаты с маркерами "поддержка", "support", "техподдержка"
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return ChatListSerializer
        return ChatDetailSerializer

    def destroy(self, request, *args, **kwargs):
        chat = self.get_object()
        from django.utils import timezone
        import datetime

        now = timezone.now()
        offer_messages = chat.messages.filter(message_type='offer').only('created_at', 'offer_data')
        for msg in offer_messages:
            data = msg.offer_data or {}
            offer_status = data.get('status', 'new')
            if offer_status in ['accepted', 'rejected']:
                continue
            if msg.created_at and now <= msg.created_at + datetime.timedelta(days=2):
                return Response(
                    {'detail': 'Нельзя удалить чат: есть активные индивидуальные предложения.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        order_ids = set()
        if getattr(chat, 'order_id', None):
            order_ids.add(chat.order_id)
        for msg in offer_messages:
            data = msg.offer_data or {}
            if data.get('status') != 'accepted':
                continue
            raw_id = data.get('order_id')
            try:
                order_id = int(raw_id)
            except (TypeError, ValueError):
                order_id = None
            if order_id:
                order_ids.add(order_id)

        if order_ids:
            closed_statuses = {'completed', 'cancelled', 'canceled', 'done'}
            active_exists = Order.objects.filter(id__in=order_ids).exclude(status__in=closed_statuses).exists()
            if active_exists:
                return Response(
                    {'detail': 'Нельзя удалить чат: есть заказ в работе.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        chat.hidden_for_users.add(request.user)
        ChatPin.objects.filter(chat=chat, user=request.user).delete()

        participants_count = chat.participants.count()
        hidden_count = chat.hidden_for_users.count()
        if participants_count > 0 and hidden_count >= participants_count:
            # По спорному заказу переписка остаётся: её могут потребовать
            # при возобновлении обращения. Из списков она уже убрана.
            if _chat_is_dispute_evidence(chat):
                logger.info(
                    'Чат %s скрыт у всех, но сохранён: по заказу %s был спор',
                    chat.id, chat.order_id,
                )
            else:
                self.perform_destroy(chat)

        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        user = self.request.user
        from django.db.models import Exists, OuterRef
        
            # Подзапрос для проверки закреплённых чатов
        pinned_subquery = ChatPin.objects.filter(
                user=OuterRef('participants'),
                chat=OuterRef('pk')
            )
        
            # Исключаем чаты с технической поддержкой из списка обычных чатов
            # Чаты поддержки отображаются только в разделе "Чаты поддержки" в админ-панели
        queryset = Chat.objects.filter(
                participants=user
            ).prefetch_related(
                'participants',
                'messages__sender',
                'pins__user'
            ).annotate(
                last_message_time=Max('messages__created_at'),
                is_pinned=Exists(pinned_subquery)
            ).order_by('-is_pinned', '-last_message_time')
        queryset = queryset.exclude(hidden_for_users=user)
        
            # Получаем ID пользователя поддержки из настроек или переменной окружения
        from django.conf import settings
        support_user_id = getattr(settings, 'SUPPORT_USER_ID', None)
        
            # Если ID поддержки задан, исключаем чаты с этим пользователем
        if support_user_id:
                queryset = queryset.exclude(participants__id=support_user_id)
        
            # Также исключаем чаты, где context_title содержит маркеры поддержки
        queryset = queryset.exclude(
                Q(context_title__icontains='поддержка') |
                Q(context_title__icontains='support') |
                Q(context_title__icontains='техподдержка')
        )
        
        return queryset

    def perform_create(self, serializer):
        blocked = _contact_ban_response(self.request.user, '\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435')
        if blocked is not None:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(blocked.data.get('detail'))
        chat = serializer.save()
        order = chat.order
        if order and order.client:
            chat.participants.add(order.client)
        if order and order.expert:
            chat.participants.add(order.expert)

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Отправка сообщения в чат (текст и/или файл). Для файла — multipart/form-data: text, file."""
        chat = self.get_object()

        if hasattr(request.user, 'role') and request.user.role not in ['admin', 'director']:
            blocked = _contact_ban_response(request.user, 'Отправка сообщений')
            if blocked is not None:
                return blocked
            other_user_for_ban = chat.participants.exclude(id=request.user.id).first()
            blocked_by_other = _contact_ban_other_response(other_user_for_ban, 'Отправка сообщений')
            if blocked_by_other is not None:
                return blocked_by_other

            if hasattr(request.user, 'unban_for_contacts_if_expired'):
                request.user.unban_for_contacts_if_expired()
            if getattr(request.user, 'is_banned_for_contacts', False):
                return Response(
                    {
                        'detail': 'Отправка сообщений временно недоступна. Пользователь находится на проверке.',
                        'frozen': True,
                        'frozen_reason': request.user.contact_ban_reason or 'Пользователь находится на проверке'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            other_user = chat.participants.exclude(id=request.user.id).first()
            if other_user and hasattr(other_user, 'unban_for_contacts_if_expired'):
                other_user.unban_for_contacts_if_expired()
            if other_user and getattr(other_user, 'is_banned_for_contacts', False):
                return Response(
                    {
                        'detail': 'Отправка сообщений временно недоступна. Собеседник находится на проверке.',
                        'frozen': True,
                        'frozen_reason': other_user.contact_ban_reason or 'Собеседник находится на проверке'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Проверяем, не заморожен ли чат
        if chat.is_frozen:
            # Админы могут писать в замороженные чаты
            if not (hasattr(request.user, 'role') and request.user.role in ['admin', 'director']):
                return Response(
                    {
                        'detail': 'Чат заморожен из-за нарушения правил. Отправка сообщений временно недоступна.',
                        'frozen': True,
                        'frozen_reason': chat.frozen_reason
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if request.user not in chat.participants.all():
            return Response(
                {'detail': 'Вы не являетесь участником этого чата'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Поддержка JSON (только текст) и multipart (текст + файл)
        if request.content_type and 'multipart/form-data' in request.content_type:
            text = (request.POST.get('text') or '').strip()
            uploaded_file = request.FILES.get('file')
            message_type = request.POST.get('message_type', 'text')
            import json
            try:
                offer_data = json.loads(request.POST.get('offer_data', '{}')) if request.POST.get('offer_data') else None
            except json.JSONDecodeError:
                offer_data = None
        else:
            text = (request.data.get('text') or '').strip()
            uploaded_file = None
            message_type = request.data.get('message_type', 'text')
            offer_data = request.data.get('offer_data')

        if not text and not uploaded_file and not (message_type in ['offer', 'work_offer'] and offer_data):
            return Response(
                {'detail': 'Укажите текст сообщения, прикрепите файл или создайте предложение.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if message_type == 'offer':
            if getattr(request.user, 'role', None) != 'expert' and not getattr(request.user, 'is_staff', False):
                return Response(
                    {'detail': 'Только эксперт может отправлять индивидуальные предложения.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            if getattr(chat, 'expert_id', None) and int(chat.expert_id) != int(request.user.id) and not getattr(request.user, 'is_staff', False):
                return Response(
                    {'detail': 'Только эксперт этого чата может отправлять индивидуальные предложения.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            linked_order_id = offer_data.get('linked_order_id') if isinstance(offer_data, dict) else None
            if linked_order_id:
                try:
                    linked_order = Order.objects.get(pk=linked_order_id)
                except (Order.DoesNotExist, TypeError, ValueError):
                    return Response(
                        {'detail': 'Указанный заказ не найден.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                chat_participant_ids = list(chat.participants.values_list('id', flat=True))
                if linked_order.client_id not in chat_participant_ids:
                    return Response(
                        {'detail': 'Этот заказ принадлежит другому клиенту.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                is_new_unassigned = linked_order.status == 'new' and linked_order.expert_id is None
                is_current_expert_order = (
                    linked_order.status in {'in_progress', 'revision'}
                    and linked_order.expert_id == request.user.id
                )
                if not (is_new_unassigned or is_current_expert_order):
                    return Response(
                        {'detail': 'У заказа уже есть другой эксперт или заказ недоступен для привязки.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

        if message_type == 'work_offer':
            if getattr(request.user, 'role', None) != 'expert' and not getattr(request.user, 'is_staff', False):
                return Response(
                    {'detail': 'Только эксперт может отправлять предложение готовой работы.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            if not getattr(chat, 'context_title', None):
                return Response(
                    {'detail': 'Предложение готовой работы доступно только в чате по работе.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if not isinstance(offer_data, dict):
                return Response(
                    {'detail': 'offer_data должен быть объектом.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            title = str(offer_data.get('title') or chat.context_title or '').strip()[:255]
            offer_data['title'] = title or chat.context_title or ''
            offer_data.setdefault('status', 'new')
            offer_data.setdefault('delivery_status', 'pending')

        if message_type == 'work_delivery':
            if not isinstance(offer_data, dict):
                offer_data = {}
            offer_data.setdefault('delivery_status', 'delivered')
            offer_data.setdefault('delivered_at', timezone.now().isoformat())

        file_name = ''
        if uploaded_file:
            allowed_extensions = getattr(settings, 'ALLOWED_EXTENSIONS', [
                'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt',
                'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg',
                'zip', 'rar', '7z', 'ppt', 'pptx', 'xls', 'xlsx', 'csv',
                'dwg', 'dxf', 'cdr',
            ])
            max_size = getattr(settings, 'MAX_UPLOAD_SIZE', 50 * 1024 * 1024)
            ext = (uploaded_file.name.split('.')[-1].lower() if '.' in uploaded_file.name else '') or ''
            if ext not in allowed_extensions:
                return Response(
                    {'detail': f'Недопустимый тип файла. Разрешены: {", ".join(allowed_extensions)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if uploaded_file.size > max_size:
                return Response(
                    {'detail': f'Размер файла не должен превышать {max_size // (1024*1024)} МБ.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            file_name = uploaded_file.name[:255] if len(uploaded_file.name) > 255 else uploaded_file.name

        try:
            message = Message(
                chat=chat,
                sender=request.user,
                text=text or '',
                file=uploaded_file or None,
                file_name=file_name,
                message_type=message_type,
                offer_data=offer_data
            )
            message.full_clean()
            message.save()
        except Exception as e:
            return Response(
                {'detail': getattr(e, 'message', None) or str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        if (
            uploaded_file
            and chat.order_id
            and chat.order
            and message_type != 'work_delivery'
            and getattr(chat.order, 'expert_id', None) == request.user.id
        ):
            marker = f'chat_message_id:{message.id}'
            already_attached = OrderFile.objects.filter(
                order_id=chat.order_id,
                description=marker
            ).exists()
            if not already_attached:
                try:
                    OrderFile.objects.create(
                        order=chat.order,
                        file=message.file,
                        file_type='solution',
                        uploaded_by=request.user,
                        description=marker
                    )
                except Exception:
                    pass

        # WebSocket уведомление о новом сообщении
        try:
            message_serializer = MessageSerializer(message, context={'request': request})
            notify_chat_message(chat.id, message_serializer.data)
        except Exception:
            import logging
            logging.getLogger(__name__).exception("Failed to send WS chat_message_broadcast for chat %s", chat.id)

        if message_type == 'offer':
            try:
                recipient = chat.client
                if not recipient:
                    recipient = (
                        chat.participants.exclude(id=request.user.id).filter(role='client').first()
                        or chat.participants.exclude(id=request.user.id).first()
                    )

                if recipient and recipient.id != request.user.id:
                    offer_payload = offer_data if isinstance(offer_data, dict) else {}
                    offer_title = (offer_payload.get('title') or '').strip()
                    offer_cost = offer_payload.get('cost')
                    cost_suffix = f" Сумма: {offer_cost} ₽." if offer_cost not in [None, ''] else ''
                    target_label = f"по заказу №{chat.order.id}" if getattr(chat, 'order', None) else "в чате"
                    safe_call(NotificationService.create_notification,
                        recipient=recipient,
                        type=NotificationType.NEW_BID,
                        title=f"Индивидуальное предложение{f': {offer_title}' if offer_title else ''}",
                        message=f"Эксперт {request.user.get_full_name() or request.user.username} отправил вам индивидуальное предложение {target_label}.{cost_suffix}",
                        related_object_id=chat.order_id if chat.order_id else chat.id,
                        related_object_type='order' if chat.order_id else 'chat',
                        data={
                            'chat_id': chat.id,
                            'message_id': message.id
                        })
            except Exception:
                pass

        return Response(MessageSerializer(message, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def accept_work_offer(self, request, pk=None):
        chat = self.get_object()
        blocked = _contact_ban_response(request.user, '\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435')
        if blocked is not None:
            return blocked
        message_id = request.data.get('message_id')
        if not message_id:
            return Response({'detail': 'message_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)

        message = get_object_or_404(Message, id=message_id, chat=chat)
        if message.message_type != 'work_offer' or not message.offer_data:
            return Response({'detail': 'Это сообщение не является предложением готовой работы'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user not in chat.participants.all():
            return Response({'detail': 'Вы не являетесь участником этого чата'}, status=status.HTTP_403_FORBIDDEN)

        if request.user == message.sender:
            return Response({'detail': 'Нельзя принять свое собственное предложение'}, status=status.HTTP_400_BAD_REQUEST)

        offer_data = message.offer_data or {}
        if offer_data.get('status') != 'new':
            return Response({'detail': 'Предложение уже обработано'}, status=status.HTTP_400_BAD_REQUEST)

        from django.utils import timezone
        offer_data['status'] = 'accepted'
        offer_data['delivery_status'] = 'awaiting_upload'
        offer_data['accepted_at'] = timezone.now().isoformat()
        message.offer_data = offer_data
        message.save(update_fields=['offer_data'])
        return Response({'status': 'success'})

    @action(detail=True, methods=['post'])
    def reject_work_offer(self, request, pk=None):
        chat = self.get_object()
        blocked = _contact_ban_response(request.user, '\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435')
        if blocked is not None:
            return blocked
        message_id = request.data.get('message_id')
        if not message_id:
            return Response({'detail': 'message_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)

        message = get_object_or_404(Message, id=message_id, chat=chat)
        if message.message_type != 'work_offer' or not message.offer_data:
            return Response({'detail': 'Это сообщение не является предложением готовой работы'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user not in chat.participants.all():
            return Response({'detail': 'Вы не являетесь участником этого чата'}, status=status.HTTP_403_FORBIDDEN)

        if request.user == message.sender:
            return Response({'detail': 'Нельзя отклонить свое собственное предложение'}, status=status.HTTP_400_BAD_REQUEST)

        offer_data = message.offer_data or {}
        if offer_data.get('status') != 'new':
            return Response({'detail': 'Предложение уже обработано'}, status=status.HTTP_400_BAD_REQUEST)

        from django.utils import timezone
        offer_data['status'] = 'rejected'
        offer_data['rejected_at'] = timezone.now().isoformat()
        message.offer_data = offer_data
        message.save(update_fields=['offer_data'])
        return Response({'status': 'success'})

    @action(detail=True, methods=['post'])
    def deliver_work_offer(self, request, pk=None):
        chat = self.get_object()
        blocked = _contact_ban_response(request.user, '\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435')
        if blocked is not None:
            return blocked
        if request.user not in chat.participants.all():
            return Response({'detail': 'Вы не являетесь участником этого чата'}, status=status.HTTP_403_FORBIDDEN)

        if request.content_type and 'multipart/form-data' in request.content_type:
            message_id = request.POST.get('message_id')
            uploaded_file = request.FILES.get('file')
            text = (request.POST.get('text') or '').strip()
        else:
            message_id = request.data.get('message_id')
            uploaded_file = None
            text = (request.data.get('text') or '').strip()

        if not uploaded_file:
            return Response({'detail': 'file обязателен'}, status=status.HTTP_400_BAD_REQUEST)

        offer_message = None
        if message_id:
            # Классический флоу: есть предварительный work_offer
            offer_message = get_object_or_404(Message, id=message_id, chat=chat)
            if offer_message.message_type != 'work_offer' or not offer_message.offer_data:
                return Response({'detail': 'Это сообщение не является предложением готовой работы'}, status=status.HTTP_400_BAD_REQUEST)
            if request.user != offer_message.sender and not getattr(request.user, 'is_staff', False):
                return Response({'detail': 'Только автор предложения может отправить работу'}, status=status.HTTP_403_FORBIDDEN)
            offer_data = offer_message.offer_data or {}
            if offer_data.get('status') != 'accepted' or offer_data.get('delivery_status') != 'awaiting_upload':
                return Response({'detail': 'Сейчас нельзя отправить работу по этому предложению'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({'detail': 'message_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)

        allowed_extensions = getattr(settings, 'ALLOWED_EXTENSIONS', [
            'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt',
            'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg',
            'zip', 'rar', '7z', 'ppt', 'pptx', 'xls', 'xlsx', 'csv',
            'dwg', 'dxf', 'cdr',
        ])
        max_size = getattr(settings, 'MAX_UPLOAD_SIZE', 50 * 1024 * 1024)
        ext = (uploaded_file.name.split('.')[-1].lower() if '.' in uploaded_file.name else '') or ''
        if ext not in allowed_extensions:
            return Response(
                {'detail': f'Недопустимый тип файла. Разрешены: {", ".join(allowed_extensions)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if uploaded_file.size > max_size:
            return Response(
                {'detail': f'Размер файла не должен превышать {max_size // (1024*1024)} МБ.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        file_name = uploaded_file.name[:255] if len(uploaded_file.name) > 255 else uploaded_file.name
        delivery_text = text or 'Работа отправлена'

        try:
            delivery_offer_data = None
            if offer_message:
                delivery_offer_data = {'work_offer_message_id': offer_message.id}
            else:
                from apps.shop.models import Purchase, ReadyWork
                work_id = None
                if chat.order_id:
                    purchase = Purchase.objects.filter(order_id=chat.order_id).first()
                    if purchase:
                        work_id = purchase.work_id
                if not work_id:
                    import re
                    m = re.search(r'work:(\d+)', str(chat.context_title))
                    if m:
                        work_id = int(m.group(1))
                delivery_offer_data = {
                    'delivery_status': 'delivered',
                    'delivered_at': timezone.now().isoformat(),
                    'work_id': work_id,
                }
            delivery_message = Message(
                chat=chat,
                sender=request.user,
                text=delivery_text,
                file=uploaded_file,
                file_name=file_name,
                message_type='work_delivery',
                offer_data=delivery_offer_data
            )
            delivery_message.full_clean()
            delivery_message.save()
        except Exception as e:
            return Response(
                {'detail': getattr(e, 'message', None) or str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.utils import timezone
        if offer_message:
            offer_data['delivery_status'] = 'delivered'
            offer_data['delivered_message_id'] = delivery_message.id
            offer_data['delivered_at'] = timezone.now().isoformat()
            offer_message.offer_data = offer_data
            offer_message.save(update_fields=['offer_data'])

        delivery_order = chat.order if chat.order_id and chat.order else None
        if not delivery_order:
            raw_order_id = offer_data.get('order_id') or offer_data.get('work_id')
            try:
                resolved_order_id = int(raw_order_id)
            except (TypeError, ValueError):
                resolved_order_id = None
            if resolved_order_id:
                delivery_order = Order.objects.filter(id=resolved_order_id).first()
                if delivery_order and chat.order_id != delivery_order.id:
                    chat.order = delivery_order
                    chat.save(update_fields=['order'])

        if delivery_order:
            marker = f'chat_delivery_message_id:{delivery_message.id}'
            already_attached = OrderFile.objects.filter(
                order_id=delivery_order.id,
                description=marker
            ).exists()
            if not already_attached:
                try:
                    OrderFile.objects.create(
                        order=delivery_order,
                        file=delivery_message.file,
                        file_type='solution',
                        uploaded_by=request.user,
                        description=marker
                    )
                except Exception:
                    pass

        return Response(MessageSerializer(delivery_message, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def accept_work_delivery(self, request, pk=None):
        chat = self.get_object()
        blocked = _contact_ban_response(request.user, '\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435')
        if blocked is not None:
            return blocked
        message_id = request.data.get('message_id')
        if not message_id:
            return Response({'detail': 'message_id обязатен'}, status=status.HTTP_400_BAD_REQUEST)

        delivery_message = get_object_or_404(Message, id=message_id, chat=chat)
        is_direct_delivery = delivery_message.message_type == 'work_delivery'
        is_work_offer_delivery = delivery_message.message_type == 'work_offer'

        if not is_direct_delivery and not is_work_offer_delivery:
            return Response({'detail': 'Это сообщение не является доставкой работы'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user not in chat.participants.all():
            return Response({'detail': 'Вы не являетесь участником этого чата'}, status=status.HTTP_403_FORBIDDEN)

        if request.user == delivery_message.sender:
            return Response({'detail': 'Нельзя принять свою собственную работу'}, status=status.HTTP_400_BAD_REQUEST)

        rating = request.data.get('rating', None)
        # Оценка обычного заказа создаётся только при итоговой приёмке заказа.
        # Здесь рейтинг допустим лишь для покупки готовой работы.
        if chat.order_id:
            rating = None
        if rating is not None and rating != '':
            try:
                rating = int(rating)
            except (TypeError, ValueError):
                return Response({'detail': 'rating должен быть числом'}, status=status.HTTP_400_BAD_REQUEST)
            if rating < 1 or rating > 5:
                return Response({'detail': 'rating должен быть в диапазоне 1..5'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            rating = None

        delivery_data = delivery_message.offer_data or {}

        if is_work_offer_delivery:
            if delivery_data.get('status') != 'accepted' or delivery_data.get('delivery_status') != 'delivered':
                return Response({'detail': 'Сейчас нельзя принять работу по этому предложению'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            if delivery_data.get('delivery_status') not in ('delivered', 'pending'):
                return Response({'detail': 'Сейчас нельзя принять работу'}, status=status.HTTP_400_BAD_REQUEST)

        from django.utils import timezone
        delivery_data['delivery_status'] = 'accepted'
        delivery_data['delivery_accepted_at'] = timezone.now().isoformat()
        if rating is not None:
            delivery_data['rating'] = rating
        delivery_message.offer_data = delivery_data
        delivery_message.save(update_fields=['offer_data'])

        # Для работы с файлом: при прямой доставке файл лежит прямо в work_delivery сообщении,
        # при классическом флоу — в отдельном сообщении (delivered_message_id)
        work_file_message = delivery_message if is_direct_delivery else None
        delivered_message_id = delivery_data.get('delivered_message_id')
        if delivered_message_id:
            work_file_message = Message.objects.filter(id=delivered_message_id, chat=chat).first()

        try:
            work_id = delivery_data.get('work_id')
            if not work_id and chat.order_id:
                from apps.shop.models import Purchase
                purchase = Purchase.objects.filter(order_id=chat.order_id).first()
                if purchase:
                    work_id = purchase.work_id
            if not work_id and chat.context_title:
                import re
                m = re.search(r'work:(\d+)', str(chat.context_title))
                if m:
                    work_id = int(m.group(1))

            if work_id:
                from apps.shop.models import Purchase, ReadyWork

                work = ReadyWork.objects.filter(id=work_id).first()
                if work:
                    purchase = (
                        Purchase.objects.filter(work=work, buyer=request.user)
                        .order_by('-created_at', '-id')
                        .first()
                    )
                    if purchase is None:
                        purchase = Purchase.objects.create(
                            work=work,
                            buyer=request.user,
                            price_paid=work.price,
                        )

                    if work_file_message and work_file_message.file:
                        file_name = work_file_message.file_name or ''
                        if not file_name and getattr(work_file_message.file, 'name', None):
                            file_name = str(work_file_message.file.name).split('/')[-1]
                        ext = ''
                        if file_name and '.' in file_name:
                            ext = file_name.split('.')[-1].lower()

                        purchase.delivered_file = work_file_message.file
                        purchase.delivered_file_name = file_name or purchase.delivered_file_name
                        purchase.delivered_file_type = ext or purchase.delivered_file_type
                        try:
                            purchase.delivered_file_size = int(work_file_message.file.size or 0)
                        except Exception:
                            purchase.delivered_file_size = 0
                    elif chat.order_id and not purchase.delivered_file:
                        # Кнопка «Выгрузить работу» загружает файлы в заказ (OrderFile),
                        # а не прикрепляет к сообщению — берём файл из заказа.
                        from apps.orders.models import OrderFile
                        order_file = (
                            OrderFile.objects.filter(
                                order_id=chat.order_id,
                                file_type='solution',
                            )
                            .order_by('-id')
                            .first()
                        )
                        if order_file and order_file.file:
                            file_name = order_file.file_name or ''
                            if not file_name and getattr(order_file.file, 'name', None):
                                file_name = str(order_file.file.name).split('/')[-1]
                            ext = ''
                            if file_name and '.' in file_name:
                                ext = file_name.split('.')[-1].lower()
                            purchase.delivered_file = order_file.file
                            purchase.delivered_file_name = file_name or purchase.delivered_file_name
                            purchase.delivered_file_type = ext or purchase.delivered_file_type
                            try:
                                purchase.delivered_file_size = int(order_file.file.size or 0)
                            except Exception:
                                purchase.delivered_file_size = 0

                    if rating is not None:
                        purchase.rating = rating
                        purchase.rated_at = timezone.now()

                    update_fields = [
                        'delivered_file',
                        'delivered_file_name',
                        'delivered_file_type',
                        'delivered_file_size',
                        'rating',
                        'rated_at',
                    ]
                    purchase.save(update_fields=update_fields)
        except Exception:
            pass

        try:
            if chat.order_id and work_file_message and work_file_message.file:
                marker = f'chat_delivery_message_id:{work_file_message.id}'
                already_attached = OrderFile.objects.filter(
                    order_id=chat.order_id,
                    description=marker
                ).exists()
                if not already_attached:
                    OrderFile.objects.create(
                        order=chat.order,
                        file=work_file_message.file,
                        file_type='solution',
                        uploaded_by=work_file_message.sender,
                        description=marker
                    )
        except Exception:
            pass

        # Создаем рейтинг эксперта для заказа, если указан rating и есть связь с заказом
        if rating is not None and chat.order and chat.order.expert:
            try:
                from apps.experts.models import ExpertReview
                ExpertReview.objects.get_or_create(
                    order=chat.order,
                    client=request.user,
                    defaults={
                        'expert': chat.order.expert,
                        'rating': rating,
                        'comment': ''
                    }
                )
            except Exception as e:
                # Логируем ошибку, но не ломаем основной процесс
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Ошибка создания ExpertReview: {str(e)}")

        return Response({'status': 'success'})

    @action(detail=True, methods=['post'])
    def reject_work_delivery(self, request, pk=None):
        chat = self.get_object()
        blocked = _contact_ban_response(request.user, '\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435')
        if blocked is not None:
            return blocked
        message_id = request.data.get('message_id')
        if not message_id:
            return Response({'detail': 'message_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)

        delivery_message = get_object_or_404(Message, id=message_id, chat=chat)
        is_direct_delivery = delivery_message.message_type == 'work_delivery'
        is_work_offer_delivery = delivery_message.message_type == 'work_offer'

        if not is_direct_delivery and not is_work_offer_delivery:
            return Response({'detail': 'Это сообщение не является доставкой работы'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user not in chat.participants.all():
            return Response({'detail': 'Вы не являетесь участником этого чата'}, status=status.HTTP_403_FORBIDDEN)

        if request.user == delivery_message.sender:
            return Response({'detail': 'Нельзя отклонить свою собственную работу'}, status=status.HTTP_400_BAD_REQUEST)

        delivery_data = delivery_message.offer_data or {}
        if is_work_offer_delivery:
            if delivery_data.get('status') != 'accepted' or delivery_data.get('delivery_status') != 'delivered':
                return Response({'detail': 'Сейчас нельзя отклонить работу по этому предложению'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            if delivery_data.get('delivery_status') not in ('delivered', 'pending'):
                return Response({'detail': 'Сейчас нельзя отклонить работу'}, status=status.HTTP_400_BAD_REQUEST)

        from django.utils import timezone
        delivery_data['delivery_status'] = 'rejected'
        delivery_data['delivery_rejected_at'] = timezone.now().isoformat()
        delivery_message.offer_data = delivery_data
        delivery_message.save(update_fields=['offer_data'])
        return Response({'status': 'success'})

    @action(detail=True, methods=['post'])
    def accept_offer(self, request, pk=None):
        """Принять индивидуальное предложение"""
        chat = self.get_object()
        blocked = _contact_ban_response(request.user, '\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435')
        if blocked is not None:
            return blocked
        message_id = request.data.get('message_id')
        
        if not message_id:
            return Response({'detail': 'message_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)
            
        message = get_object_or_404(Message, id=message_id, chat=chat)
        
        if message.message_type != 'offer' or not message.offer_data:
            return Response({'detail': 'Это сообщение не является предложением'}, status=status.HTTP_400_BAD_REQUEST)
            
        if request.user == message.sender:
            return Response({'detail': 'Нельзя принять свое собственное предложение'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user not in chat.participants.all():
            return Response(
                {'detail': 'Вы не являетесь участником этого чата'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Проверка срока действия (2 дня)
        from django.utils import timezone
        import datetime
        if timezone.now() > message.created_at + datetime.timedelta(days=2):
            return Response({'detail': 'Срок действия предложения истек'}, status=status.HTTP_400_BAD_REQUEST)
            
        offer_data = message.offer_data
        if not isinstance(offer_data, dict):
            return Response({'detail': 'Некорректные данные предложения'}, status=status.HTTP_400_BAD_REQUEST)
        if offer_data.get('status', 'new') != 'new':
            return Response({'detail': 'Предложение уже обработано'}, status=status.HTTP_400_BAD_REQUEST)

        # Создаем заказ
        try:
            if not getattr(message.sender, 'is_staff', False) and getattr(message.sender, 'role', None) != 'expert':
                return Response({'detail': 'Предложение может быть только от эксперта'}, status=status.HTTP_400_BAD_REQUEST)

            # Парсим дедлайн. Предполагаем, что фронт шлет ISO строку или что-то понятное.
            deadline_str = offer_data.get('deadline')
            deadline = None
            if deadline_str:
                # Если приходит timestamp (число)
                if isinstance(deadline_str, (int, float)):
                    deadline = timezone.datetime.fromtimestamp(deadline_str / 1000.0, tz=timezone.utc)
                else:
                    # Попытка распарсить строку
                    try:
                        deadline = timezone.datetime.fromisoformat(deadline_str.replace('Z', '+00:00'))
                    except ValueError:
                        return Response({'detail': 'Некорректный формат deadline'}, status=status.HTTP_400_BAD_REQUEST)
            
            if not deadline:
                deadline = timezone.now() + datetime.timedelta(days=3)

            subject_id = offer_data.get('subject_id')
            if subject_id is not None and subject_id != '':
                try:
                    subject_id = int(subject_id)
                except (TypeError, ValueError):
                    return Response({'detail': 'subject_id должен быть числом'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                subject_id = None

            work_type_id = offer_data.get('work_type_id')
            if work_type_id is not None and work_type_id != '':
                try:
                    work_type_id = int(work_type_id)
                except (TypeError, ValueError):
                    return Response({'detail': 'work_type_id должен быть числом'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                work_type_id = None

            cost_raw = offer_data.get('cost')
            if cost_raw is None or cost_raw == '':
                return Response({'detail': 'cost обязателен'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                cost = Decimal(str(cost_raw))
            except (InvalidOperation, ValueError, TypeError):
                return Response({'detail': 'cost должен быть числом'}, status=status.HTTP_400_BAD_REQUEST)
            if cost < 0:
                return Response({'detail': 'cost не может быть отрицательным'}, status=status.HTTP_400_BAD_REQUEST)

            client_user = chat.client or request.user
            expert_user = chat.expert or message.sender
            prepayment_raw = offer_data.get('prepayment_percent', 50)
            try:
                prepayment_percent = int(prepayment_raw)
            except (TypeError, ValueError):
                return Response({'detail': 'Процент предоплаты должен быть числом.'}, status=status.HTTP_400_BAD_REQUEST)
            if prepayment_percent < 0 or prepayment_percent > 100:
                return Response({'detail': 'Процент предоплаты должен быть от 0 до 100.'}, status=status.HTTP_400_BAD_REQUEST)

            with transaction.atomic():
                message = Message.objects.select_for_update().get(pk=message.pk)
                offer_data = message.offer_data or {}
                if not isinstance(offer_data, dict):
                    return Response({'detail': 'Некорректные данные предложения'}, status=status.HTTP_400_BAD_REQUEST)
                if offer_data.get('status', 'new') != 'new':
                    return Response({'detail': 'Предложение уже обработано'}, status=status.HTTP_400_BAD_REQUEST)

                linked_order_id = offer_data.get('linked_order_id')

                if linked_order_id:
                    order = Order.objects.select_for_update().get(pk=linked_order_id)
                    is_new_unassigned = order.status == 'new' and order.expert_id is None
                    is_current_expert_order = (
                        order.status in {'in_progress', 'revision'}
                        and order.expert_id == expert_user.id
                    )
                    if not (is_new_unassigned or is_current_expert_order):
                        return Response(
                            {'detail': 'Заказ недоступен для этого предложения.'},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    if is_new_unassigned:
                        order.expert = expert_user
                        order.budget = cost
                        order.deadline = deadline
                        order.status = 'in_progress'
                        order.save(update_fields=['expert', 'budget', 'deadline', 'status', 'updated_at'])
                    else:
                        order.budget = cost
                        if deadline:
                            order.deadline = deadline
                        order.save(update_fields=['budget', 'deadline', 'updated_at'])
                else:
                    order = Order.objects.create(
                        client=client_user,
                        expert=expert_user,
                        subject_id=subject_id if subject_id else None,
                        work_type_id=work_type_id if work_type_id else None,
                        custom_subject=offer_data.get('subject') if not subject_id else None,
                        custom_work_type=offer_data.get('work_type') if not work_type_id else None,
                        title=offer_data.get('title') or None,
                        description=offer_data.get('description'),
                        budget=cost,
                        deadline=deadline,
                        status='in_progress'
                    )

                if cost > 0:
                    _fund_individual_offer(
                        order,
                        client_user,
                        expert_user,
                        cost,
                        prepayment_percent,
                    )
                offer_data['prepayment_percent'] = prepayment_percent
            
                # Обновляем статус предложения
                offer_data['status'] = 'accepted'
                offer_data['order_id'] = order.id
                message.offer_data = offer_data
                message.save(update_fields=['offer_data'])

            _direct_chat, order_chat, _order_message = ensure_order_chat_started(
                order,
                sender=client_user,
                text=message.text or f'Заказ #{order.id} принят в работу',
                original_offer_data=offer_data,
            )

            try:
                safe_call(NotificationService.create_notification,
                    recipient=expert_user,
                    type=NotificationType.ORDER_ASSIGNED,
                    title="Индивидуальное предложение принято",
                    message=f"Клиент принял ваше индивидуальное предложение. Можно начинать работу по заказу №{order.id}.",
                    related_object_id=order.id,
                    related_object_type='order',
                    data={
                        'order_id': order.id,
                        'chat_id': order_chat.id,
                        'offer_message_id': message.id
                    })
            except Exception:
                pass
                
            return Response({'status': 'success', 'order_id': order.id, 'chat_id': order_chat.id})
            
        except Exception as e:
            if isinstance(e, InsufficientFunds):
                return Response(
                    {'detail': 'Недостаточно средств на кошельке. Пополните баланс перед принятием предложения.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"[accept_offer] Error accepting offer in chat {pk}: {e}", exc_info=True)
            from django.db import IntegrityError
            if isinstance(e, IntegrityError):
                return Response(
                    {'detail': 'Ошибка при создании заказа. Проверьте корректность данных предложения.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            return Response(
                {'detail': f'Ошибка при принятии предложения: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def reject_offer(self, request, pk=None):
        """Отклонить индивидуальное предложение"""
        chat = self.get_object()
        blocked = _contact_ban_response(request.user, '\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435')
        if blocked is not None:
            return blocked
        message_id = request.data.get('message_id')
        
        if not message_id:
            return Response({'detail': 'message_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():
            message = get_object_or_404(Message.objects.select_for_update(), id=message_id, chat=chat)

            if message.message_type != 'offer':
                return Response({'detail': 'Это сообщение не является предложением'}, status=status.HTTP_400_BAD_REQUEST)

            offer_data = message.offer_data or {}
            if offer_data.get('status', 'new') != 'new':
                return Response({'detail': 'Предложение уже обработано'}, status=status.HTTP_400_BAD_REQUEST)
            offer_data['status'] = 'rejected'
            message.offer_data = offer_data
            message.save(update_fields=['offer_data'])
        
        return Response({'status': 'success'})

    @action(detail=True, methods=['post'])
    def cancel_offer(self, request, pk=None):
        """Отменить своё индивидуальное предложение (только для эксперта-автора)."""
        chat = self.get_object()
        blocked = _contact_ban_response(request.user, 'Действие')
        if blocked is not None:
            return blocked

        message_id = request.data.get('message_id')
        if not message_id:
            return Response({'detail': 'message_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            message = get_object_or_404(Message.objects.select_for_update(), id=message_id, chat=chat)

            if message.message_type != 'offer':
                return Response({'detail': 'Это сообщение не является предложением'}, status=status.HTTP_400_BAD_REQUEST)

            if message.sender_id != request.user.id and not getattr(request.user, 'is_staff', False):
                return Response({'detail': 'Вы можете отменить только своё предложение'}, status=status.HTTP_403_FORBIDDEN)

            offer_data = message.offer_data or {}
            if offer_data.get('status', 'new') != 'new':
                return Response({'detail': 'Предложение уже обработано'}, status=status.HTTP_400_BAD_REQUEST)

            offer_data['status'] = 'cancelled'
            message.offer_data = offer_data
            message.save(update_fields=['offer_data'])

        return Response({'status': 'success'})

    @action(detail=True, methods=['post'])
    def toggle_message_pin(self, request, pk=None):
        chat = self.get_object()
        if request.user not in chat.participants.all():
            return Response({'detail': 'Вы не являетесь участником этого чата'}, status=status.HTTP_403_FORBIDDEN)
        message_id = request.data.get('message_id')
        message = get_object_or_404(Message, id=message_id, chat=chat)
        if message.message_type == 'system':
            return Response({'detail': 'Системное сообщение нельзя закрепить'}, status=status.HTTP_400_BAD_REQUEST)
        message.is_pinned = not message.is_pinned
        message.save(update_fields=['is_pinned'])
        return Response(MessageSerializer(message, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Отметить все сообщения в чате как прочитанные"""
        chat = self.get_object()
        if request.user not in chat.participants.all():
            return Response(
                {'detail': 'Вы не являетесь участником этого чата'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Отмечаем как прочитанные все сообщения, которые не от текущего пользователя
        related_chats = Chat.objects.filter(participants=request.user).exclude(hidden_for_users=request.user)
        if chat.client_id and chat.expert_id:
            related_chats = related_chats.filter(client_id=chat.client_id, expert_id=chat.expert_id)
        else:
            related_chats = related_chats.filter(pk=chat.pk)

        updated = 0
        for related_chat in related_chats.distinct():
            updated += readable_messages_for_chat(related_chat).exclude(sender=request.user).filter(is_read=False).update(is_read=True)
        
        return Response({'status': 'success', 'updated': updated})

    @action(detail=True, methods=['post'])
    def mark_as_unread(self, request, pk=None):
        """Пометить чат как непрочитанный"""
        chat = self.get_object()
        if request.user not in chat.participants.all():
            return Response(
                {'detail': 'Вы не являетесь участником этого чата'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Отмечаем все сообщения как непрочитанные
        readable_messages_for_chat(chat).exclude(sender=request.user).exclude(message_type='system').update(is_read=False)
        
        return Response({'status': 'success'})

    @action(detail=True, methods=['post'])
    def pin_message(self, request, pk=None):
        chat = self.get_object()
        if request.user not in chat.participants.all() and not request.user.is_staff:
            return Response({'detail': 'Недостаточно прав.'}, status=status.HTTP_403_FORBIDDEN)
        message_id = request.data.get('message_id')
        if not message_id:
            return Response({'detail': 'message_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)
        message = get_object_or_404(Message, id=message_id, chat=chat)
        if message.message_type == 'system':
            return Response({'detail': 'Системное сообщение нельзя закрепить'}, status=status.HTTP_400_BAD_REQUEST)
        message.is_pinned = not message.is_pinned
        message.save(update_fields=['is_pinned'])
        return Response({'id': message.id, 'is_pinned': message.is_pinned})

    @action(detail=True, methods=['post'])
    def toggle_pin(self, request, pk=None):
        """Закрепить/открепить чат"""
        chat = self.get_object()
        if request.user not in chat.participants.all():
            return Response(
                {'detail': 'Вы не являетесь участником этого чата'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Проверяем, закреплён ли уже чат
        pin = ChatPin.objects.filter(user=request.user, chat=chat).first()
        
        if pin:
            # Открепляем чат
            pin.delete()
            return Response({'status': 'unpinned', 'message': 'Чат откреплён'})
        else:
            # Закрепляем чат
            ChatPin.objects.create(user=request.user, chat=chat)
            return Response({'status': 'pinned', 'message': 'Чат закреплён'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Получить общее количество непрочитанных сообщений"""
        user = request.user

        visible_chats = Chat.objects.filter(participants=user).exclude(hidden_for_users=user)

        support_user_id = getattr(settings, 'SUPPORT_USER_ID', None)
        if support_user_id:
            visible_chats = visible_chats.exclude(participants__id=support_user_id)

        visible_chats = visible_chats.exclude(
            Q(context_title__icontains='поддержка') |
            Q(context_title__icontains='support') |
            Q(context_title__icontains='техподдержка')
        )

        count = sum(unread_messages_for_user(chat, user).count() for chat in visible_chats)
        
        return Response({'unread_count': count})

    @action(detail=False, methods=['post'])
    def get_or_create_by_order(self, request):
        """Получить или создать чат по ID заказа"""
        blocked = _contact_ban_response(request.user, '\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435')
        if blocked is not None:
            return blocked
        order_id = request.data.get('order_id')
        if not order_id:
            return Response(
                {'detail': 'order_id обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response(
                {'detail': 'Заказ не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Этот endpoint поддерживает только чат между клиентом и назначенным экспертом.
        # Для чатов по откликам используйте get_or_create_by_order_and_user.
        if not order.expert_id:
            return Response(
                {'detail': 'У заказа еще нет назначенного эксперта. Используйте get_or_create_by_order_and_user.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Проверяем, что пользователь является участником заказа
        if request.user not in [order.client, order.expert]:
            return Response(
                {'detail': 'Вы не являетесь участником этого заказа'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Получаем или создаем чат
        chat = get_or_create_order_chat(order, client_user=order.client, expert_user=order.expert)
        
        serializer = ChatDetailSerializer(chat, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def get_or_create_by_order_and_user(self, request):
        """Получить или создать чат по ID заказа и ID пользователя (контекст заказа из ленты)."""
        blocked = _contact_ban_response(request.user, '\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435')
        if blocked is not None:
            return blocked
        from apps.users.models import User

        order_id = request.data.get('order_id')
        user_id = request.data.get('user_id')
        if not order_id or not user_id:
            return Response(
                {'detail': 'order_id и user_id обязательны'},
                status=status.HTTP_400_BAD_REQUEST
            )

        order = get_object_or_404(Order, id=order_id)
        other_user = get_object_or_404(User, id=user_id)

        if order.expert_id:
            participant_ids = {order.client_id, order.expert_id}
            # The order itself is the source of truth. Notification payloads can
            # contain a stale or self user_id while the order chat is being
            # created, so do not reject a real participant over that hint.
            if request.user.id in participant_ids:
                chat = get_or_create_order_chat(order, client_user=order.client, expert_user=order.expert)
                chat.hidden_for_users.remove(request.user)
                serializer = ChatDetailSerializer(chat, context={'request': request})
                return Response(serializer.data)

        # Инициатором переписки по отклику может быть только заказчик
        if request.user.id != order.client_id and not request.user.is_staff:
            return Response(
                {'detail': 'Только заказчик может инициировать чат по отклику'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Нельзя создать чат с самим собой
        if other_user.id == request.user.id:
            return Response(
                {'detail': 'Нельзя создать чат с самим собой'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if getattr(other_user, 'role', None) != 'expert' and not getattr(other_user, 'is_staff', False):
            return Response(
                {'detail': 'Чат можно создать только с экспертом'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if order.expert_id and {order.client_id, other_user.id} == {order.client_id, order.expert_id}:
            chat = get_or_create_order_chat(order, client_user=order.client, expert_user=order.expert)
            chat.hidden_for_users.remove(request.user)
            serializer = ChatDetailSerializer(chat, context={'request': request})
            return Response(serializer.data)

        client = order.client
        expert = other_user

        context_title = f"Заказ из ленты #{order.id}"
        chat = Chat.objects.filter(
            order__isnull=True,
            client=client,
            expert=expert,
            context_title=context_title
        ).order_by('id').first()

        if not chat:
            chat = Chat.objects.filter(
                order__isnull=True
            ).filter(
                Q(client_id=client.id, expert_id=expert.id) |
                Q(client_id=expert.id, expert_id=client.id)
            ).order_by('id').first()

        if not chat:
            try:
                with transaction.atomic():
                    chat = Chat.objects.create(order=None, client=client, expert=expert, context_title=context_title)
                    chat.participants.add(client, expert)
            except IntegrityError:
                chat = Chat.objects.filter(
                    order__isnull=True
                ).filter(
                    Q(client_id=client.id, expert_id=expert.id) |
                    Q(client_id=expert.id, expert_id=client.id)
                ).order_by('id').first()
                if not chat:
                    raise

        updated_fields = []
        if chat.client_id != client.id:
            chat.client = client
            updated_fields.append('client')
        if chat.expert_id != expert.id:
            chat.expert = expert
            updated_fields.append('expert')
        if not chat.context_title or chat.context_title != context_title:
            chat.context_title = context_title
            updated_fields.append('context_title')
        if updated_fields:
            chat.save(update_fields=updated_fields)
        chat.participants.add(client, expert)
        chat.hidden_for_users.remove(request.user)

        serializer = ChatDetailSerializer(chat, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def get_or_create_by_user(self, request):
        """Получить или создать чат с конкретным пользователем.
        
        Гарантирует уникальность чата между парой пользователей:
        сначала ищет существующий чат, и только если не находит — создаёт новый.
        """
        blocked = _contact_ban_response(request.user, '\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435')
        if blocked is not None:
            return blocked
        from apps.users.models import User
        
        user_id = request.data.get('user_id')
        context_title = request.data.get('context_title')
        if context_title is not None:
            context_title = str(context_title).strip()[:255] or None
        if user_id in (None, '', 0, '0'):
            return Response(
                {'detail': 'user_id обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user_id_int = int(user_id)
        except (TypeError, ValueError):
            return Response(
                {'detail': 'user_id должен быть числом'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user_id_int == request.user.id:
            return Response(
                {'detail': 'Нельзя создать чат с самим собой'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            other_user = User.objects.get(id=user_id_int)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Пользователь не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Определяем client/expert по ID (меньший ID = client), чтобы constraint работал корректно
        chat = get_or_create_direct_chat(request.user, other_user, context_title=context_title)
        chat.hidden_for_users.remove(request.user)
        serializer = ChatDetailSerializer(chat, context={'request': request})
        return Response(serializer.data)

        user_ids = sorted([request.user.id, other_user.id])
        resolved_client_id = user_ids[0]
        resolved_expert_id = user_ids[1]

        pair_chats = list(
            Chat.objects.filter(participants=request.user)
            .filter(participants=other_user)
            .exclude(
                Q(context_title__icontains='поддержка') |
                Q(context_title__icontains='support') |
                Q(context_title__icontains='техподдержка')
            )
            .annotate(last_message_time=Max('messages__created_at'))
            .order_by('-last_message_time', '-id')
        )
        if pair_chats:
            active_statuses = {'new', 'waiting_payment', 'in_progress', 'review', 'revision'}
            pair_chats.sort(
                key=lambda item: (
                    0 if getattr(item, 'order_id', None) and getattr(getattr(item, 'order', None), 'status', None) in active_statuses else (
                        1 if getattr(item, 'order_id', None) else 2
                    ),
                    -(item.last_message_time.timestamp() if getattr(item, 'last_message_time', None) else 0),
                    -item.id,
                )
            )
            existing_pair_chat = pair_chats[0]
            if context_title and not existing_pair_chat.context_title:
                existing_pair_chat.context_title = context_title
                existing_pair_chat.save(update_fields=['context_title'])
            existing_pair_chat.participants.add(request.user, other_user)
            existing_pair_chat.hidden_for_users.remove(request.user)
            serializer = ChatDetailSerializer(existing_pair_chat, context={'request': request})
            return Response(serializer.data)


        # Сначала ищем существующий чат между этими пользователями
        # Используем client_id/expert_id для надёжного поиска
        chat = Chat.objects.filter(
            order__isnull=True,
            client_id=resolved_client_id,
            expert_id=resolved_expert_id,
        ).order_by('id').first()

        if not chat:
            # Пробуем найти в обратном порядке (на случай старых данных)
            chat = Chat.objects.filter(
                order__isnull=True,
                client_id=resolved_expert_id,
                expert_id=resolved_client_id,
            ).order_by('id').first()

        if not chat:
            # Ищем через ManyToMany как запасной вариант
            chat = Chat.objects.filter(
                participants=request.user,
                order__isnull=True,
            ).filter(
                participants=other_user,
            ).order_by('id').first()

        if chat:
            # Чат найден — удаляем дубликаты и обновляем поля
            duplicates = Chat.objects.filter(
                order__isnull=True,
            ).filter(
                Q(client_id=resolved_client_id, expert_id=resolved_expert_id) |
                Q(client_id=resolved_expert_id, expert_id=resolved_client_id),
            ).exclude(id=chat.id)
            # Opening a conversation must never delete duplicate message histories.

            # Обновляем context_title если передан и чат его не имеет
            if context_title and not chat.context_title:
                chat.context_title = context_title
                chat.save(update_fields=['context_title'])

            chat.participants.add(request.user, other_user)
        else:
            # Чат не найден — создаём новый
            with transaction.atomic():
                try:
                    chat = Chat.objects.create(
                        order=None,
                        client_id=resolved_client_id,
                        expert_id=resolved_expert_id,
                        context_title=context_title,
                    )
                    chat.participants.add(request.user, other_user)
                except IntegrityError:
                    # Constraint сработал — ищем созданный чат
                    chat = Chat.objects.filter(
                        order__isnull=True,
                        client_id=resolved_client_id,
                        expert_id=resolved_expert_id,
                    ).order_by('id').first()
                    if not chat:
                        chat = Chat.objects.filter(
                            order__isnull=True,
                            client_id=resolved_expert_id,
                            expert_id=resolved_client_id,
                        ).order_by('id').first()
                    if chat:
                        chat.participants.add(request.user, other_user)
                    else:
                        raise

        chat.hidden_for_users.remove(request.user)
        
        serializer = ChatDetailSerializer(chat, context={'request': request})
        return Response(serializer.data)



# ViewSet для чатов технической поддержки

from .models import SupportChat, SupportMessage
from rest_framework.pagination import PageNumberPagination


class SupportChatViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления чатами технической поддержки.
    
    Эти чаты отображаются ТОЛЬКО в разделе "Чаты поддержки" в админ-панели
    и НЕ отображаются на странице обычных чатов пользователей.
    
    Права доступа:
    - Админы видят все чаты поддержки
    - Клиенты видят только свои чаты с поддержкой
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SupportChatSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        # Админы видят все чаты
        if user.role == 'admin':
            return SupportChat.objects.all().select_related(
                'client', 'admin'
            ).prefetch_related('support_messages__sender')
        
        # Клиенты видят только свои чаты
        return SupportChat.objects.filter(
            client=user
        ).select_related('admin').prefetch_related('support_messages__sender')
    
    def create(self, request, *args, **kwargs):
        """Создание нового чата поддержки"""
        blocked = _contact_ban_response(request.user, '\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435')
        if blocked is not None:
            return blocked
        subject = request.data.get('subject', 'Вопрос по работе платформы')
        priority = request.data.get('priority', 'medium')
        initial_message = request.data.get('message', '')
        
        if not initial_message:
            return Response(
                {'detail': 'Сообщение обязательно'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Создаем чат
        chat = SupportChat.objects.create(
            client=request.user,
            subject=subject,
            priority=priority,
            status='open'
        )
        
        # Создаем первое сообщение
        SupportMessage.objects.create(
            chat=chat,
            sender=request.user,
            text=initial_message
        )
        
        return Response({
            'id': chat.id,
            'subject': chat.subject,
            'status': chat.status,
            'priority': chat.priority,
            'created_at': chat.created_at
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Отправка сообщения в чат поддержки"""
        chat = self.get_object()
        blocked = _contact_ban_response(request.user, '\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435')
        if blocked is not None:
            return blocked
        text = request.data.get('text', '').strip()
        uploaded_file = request.FILES.get('file')
        
        if not text and not uploaded_file:
            return Response(
                {'detail': 'Укажите текст сообщения или прикрепите файл'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Создаем сообщение
        message = SupportMessage.objects.create(
            chat=chat,
            sender=request.user,
            text=text or '',
            file=uploaded_file,
            message_type='file' if uploaded_file else 'text'
        )
        
        # Обновляем время последнего обновления чата
        chat.save(update_fields=['updated_at'])
        
        return Response({
            'id': message.id,
            'text': message.text,
            'sender': {
                'id': message.sender.id,
                'username': message.sender.username,
                'first_name': message.sender.first_name,
                'last_name': message.sender.last_name,
                'role': message.sender.role,
            },
            'created_at': message.created_at,
            'is_read': message.is_read
        })
    
    @action(detail=True, methods=['post'])
    def take_chat(self, request, pk=None):
        """Взять чат в работу (только для админов)"""
        if request.user.role != 'admin':
            return Response(
                {'detail': 'Доступно только для администраторов'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        chat = self.get_object()
        chat.admin = request.user
        chat.status = 'in_progress'
        chat.save()
        
        # Системное сообщение
        SupportMessage.objects.create(
            chat=chat,
            sender=request.user,
            text=f'Администратор {request.user.get_full_name() or request.user.username} взял обращение в работу',
            message_type='system'
        )
        
        return Response({'status': 'success'})
    
    @action(detail=True, methods=['post'])
    def close_chat(self, request, pk=None):
        """Закрыть чат"""
        chat = self.get_object()
        
        # Только админ или клиент могут закрыть чат
        if request.user.role != 'admin' and request.user != chat.client:
            return Response(
                {'detail': 'Недостаточно прав'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        chat.status = 'resolved'
        chat.save()
        
        # Системное сообщение
        SupportMessage.objects.create(
            chat=chat,
            sender=request.user,
            text=f'Чат закрыт пользователем {request.user.get_full_name() or request.user.username}',
            message_type='system'
        )
        
        return Response({'status': 'success'})
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Получить сообщения чата"""
        chat = self.get_object()
        messages = chat.support_messages.all().select_related('sender')
        
        # Отмечаем сообщения как прочитанные
        if request.user == chat.client:
            messages.filter(sender__role='admin', is_read=False).update(is_read=True)
        elif request.user.role == 'admin':
            messages.filter(sender=chat.client, is_read=False).update(is_read=True)
        
        messages_data = []
        for msg in messages:
            messages_data.append({
                'id': msg.id,
                'text': msg.text,
                'sender': {
                    'id': msg.sender.id,
                    'username': msg.sender.username,
                    'first_name': msg.sender.first_name,
                    'last_name': msg.sender.last_name,
                    'role': msg.sender.role,
                    'is_admin': msg.sender.role == 'admin',
                },
                'message_type': msg.message_type,
                'file': request.build_absolute_uri(msg.file.url) if msg.file else None,
                'is_read': msg.is_read,
                'created_at': msg.created_at,
                'is_mine': msg.sender == request.user,
            })
        
        return Response(messages_data)
    
    @action(detail=True, methods=['post'])
    def create_ticket(self, request, pk=None):
        """Создать тикет из чата поддержки"""
        chat = self.get_object()
        
        # Проверяем права доступа
        if request.user.role != 'admin' and request.user != chat.client:
            return Response(
                {'detail': 'Недостаточно прав'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Проверяем, не создан ли уже тикет
        from apps.admin_panel.models import SupportRequest
        existing_ticket = SupportRequest.objects.filter(support_chat=chat).first()
        
        if existing_ticket:
            return Response({
                'ticket_id': existing_ticket.id,
                'created': False,
                'status': 'already_exists',
                'message': 'Тикет уже существует'
            })
        
        # Получаем первое сообщение для описания
        first_message = chat.support_messages.first()
        description = first_message.text if first_message else chat.subject
        
        # Создаем тикет
        ticket = SupportRequest.objects.create(
            user=chat.client,
            support_chat=chat,
            subject=chat.subject,
            description=description,
            status='open',
            priority=chat.priority,
            auto_created=False  # Создан вручную через action
        )
        
        # Копируем все сообщения из чата в тикет
        from apps.admin_panel.models import SupportMessage as AdminSupportMessage
        for msg in chat.support_messages.all():
            if msg.message_type == 'text':
                AdminSupportMessage.objects.create(
                    request=ticket,
                    sender=msg.sender,
                    message=msg.text,
                    is_admin=(msg.sender.role == 'admin')
                )
        
        return Response({
            'ticket_id': ticket.id,
            'created': True,
            'status': 'success',
            'message': 'Тикет успешно создан'
        })


class ContactViolationViewSet(viewsets.ModelViewSet):
    """ViewSet для управления нарушениями обмена контактами"""
    from .models import ContactViolationLog
    from .serializers import ContactViolationSerializer
    
    queryset = ContactViolationLog.objects.all()
    serializer_class = ContactViolationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Админы видят все нарушения
        if user.role == 'admin':
            return self.queryset.select_related('chat', 'user', 'message', 'reviewed_by')
        
        # Обычные пользователи видят только свои нарушения
        return self.queryset.filter(user=user).select_related('chat', 'message')
    
    @action(detail=True, methods=['post'])
    def approve_violation(self, request, pk=None):
        """Одобрить нарушение (разморозить чат)"""
        if request.user.role != 'admin':
            return Response(
                {'detail': 'Доступно только для администраторов'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        violation = self.get_object()
        decision = request.data.get('decision', 'Одобрено администратором')
        
        # Размораживаем чат
        from .services import ChatModerationService
        ChatModerationService.unfreeze_chat(
            chat=violation.chat,
            admin_user=request.user,
            decision=decision
        )
        
        # Обновляем статус нарушения
        violation.status = 'approved'
        violation.reviewed_by = request.user
        violation.reviewed_at = timezone.now()
        violation.admin_decision = decision
        violation.save()
        
        return Response({'message': 'Чат разморожен, нарушение одобрено'})
    
    @action(detail=True, methods=['post'])
    def reject_violation(self, request, pk=None):
        """Отклонить нарушение (оставить чат замороженным)"""
        if request.user.role != 'admin':
            return Response(
                {'detail': 'Доступно только для администраторов'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        violation = self.get_object()
        decision = request.data.get('decision', 'Нарушение подтверждено')
        
        # Обновляем статус нарушения
        violation.status = 'rejected'
        violation.reviewed_by = request.user
        violation.reviewed_at = timezone.now()
        violation.admin_decision = decision
        violation.save()
        
        # Чат остается замороженным
        return Response({'message': 'Нарушение подтверждено, чат остается замороженным'})
    
    @action(detail=False, methods=['get'])
    def pending_violations(self, request):
        """Получить список нарушений, ожидающих проверки"""
        if request.user.role != 'admin':
            return Response(
                {'detail': 'Доступно только для администраторов'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        violations = self.get_queryset().filter(status='pending').order_by('-created_at')
        serializer = self.get_serializer(violations, many=True)
        return Response(serializer.data)
    
    def list(self, request, *args, **kwargs):
        """Список чатов поддержки"""
        queryset = self.get_queryset()
        
        # Фильтрация по статусу
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        queryset = queryset.order_by('-updated_at')
        
        chats_data = []
        for chat in queryset:
            last_message = chat.support_messages.last()
            
            chats_data.append({
                'id': chat.id,
                'client': {
                    'id': chat.client.id,
                    'username': chat.client.username,
                    'first_name': chat.client.first_name,
                    'last_name': chat.client.last_name,
                    'email': chat.client.email,
                },
                'admin': {
                    'id': chat.admin.id,
                    'first_name': chat.admin.first_name,
                    'last_name': chat.admin.last_name,
                    'role': 'Администратор поддержки',
                } if chat.admin else None,
                'status': chat.status,
                'priority': chat.priority,
                'subject': chat.subject,
                'last_message': {
                    'text': last_message.text if last_message else '',
                    'created_at': last_message.created_at if last_message else chat.created_at,
                } if last_message else None,
                'unread_count': chat.unread_count if request.user == chat.client else 0,
                'created_at': chat.created_at,
                'updated_at': chat.updated_at,
            })
        
        return Response(chats_data)
