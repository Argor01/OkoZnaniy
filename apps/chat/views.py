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
            Prefetch('messages', queryset=Message.objects.select_related('sender').order_by('-created_at')[:1])
        ).annotate(
            last_message_time=Max('messages__created_at')
        ).order_by('-last_message_time')

    def perform_create(self, serializer):
        chat = serializer.save()
        order = chat.order
        chat.participants.add(order.client, order.expert)

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Отправка сообщения в чат"""
        chat = self.get_object()
        if request.user not in chat.participants.all():
            return Response(
                {'detail': 'Вы не являетесь участником этого чата'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = MessageSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            message = serializer.save(
                chat=chat,
                sender=request.user
            )
            
            # Создаем уведомление для другого участника
            from apps.notifications.services import NotificationService
            other_user = chat.participants.exclude(id=request.user.id).first()
            if other_user:
                NotificationService.create_notification(
                    recipient=other_user,
                    notification_type='new_comment',
                    title=f'Новое сообщение от {request.user.get_full_name() or request.user.username}',
                    message=message.text[:100],
                    related_object_id=chat.id,
                    related_object_type='chat'
                )
            
            return Response(MessageSerializer(message, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
        
        # Проверяем, что пользователь является участником заказа
        if request.user not in [order.client, order.expert]:
            return Response(
                {'detail': 'Вы не являетесь участником этого заказа'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Получаем или создаем чат
        chat, created = Chat.objects.get_or_create(order=order)
        if created:
            chat.participants.add(order.client, order.expert)
        
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
