from django.conf import settings
from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q, Max, Count, Prefetch
from .models import Chat, Message
from .serializers import ChatListSerializer, ChatDetailSerializer, MessageSerializer
from apps.orders.models import Order

class ChatViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return ChatListSerializer
        return ChatDetailSerializer

    def get_queryset(self):
        user = self.request.user
        return Chat.objects.filter(
            participants=user
        ).prefetch_related(
            'participants',
            'messages__sender'
        ).annotate(
            last_message_time=Max('messages__created_at')
        ).order_by('-last_message_time')

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
        if request.user not in chat.participants.all():
            return Response(
                {'detail': 'Вы не являетесь участником этого чата'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Поддержка JSON (только текст) и multipart (текст + файл)
        if request.content_type and 'multipart/form-data' in request.content_type:
            text = (request.POST.get('text') or '').strip()
            uploaded_file = request.FILES.get('file')
        else:
            text = (request.data.get('text') or '').strip()
            uploaded_file = None

        if not text and not uploaded_file:
            return Response(
                {'detail': 'Укажите текст сообщения или прикрепите файл.'},
                status=status.HTTP_400_BAD_REQUEST
            )

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
            )
            message.full_clean()
            message.save()
        except Exception as e:
            return Response(
                {'detail': getattr(e, 'message', None) or str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.notifications.services import NotificationService
        other_user = chat.participants.exclude(id=request.user.id).first()
        if other_user:
            notification_text = (message.text or f'Файл: {message.file_name}')[:100]
            NotificationService.create_notification(
                recipient=other_user,
                type='new_comment',
                title=f'Новое сообщение от {request.user.get_full_name() or request.user.username}',
                message=notification_text,
                related_object_id=chat.id,
                related_object_type='chat'
            )

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
        chat.messages.exclude(sender=request.user).update(is_read=True)
        
        return Response({'status': 'success'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Получить общее количество непрочитанных сообщений"""
        user = request.user
        count = Message.objects.filter(
            chat__participants=user
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
        """Получить или создать чат по ID заказа и ID пользователя (для переписки по отклику)."""
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

        # Чат по заказу всегда между клиентом заказа и конкретным экспертом
        client = order.client
        expert = other_user

        chat, created = Chat.objects.get_or_create(
            order=order,
            client=client,
            expert=expert
        )
        if created:
            chat.participants.add(client, expert)

        serializer = ChatDetailSerializer(chat, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def get_or_create_by_user(self, request):
        """Получить или создать чат с конкретным пользователем"""
        from apps.users.models import User
        
        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'detail': 'user_id обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            other_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Пользователь не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Нельзя создать чат с самим собой
        if other_user.id == request.user.id:
            return Response(
                {'detail': 'Нельзя создать чат с самим собой'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Ищем существующий чат между этими двумя пользователями (без привязки к заказу)
        chat = Chat.objects.filter(
            participants=request.user,
            order__isnull=True
        ).filter(
            participants=other_user
        ).first()
        
        # Если чат не найден, создаем новый
        if not chat:
            chat = Chat.objects.create(order=None)
            chat.participants.add(request.user, other_user)
        
        serializer = ChatDetailSerializer(chat, context={'request': request})
        return Response(serializer.data)
