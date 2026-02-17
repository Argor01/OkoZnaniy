from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db.models import Q, Count
from django.utils import timezone

from .models import SupportRequest, SupportMessage, Claim, AdminChatRoom, AdminChatMessage
from .serializers import (
    SupportRequestSerializer, SupportMessageSerializer,
    ClaimSerializer, AdminChatRoomSerializer, AdminChatMessageSerializer
)
from apps.users.serializers import UserSerializer
from apps.orders.models import Order
from apps.orders.serializers import OrderSerializer

User = get_user_model()


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
    permission_classes = [IsAdminUser]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset
    
    @action(detail=True, methods=['post'])
    def take_request(self, request, pk=None):
        """Взять запрос в работу"""
        support_request = self.get_object()
        support_request.admin = request.user
        support_request.status = 'in_progress'
        support_request.save()
        return Response({'message': 'Запрос взят в работу'})
    
    @action(detail=True, methods=['post'])
    def complete_request(self, request, pk=None):
        """Завершить запрос"""
        support_request = self.get_object()
        support_request.status = 'completed'
        support_request.completed_at = timezone.now()
        support_request.save()
        return Response({'message': 'Запрос завершен'})
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Отправить сообщение в запрос"""
        support_request = self.get_object()
        message = SupportMessage.objects.create(
            request=support_request,
            sender=request.user,
            message=request.data.get('message'),
            is_admin=True
        )
        serializer = SupportMessageSerializer(message)
        return Response(serializer.data)


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
        if self.action == 'create':
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
        return Response({'message': 'Обращение взято в работу'})
    
    @action(detail=True, methods=['post'])
    def complete_claim(self, request, pk=None):
        """Завершить обращение"""
        claim = self.get_object()
        claim.status = 'completed'
        claim.resolution = request.data.get('resolution', '')
        claim.completed_at = timezone.now()
        claim.save()
        return Response({'message': 'Обращение завершено'})
    
    @action(detail=True, methods=['post'])
    def reject_claim(self, request, pk=None):
        """Отклонить обращение"""
        claim = self.get_object()
        claim.status = 'completed'
        claim.resolution = f"Отклонено: {request.data.get('reason', '')}"
        claim.completed_at = timezone.now()
        claim.save()
        return Response({'message': 'Обращение отклонено'})


# ============= ЧАТЫ АДМИНИСТРАТОРОВ =============

class AdminChatRoomViewSet(viewsets.ModelViewSet):
    """ViewSet для чатов администраторов"""
    queryset = AdminChatRoom.objects.all()
    serializer_class = AdminChatRoomSerializer
    permission_classes = [IsAdminUser]
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Отправить сообщение в чат"""
        room = self.get_object()
        message = AdminChatMessage.objects.create(
            room=room,
            sender=request.user,
            message=request.data.get('message')
        )
        serializer = AdminChatMessageSerializer(message)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def join_room(self, request, pk=None):
        """Присоединиться к чату"""
        room = self.get_object()
        room.members.add(request.user)
        return Response({'message': 'Вы присоединились к чату'})
    
    @action(detail=True, methods=['post'])
    def leave_room(self, request, pk=None):
        """Покинуть чат"""
        room = self.get_object()
        room.members.remove(request.user)
        return Response({'message': 'Вы покинули чат'})


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
    from apps.chat.serializers import ChatSerializer
    
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
