from django.conf import settings
from django.shortcuts import render
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q, Max, Count, Prefetch
from django.db import transaction, IntegrityError
from .models import Chat, Message, SupportChat, SupportMessage, ChatPin
from .serializers import ChatListSerializer, ChatDetailSerializer, MessageSerializer, SupportChatSerializer, SupportMessageSerializer
from .websocket_utils import notify_chat_message, notify_typing
from apps.orders.models import Order, OrderFile
from apps.notifications.models import NotificationType
from apps.notifications.services import NotificationService
from decimal import Decimal, InvalidOperation

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

            # Уведомляем всех участников чата через персональные уведомления
            for participant in chat.participants.exclude(id=request.user.id):
                from .websocket_utils import notify_new_notification
                notify_new_notification(
                    participant.id,
                    {
                        'id': message.id,
                        'chat_id': chat.id,
                        'sender': request.user.username,
                        'text': (message.text or '')[:100],
                        'created_at': message.created_at.isoformat(),
                    }
                )
        except Exception:
            pass

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
                    NotificationService.create_notification(
                        recipient=recipient,
                        type=NotificationType.NEW_BID,
                        title=f"Индивидуальное предложение{f': {offer_title}' if offer_title else ''}",
                        message=f"Эксперт {request.user.get_full_name() or request.user.username} отправил вам индивидуальное предложение {target_label}.{cost_suffix}",
                        related_object_id=chat.order_id if chat.order_id else chat.id,
                        related_object_type='order' if chat.order_id else 'chat',
                        data={
                            'chat_id': chat.id,
                            'message_id': message.id
                        }
                    )
            except Exception:
                pass

        return Response(MessageSerializer(message, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def accept_work_offer(self, request, pk=None):
        chat = self.get_object()
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

        if not message_id:
            return Response({'detail': 'message_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)
        if not uploaded_file:
            return Response({'detail': 'file обязателен'}, status=status.HTTP_400_BAD_REQUEST)

        offer_message = get_object_or_404(Message, id=message_id, chat=chat)
        if offer_message.message_type != 'work_offer' or not offer_message.offer_data:
            return Response({'detail': 'Это сообщение не является предложением готовой работы'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user != offer_message.sender and not getattr(request.user, 'is_staff', False):
            return Response({'detail': 'Только автор предложения может отправить работу'}, status=status.HTTP_403_FORBIDDEN)

        offer_data = offer_message.offer_data or {}
        if offer_data.get('status') != 'accepted' or offer_data.get('delivery_status') != 'awaiting_upload':
            return Response({'detail': 'Сейчас нельзя отправить работу по этому предложению'}, status=status.HTTP_400_BAD_REQUEST)

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
            delivery_message = Message(
                chat=chat,
                sender=request.user,
                text=delivery_text,
                file=uploaded_file,
                file_name=file_name,
                message_type='work_delivery',
                offer_data={'work_offer_message_id': int(offer_message.id)}
            )
            delivery_message.full_clean()
            delivery_message.save()
        except Exception as e:
            return Response(
                {'detail': getattr(e, 'message', None) or str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.utils import timezone
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
        message_id = request.data.get('message_id')
        if not message_id:
            return Response({'detail': 'message_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)

        offer_message = get_object_or_404(Message, id=message_id, chat=chat)
        if offer_message.message_type != 'work_offer' or not offer_message.offer_data:
            return Response({'detail': 'Это сообщение не является предложением готовой работы'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user not in chat.participants.all():
            return Response({'detail': 'Вы не являетесь участником этого чата'}, status=status.HTTP_403_FORBIDDEN)

        if request.user == offer_message.sender:
            return Response({'detail': 'Нельзя принять свою собственную работу'}, status=status.HTTP_400_BAD_REQUEST)

        rating = request.data.get('rating', None)
        if rating is not None and rating != '':
            try:
                rating = int(rating)
            except (TypeError, ValueError):
                return Response({'detail': 'rating должен быть числом'}, status=status.HTTP_400_BAD_REQUEST)
            if rating < 1 or rating > 5:
                return Response({'detail': 'rating должен быть в диапазоне 1..5'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            rating = None

        offer_data = offer_message.offer_data or {}
        if offer_data.get('status') != 'accepted' or offer_data.get('delivery_status') != 'delivered':
            return Response({'detail': 'Сейчас нельзя принять работу по этому предложению'}, status=status.HTTP_400_BAD_REQUEST)

        from django.utils import timezone
        offer_data['delivery_status'] = 'accepted'
        offer_data['delivery_accepted_at'] = timezone.now().isoformat()
        if rating is not None:
            offer_data['rating'] = rating
        offer_message.offer_data = offer_data
        offer_message.save(update_fields=['offer_data'])

        try:
            work_id = offer_data.get('work_id')
            if not work_id and chat.context_title:
                import re
                m = re.search(r'work:(\d+)', str(chat.context_title))
                if m:
                    work_id = int(m.group(1))

            if work_id:
                from apps.shop.models import Purchase, ReadyWork

                work = ReadyWork.objects.filter(id=work_id).first()
                if work:
                    purchase, _created = Purchase.objects.get_or_create(
                        work=work,
                        buyer=request.user,
                        defaults={'price_paid': work.price},
                    )

                    delivered_message_id = offer_data.get('delivered_message_id')
                    delivered_message = None
                    if delivered_message_id:
                        delivered_message = Message.objects.filter(id=delivered_message_id, chat=chat).first()
                    if delivered_message and delivered_message.file:
                        file_name = delivered_message.file_name or ''
                        if not file_name and getattr(delivered_message.file, 'name', None):
                            file_name = str(delivered_message.file.name).split('/')[-1]
                        ext = ''
                        if file_name and '.' in file_name:
                            ext = file_name.split('.')[-1].lower()

                        purchase.delivered_file = delivered_message.file
                        purchase.delivered_file_name = file_name or purchase.delivered_file_name
                        purchase.delivered_file_type = ext or purchase.delivered_file_type
                        try:
                            purchase.delivered_file_size = int(delivered_message.file.size or 0)
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
            delivered_message_id = offer_data.get('delivered_message_id')
            if chat.order_id and delivered_message_id:
                delivered_message = Message.objects.filter(id=delivered_message_id, chat=chat).first()
                if delivered_message and delivered_message.file:
                    marker = f'chat_delivery_message_id:{delivered_message.id}'
                    already_attached = OrderFile.objects.filter(
                        order_id=chat.order_id,
                        description=marker
                    ).exists()
                    if not already_attached:
                        OrderFile.objects.create(
                            order=chat.order,
                            file=delivered_message.file,
                            file_type='solution',
                            uploaded_by=delivered_message.sender,
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
        message_id = request.data.get('message_id')
        if not message_id:
            return Response({'detail': 'message_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)

        offer_message = get_object_or_404(Message, id=message_id, chat=chat)
        if offer_message.message_type != 'work_offer' or not offer_message.offer_data:
            return Response({'detail': 'Это сообщение не является предложением готовой работы'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user not in chat.participants.all():
            return Response({'detail': 'Вы не являетесь участником этого чата'}, status=status.HTTP_403_FORBIDDEN)

        if request.user == offer_message.sender:
            return Response({'detail': 'Нельзя отклонить свою собственную работу'}, status=status.HTTP_400_BAD_REQUEST)

        offer_data = offer_message.offer_data or {}
        if offer_data.get('status') != 'accepted' or offer_data.get('delivery_status') != 'delivered':
            return Response({'detail': 'Сейчас нельзя отклонить работу по этому предложению'}, status=status.HTTP_400_BAD_REQUEST)

        from django.utils import timezone
        offer_data['delivery_status'] = 'rejected'
        offer_data['delivery_rejected_at'] = timezone.now().isoformat()
        offer_message.offer_data = offer_data
        offer_message.save(update_fields=['offer_data'])
        return Response({'status': 'success'})

    @action(detail=True, methods=['post'])
    def accept_offer(self, request, pk=None):
        """Принять индивидуальное предложение"""
        chat = self.get_object()
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

            if not chat.client_id:
                chat.client = client_user
            if not chat.expert_id:
                chat.expert = expert_user
            if not chat.client_id or not chat.expert_id:
                chat.save(update_fields=['client', 'expert'])

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
            
            # Обновляем статус предложения
            offer_data['status'] = 'accepted'
            offer_data['order_id'] = order.id
            message.offer_data = offer_data
            message.save()
            
            if chat.order_id != order.id:
                chat.order = order
                chat.save(update_fields=['order'])

            try:
                NotificationService.create_notification(
                    recipient=expert_user,
                    type=NotificationType.ORDER_ASSIGNED,
                    title="Индивидуальное предложение принято",
                    message=f"Клиент принял ваше индивидуальное предложение. Можно начинать работу по заказу №{order.id}.",
                    related_object_id=order.id,
                    related_object_type='order',
                    data={
                        'order_id': order.id,
                        'chat_id': chat.id,
                        'offer_message_id': message.id
                    }
                )
            except Exception:
                pass
                
            return Response({'status': 'success', 'order_id': order.id})
            
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def reject_offer(self, request, pk=None):
        """Отклонить индивидуальное предложение"""
        chat = self.get_object()
        message_id = request.data.get('message_id')
        
        if not message_id:
            return Response({'detail': 'message_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)
            
        message = get_object_or_404(Message, id=message_id, chat=chat)
        
        if message.message_type != 'offer':
            return Response({'detail': 'Это сообщение не является предложением'}, status=status.HTTP_400_BAD_REQUEST)
            
        offer_data = message.offer_data or {}
        offer_data['status'] = 'rejected'
        message.offer_data = offer_data
        message.save()
        
        return Response({'status': 'success'})

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
        chat.messages.exclude(sender=request.user).update(is_read=True)
        
        return Response({'status': 'success'})

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
        chat.messages.exclude(sender=request.user).update(is_read=False)
        
        return Response({'status': 'success'})

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

        count = Message.objects.filter(
            chat__in=visible_chats
        ).exclude(
            sender=user
        ).filter(
            is_read=False
        ).count()
        
        return Response({'unread_count': count})

    @action(detail=False, methods=['post'])
    def get_or_create_by_order(self, request):
        """Получить или создать чат по ID заказа"""
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
        chat, created = Chat.objects.get_or_create(
            order=order,
            client=order.client,
            expert=order.expert
        )
        if created:
            chat.participants.add(order.client, order.expert)
        
        serializer = ChatDetailSerializer(chat, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def get_or_create_by_order_and_user(self, request):
        """Получить или создать чат по ID заказа и ID пользователя (контекст заказа из ленты)."""
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
        user_ids = sorted([request.user.id, other_user.id])
        resolved_client_id = user_ids[0]
        resolved_expert_id = user_ids[1]

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
            if duplicates.exists():
                duplicates.delete()

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
