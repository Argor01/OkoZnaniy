from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .models import PartnerChatRoom, PartnerChatMessage
from .serializers import PartnerChatRoomSerializer, PartnerChatMessageSerializer

User = get_user_model()


class PartnerChatRoomViewSet(viewsets.ModelViewSet):
    """ViewSet для чат-комнат партнеров"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PartnerChatRoomSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        # Только партнеры могут видеть чаты
        if user.role != 'partner':
            return PartnerChatRoom.objects.none()
        
        # Показываем чаты, где пользователь - участник
        return PartnerChatRoom.objects.filter(
            members=user,
            is_active=True
        ).prefetch_related('members', 'messages__sender').order_by('-updated_at')
    
    def perform_create(self, serializer):
        room = serializer.save(created_by=self.request.user)
        # Автоматически добавляем создателя в участники
        room.members.add(self.request.user)
        
        # Создаем системное сообщение о создании чата
        PartnerChatMessage.objects.create(
            room=room,
            sender=self.request.user,
            message=f'Чат "{room.name}" создан',
            is_system=True
        )
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Отправить сообщение в чат"""
        room = self.get_object()
        message_text = request.data.get('message')
        
        if not message_text:
            return Response(
                {'error': 'message обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        message = PartnerChatMessage.objects.create(
            room=room,
            sender=request.user,
            message=message_text
        )
        
        serializer = PartnerChatMessageSerializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def join_room(self, request, pk=None):
        """Присоединиться к чату"""
        room = self.get_object()
        room.members.add(request.user)
        
        # Системное сообщение
        PartnerChatMessage.objects.create(
            room=room,
            sender=request.user,
            message=f'{request.user.get_full_name() or request.user.username} присоединился к чату',
            is_system=True
        )
        
        return Response({'message': 'Вы присоединились к чату'})
    
    @action(detail=True, methods=['post'])
    def leave_room(self, request, pk=None):
        """Покинуть чат"""
        room = self.get_object()
        room.members.remove(request.user)
        
        # Системное сообщение
        PartnerChatMessage.objects.create(
            room=room,
            sender=request.user,
            message=f'{request.user.get_full_name() or request.user.username} покинул чат',
            is_system=True
        )
        
        return Response({'message': 'Вы покинули чат'})
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Получить сообщения чата"""
        room = self.get_object()
        messages = room.messages.all().select_related('sender')
        serializer = PartnerChatMessageSerializer(messages, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def invite_user(self, request, pk=None):
        """Пригласить пользователя в чат"""
        room = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'Пользователь не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        room.members.add(user)
        
        # Системное сообщение
        PartnerChatMessage.objects.create(
            room=room,
            sender=request.user,
            message=f'{user.get_full_name() or user.username} был приглашен в чат',
            is_system=True
        )
        
        # Уведомляем пользователя
        try:
            from apps.notifications.services import NotificationService
            NotificationService.create_notification(
                recipient=user,
                type='new_contact',
                title='Приглашение в чат',
                message=f'{request.user.get_full_name() or request.user.username} пригласил вас в чат "{room.name}"',
                related_object_id=room.id,
                related_object_type='partner_chat_room'
            )
        except ImportError:
            pass  # Если сервис уведомлений недоступен
        
        return Response({'message': 'Пользователь приглашен'})
    
    @action(detail=True, methods=['post'])
    def upload_file(self, request, pk=None):
        """Загрузить файл в чат"""
        room = self.get_object()
        file = request.FILES.get('file')
        
        if not file:
            return Response(
                {'error': 'file обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # TODO: Реализовать загрузку файлов
        # Пока просто создаем сообщение о загрузке файла
        PartnerChatMessage.objects.create(
            room=room,
            sender=request.user,
            message=f'Загружен файл: {file.name}',
            is_system=False
        )
        
        return Response({'message': 'Файл загружен', 'filename': file.name})