# Backend API спецификация для обработки запросов

## 🎯 Обзор API

Данная спецификация описывает необходимые backend эндпоинты для реализации функционала обработки запросов в админ-панели.

## 📊 Модели данных

### Django Models

```python
# apps/support/models.py

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class CustomerRequest(models.Model):
    STATUS_CHOICES = [
        ('open', 'Открыт'),
        ('in_progress', 'В работе'),
        ('completed', 'Выполнен'),
        ('closed', 'Закрыт'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Низкий'),
        ('medium', 'Средний'),
        ('high', 'Высокий'),
        ('urgent', 'Срочный'),
    ]
    
    CATEGORY_CHOICES = [
        ('technical', 'Техническая'),
        ('billing', 'Биллинг'),
        ('account', 'Аккаунт'),
        ('order', 'Заказ'),
        ('general', 'Общая'),
    ]
    
    title = models.CharField(max_length=200, verbose_name='Заголовок')
    description = models.TextField(verbose_name='Описание')
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='open',
        verbose_name='Статус'
    )
    priority = models.CharField(
        max_length=20, 
        choices=PRIORITY_CHOICES, 
        default='medium',
        verbose_name='Приоритет'
    )
    category = models.CharField(
        max_length=20, 
        choices=CATEGORY_CHOICES, 
        default='general',
        verbose_name='Категория'
    )
    
    # Связи
    customer = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='customer_requests',
        verbose_name='Клиент'
    )
    assigned_admin = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='assigned_requests',
        verbose_name='Назначенный администратор'
    )
    
    # Временные метки
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлен')
    last_message_at = models.DateTimeField(null=True, blank=True, verbose_name='Последнее сообщение')
    
    # Дополнительные поля
    estimated_resolution_time = models.DateTimeField(
        null=True, 
        blank=True,
        verbose_name='Ожидаемое время решения'
    )
    tags = models.JSONField(default=list, blank=True, verbose_name='Теги')
    
    class Meta:
        verbose_name = 'Запрос клиента'
        verbose_name_plural = 'Запросы клиентов'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"#{self.id}: {self.title}"
    
    @property
    def messages_count(self):
        return self.messages.count()
    
    def take_by_admin(self, admin_user):
        """Взятие запроса в работу администратором"""
        self.assigned_admin = admin_user
        self.status = 'in_progress'
        self.save()
        
        # Создаем системное сообщение
        RequestMessage.objects.create(
            request=self,
            sender=admin_user,
            sender_type='admin',
            content=f'Запрос взят в работу администратором {admin_user.get_full_name()}',
            message_type='system'
        )
    
    def complete(self):
        """Завершение запроса"""
        self.status = 'completed'
        self.save()


class RequestMessage(models.Model):
    MESSAGE_TYPES = [
        ('text', 'Текст'),
        ('image', 'Изображение'),
        ('file', 'Файл'),
        ('system', 'Системное'),
    ]
    
    SENDER_TYPES = [
        ('customer', 'Клиент'),
        ('admin', 'Администратор'),
    ]
    
    request = models.ForeignKey(
        CustomerRequest, 
        on_delete=models.CASCADE, 
        related_name='messages',
        verbose_name='Запрос'
    )
    sender = models.ForeignKey(
        User, 
        on_delete=models.CASCADE,
        verbose_name='Отправитель'
    )
    sender_type = models.CharField(
        max_length=20, 
        choices=SENDER_TYPES,
        verbose_name='Тип отправителя'
    )
    
    content = models.TextField(verbose_name='Содержимое')
    message_type = models.CharField(
        max_length=20, 
        choices=MESSAGE_TYPES, 
        default='text',
        verbose_name='Тип сообщения'
    )
    
    is_read = models.BooleanField(default=False, verbose_name='Прочитано')
    is_internal = models.BooleanField(default=False, verbose_name='Внутреннее сообщение')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создано')
    
    class Meta:
        verbose_name = 'Сообщение запроса'
        verbose_name_plural = 'Сообщения запросов'
        ordering = ['created_at']
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Обновляем время последнего сообщения в запросе
        self.request.last_message_at = self.created_at
        self.request.save(update_fields=['last_message_at'])


class RequestAttachment(models.Model):
    request = models.ForeignKey(
        CustomerRequest, 
        on_delete=models.CASCADE, 
        related_name='attachments'
    )
    message = models.ForeignKey(
        RequestMessage, 
        on_delete=models.CASCADE, 
        related_name='attachments',
        null=True, 
        blank=True
    )
    
    name = models.CharField(max_length=255, verbose_name='Имя файла')
    file = models.FileField(upload_to='request_attachments/', verbose_name='Файл')
    size = models.PositiveIntegerField(verbose_name='Размер файла')
    content_type = models.CharField(max_length=100, verbose_name='Тип содержимого')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')
    
    class Meta:
        verbose_name = 'Вложение запроса'
        verbose_name_plural = 'Вложения запросов'


class AdminChat(models.Model):
    CHAT_TYPES = [
        ('general', 'Общий'),
        ('department', 'Отдел'),
        ('private', 'Приватный'),
    ]
    
    name = models.CharField(max_length=100, verbose_name='Название чата')
    chat_type = models.CharField(
        max_length=20, 
        choices=CHAT_TYPES, 
        default='general',
        verbose_name='Тип чата'
    )
    
    participants = models.ManyToManyField(
        User, 
        related_name='admin_chats',
        verbose_name='Участники'
    )
    
    created_by = models.ForeignKey(
        User, 
        on_delete=models.CASCADE,
        related_name='created_chats',
        verbose_name='Создатель'
    )
    
    is_active = models.BooleanField(default=True, verbose_name='Активен')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')
    
    class Meta:
        verbose_name = 'Чат администраторов'
        verbose_name_plural = 'Чаты администраторов'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name
    
    @property
    def last_message(self):
        return self.chat_messages.last()
    
    def get_unread_count_for_user(self, user):
        return self.chat_messages.filter(
            is_read=False
        ).exclude(sender=user).count()


class ChatMessage(models.Model):
    MESSAGE_TYPES = [
        ('text', 'Текст'),
        ('image', 'Изображение'),
        ('file', 'Файл'),
        ('system', 'Системное'),
    ]
    
    chat = models.ForeignKey(
        AdminChat, 
        on_delete=models.CASCADE, 
        related_name='chat_messages'
    )
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    
    content = models.TextField(verbose_name='Содержимое')
    message_type = models.CharField(
        max_length=20, 
        choices=MESSAGE_TYPES, 
        default='text'
    )
    
    reply_to = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        verbose_name='Ответ на сообщение'
    )
    
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Сообщение чата'
        verbose_name_plural = 'Сообщения чата'
        ordering = ['created_at']


class InternalCommunication(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Низкий'),
        ('medium', 'Средний'),
        ('high', 'Высокий'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Ожидает'),
        ('read', 'Прочитано'),
        ('replied', 'Отвечено'),
    ]
    
    request = models.ForeignKey(
        CustomerRequest, 
        on_delete=models.CASCADE, 
        related_name='internal_communications',
        null=True, 
        blank=True
    )
    
    from_department = models.CharField(max_length=50, verbose_name='От отдела')
    to_department = models.CharField(max_length=50, verbose_name='К отделу')
    
    subject = models.CharField(max_length=200, verbose_name='Тема')
    content = models.TextField(verbose_name='Содержимое')
    
    priority = models.CharField(
        max_length=20, 
        choices=PRIORITY_CHOICES, 
        default='medium'
    )
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='pending'
    )
    
    sender = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='sent_communications'
    )
    participants = models.ManyToManyField(
        User, 
        related_name='internal_communications'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Внутренняя коммуникация'
        verbose_name_plural = 'Внутренние коммуникации'
        ordering = ['-created_at']
```

## 🔗 API Endpoints

### Serializers

```python
# apps/support/serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import CustomerRequest, RequestMessage, AdminChat, ChatMessage

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'avatar']
    
    def get_avatar(self, obj):
        # Логика получения аватара пользователя
        return None


class CustomerRequestSerializer(serializers.ModelSerializer):
    customer = UserSerializer(read_only=True)
    assigned_admin = UserSerializer(read_only=True)
    messages_count = serializers.ReadOnlyField()
    
    class Meta:
        model = CustomerRequest
        fields = [
            'id', 'title', 'description', 'status', 'priority', 'category',
            'customer', 'assigned_admin', 'created_at', 'updated_at',
            'last_message_at', 'messages_count', 'estimated_resolution_time',
            'tags'
        ]


class RequestMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    sender_avatar = serializers.SerializerMethodField()
    
    class Meta:
        model = RequestMessage
        fields = [
            'id', 'request', 'sender', 'sender_type', 'sender_name', 
            'sender_avatar', 'content', 'message_type', 'is_read', 
            'is_internal', 'created_at'
        ]
    
    def get_sender_avatar(self, obj):
        # Логика получения аватара отправителя
        return None


class AdminChatSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = AdminChat
        fields = [
            'id', 'name', 'chat_type', 'participants', 'last_message',
            'unread_count', 'is_active', 'created_at'
        ]
    
    def get_last_message(self, obj):
        last_msg = obj.last_message
        if last_msg:
            return {
                'content': last_msg.content,
                'sender_name': last_msg.sender.get_full_name(),
                'created_at': last_msg.created_at
            }
        return None
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.get_unread_count_for_user(request.user)
        return 0


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    sender_avatar = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatMessage
        fields = [
            'id', 'chat', 'sender', 'sender_name', 'sender_avatar',
            'content', 'message_type', 'reply_to', 'is_read', 'created_at'
        ]
    
    def get_sender_avatar(self, obj):
        return None
```

### Views

```python
# apps/support/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count
from django.utils import timezone
from .models import CustomerRequest, RequestMessage, AdminChat, ChatMessage
from .serializers import (
    CustomerRequestSerializer, 
    RequestMessageSerializer,
    AdminChatSerializer,
    ChatMessageSerializer
)

class CustomerRequestViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = CustomerRequest.objects.select_related(
            'customer', 'assigned_admin'
        ).prefetch_related('messages')
        
        # Фильтрация по статусу
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Фильтрация по приоритету
        priority_filter = self.request.query_params.get('priority')
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)
        
        # Фильтрация по категории
        category_filter = self.request.query_params.get('category')
        if category_filter:
            queryset = queryset.filter(category=category_filter)
        
        # Поиск
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | 
                Q(description__icontains=search) |
                Q(customer__first_name__icontains=search) |
                Q(customer__last_name__icontains=search) |
                Q(customer__email__icontains=search)
            )
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def take(self, request, pk=None):
        """Взятие запроса в работу"""
        customer_request = self.get_object()
        
        if customer_request.assigned_admin:
            return Response(
                {'error': 'Запрос уже назначен другому администратору'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        customer_request.take_by_admin(request.user)
        
        serializer = self.get_serializer(customer_request)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Завершение запроса"""
        customer_request = self.get_object()
        
        if customer_request.assigned_admin != request.user:
            return Response(
                {'error': 'Вы не можете завершить чужой запрос'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        customer_request.complete()
        
        # Создаем системное сообщение
        RequestMessage.objects.create(
            request=customer_request,
            sender=request.user,
            sender_type='admin',
            content=f'Запрос завершен администратором {request.user.get_full_name()}',
            message_type='system'
        )
        
        serializer = self.get_serializer(customer_request)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get', 'post'])
    def messages(self, request, pk=None):
        """Получение и отправка сообщений запроса"""
        customer_request = self.get_object()
        
        if request.method == 'GET':
            messages = customer_request.messages.select_related('sender')
            serializer = RequestMessageSerializer(messages, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            data = request.data.copy()
            data['request'] = customer_request.id
            data['sender'] = request.user.id
            data['sender_type'] = 'admin'
            
            serializer = RequestMessageSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Статистика запросов"""
        total_requests = CustomerRequest.objects.count()
        open_requests = CustomerRequest.objects.filter(status='open').count()
        in_progress_requests = CustomerRequest.objects.filter(status='in_progress').count()
        completed_today = CustomerRequest.objects.filter(
            status='completed',
            updated_at__date=timezone.now().date()
        ).count()
        
        # Средний процент выполнения
        completion_rate = 0
        if total_requests > 0:
            completed_total = CustomerRequest.objects.filter(status='completed').count()
            completion_rate = round((completed_total / total_requests) * 100, 2)
        
        return Response({
            'total_requests': total_requests,
            'open_requests': open_requests,
            'in_progress_requests': in_progress_requests,
            'completed_today': completed_today,
            'completion_rate': completion_rate,
        })


class AdminChatViewSet(viewsets.ModelViewSet):
    serializer_class = AdminChatSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return AdminChat.objects.filter(
            participants=self.request.user,
            is_active=True
        ).prefetch_related('participants').order_by('-created_at')
    
    def perform_create(self, serializer):
        chat = serializer.save(created_by=self.request.user)
        # Добавляем создателя в участники
        chat.participants.add(self.request.user)
    
    @action(detail=True, methods=['get', 'post'])
    def messages(self, request, pk=None):
        """Получение и отправка сообщений чата"""
        chat = self.get_object()
        
        if request.method == 'GET':
            messages = chat.chat_messages.select_related('sender')
            serializer = ChatMessageSerializer(messages, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            data = request.data.copy()
            data['chat'] = chat.id
            data['sender'] = request.user.id
            
            serializer = ChatMessageSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        """Присоединение к чату"""
        chat = self.get_object()
        chat.participants.add(request.user)
        
        # Создаем системное сообщение
        ChatMessage.objects.create(
            chat=chat,
            sender=request.user,
            content=f'{request.user.get_full_name()} присоединился к чату',
            message_type='system'
        )
        
        return Response({'status': 'joined'})
    
    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        """Покидание чата"""
        chat = self.get_object()
        chat.participants.remove(request.user)
        
        # Создаем системное сообщение
        ChatMessage.objects.create(
            chat=chat,
            sender=request.user,
            content=f'{request.user.get_full_name()} покинул чат',
            message_type='system'
        )
        
        return Response({'status': 'left'})
```

### URLs

```python
# apps/support/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomerRequestViewSet, AdminChatViewSet

router = DefaultRouter()
router.register(r'customer-requests', CustomerRequestViewSet, basename='customer-requests')
router.register(r'chats', AdminChatViewSet, basename='admin-chats')

urlpatterns = [
    path('api/admin/', include(router.urls)),
]
```

## 🔐 Permissions

```python
# apps/support/permissions.py

from rest_framework import permissions

class IsAdminUser(permissions.BasePermission):
    """
    Разрешение только для администраторов
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['admin', 'director']
        )

class CanManageRequest(permissions.BasePermission):
    """
    Разрешение на управление запросом
    """
    def has_object_permission(self, request, view, obj):
        # Администратор может управлять только своими назначенными запросами
        # или открытыми запросами
        if request.user.role == 'admin':
            return obj.assigned_admin == request.user or obj.status == 'open'
        
        # Директор может управлять всеми запросами
        if request.user.role == 'director':
            return True
        
        return False
```

## 📱 WebSocket для реального времени

```python
# apps/support/consumers.py

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()

class AdminNotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        
        if not self.user.is_authenticated or self.user.role not in ['admin', 'director']:
            await self.close()
            return
        
        # Присоединяемся к группе администраторов
        self.group_name = 'admin_notifications'
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        # Покидаем группу
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')
        
        if message_type == 'ping':
            await self.send(text_data=json.dumps({
                'type': 'pong'
            }))
    
    # Обработчики уведомлений
    async def new_request_notification(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_request',
            'data': event['data']
        }))
    
    async def request_updated_notification(self, event):
        await self.send(text_data=json.dumps({
            'type': 'request_updated',
            'data': event['data']
        }))
    
    async def new_message_notification(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_message',
            'data': event['data']
        }))


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.chat_id = self.scope['url_route']['kwargs']['chat_id']
        self.chat_group_name = f'chat_{self.chat_id}'
        self.user = self.scope["user"]
        
        if not self.user.is_authenticated:
            await self.close()
            return
        
        # Проверяем, что пользователь участник чата
        is_participant = await self.check_chat_participant()
        if not is_participant:
            await self.close()
            return
        
        # Присоединяемся к группе чата
        await self.channel_layer.group_add(
            self.chat_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.chat_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data['message']
        
        # Сохраняем сообщение в базу данных
        await self.save_message(message)
        
        # Отправляем сообщение в группу
        await self.channel_layer.group_send(
            self.chat_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'sender': self.user.get_full_name(),
                'sender_id': self.user.id,
                'timestamp': timezone.now().isoformat()
            }
        )
    
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': event['message'],
            'sender': event['sender'],
            'sender_id': event['sender_id'],
            'timestamp': event['timestamp']
        }))
    
    @database_sync_to_async
    def check_chat_participant(self):
        from .models import AdminChat
        try:
            chat = AdminChat.objects.get(id=self.chat_id)
            return chat.participants.filter(id=self.user.id).exists()
        except AdminChat.DoesNotExist:
            return False
    
    @database_sync_to_async
    def save_message(self, message_content):
        from .models import AdminChat, ChatMessage
        try:
            chat = AdminChat.objects.get(id=self.chat_id)
            ChatMessage.objects.create(
                chat=chat,
                sender=self.user,
                content=message_content
            )
        except AdminChat.DoesNotExist:
            pass
```

## 🚀 Настройка Django

```python
# settings.py

INSTALLED_APPS = [
    # ... другие приложения
    'apps.support',
    'channels',
    'rest_framework',
]

# Настройки REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# Настройки Channels для WebSocket
ASGI_APPLICATION = 'config.asgi.application'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [('127.0.0.1', 6379)],
        },
    },
}

# Настройки загрузки файлов
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Максимальный размер загружаемого файла (10MB)
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
```

## 📋 Миграции

```python
# Создание миграций
python manage.py makemigrations support
python manage.py migrate

# Создание суперпользователя для тестирования
python manage.py createsuperuser
```

## 🧪 Тестовые данные

```python
# apps/support/management/commands/create_test_requests.py

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.support.models import CustomerRequest, RequestMessage
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'Создает тестовые запросы для разработки'
    
    def handle(self, *args, **options):
        # Создаем тестовых пользователей
        customers = []
        for i in range(5):
            user, created = User.objects.get_or_create(
                username=f'customer{i}',
                defaults={
                    'email': f'customer{i}@example.com',
                    'first_name': f'Клиент{i}',
                    'last_name': f'Тестовый{i}',
                    'role': 'customer'
                }
            )
            customers.append(user)
        
        # Создаем тестовые запросы
        categories = ['technical', 'billing', 'account', 'order', 'general']
        priorities = ['low', 'medium', 'high', 'urgent']
        statuses = ['open', 'in_progress', 'completed']
        
        for i in range(20):
            request = CustomerRequest.objects.create(
                title=f'Тестовый запрос #{i+1}',
                description=f'Описание тестового запроса номер {i+1}. Это подробное описание проблемы клиента.',
                customer=random.choice(customers),
                category=random.choice(categories),
                priority=random.choice(priorities),
                status=random.choice(statuses),
                tags=[f'тег{i}', 'тест']
            )
            
            # Добавляем несколько сообщений к каждому запросу
            for j in range(random.randint(1, 5)):
                RequestMessage.objects.create(
                    request=request,
                    sender=request.customer,
                    sender_type='customer',
                    content=f'Сообщение #{j+1} от клиента в запросе #{i+1}'
                )
        
        self.stdout.write(
            self.style.SUCCESS('Успешно создано 20 тестовых запросов')
        )
```

## 📊 Заключение

Данная спецификация предоставляет полную backend реализацию для системы обработки запросов в админ-панели, включая:

✅ **Модели данных** - полная структура БД
✅ **API эндпоинты** - REST API для всех операций  
✅ **Serializers** - сериализация данных
✅ **Permissions** - система разрешений
✅ **WebSocket** - уведомления в реальном времени
✅ **Тестовые данные** - для разработки и тестирования

**Следующие шаги:**
1. Создать миграции и применить их
2. Настроить права доступа
3. Протестировать API эндпоинты
4. Интегрировать с frontend
5. Настроить WebSocket для уведомлений