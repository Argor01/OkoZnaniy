# Подробная инструкция по реализации чата

## Оглавление
1. [Подготовка](#подготовка)
2. [Backend: Django + Channels](#backend-django--channels)
3. [Frontend: React + WebSocket](#frontend-react--websocket)
4. [Интеграция с заказами](#интеграция-с-заказами)
5. [Тестирование](#тестирование)
6. [Деплой](#деплой)

---

## Подготовка

### Что уже есть:
✅ Django Channels 4.2.2
✅ channels-redis 4.2.0
✅ Redis
✅ React + TypeScript
✅ Ant Design (для UI компонентов)

### Что нужно добавить:
- WebSocket роутинг в Django
- Новое приложение `chat`
- React компоненты для чата

---

## Backend: Django + Channels

### Шаг 1: Создание приложения chat

```bash
# В корне проекта
python manage.py startapp chat
mv chat apps/chat
```

### Шаг 2: Регистрация приложения

Добавить в `config/settings.py`:
```python
INSTALLED_APPS = [
    # ...
    'channels',
    'apps.chat',
]
```

### Шаг 3: Создание моделей

Создать файл `apps/chat/models.py`:

```python
from django.db import models
from django.conf import settings
from apps.orders.models import Order

class ChatRoom(models.Model):
    """Комната чата для заказа"""
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='chat_room')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'chat_rooms'
        verbose_name = 'Комната чата'
        verbose_name_plural = 'Комнаты чата'
    
    def __str__(self):
        return f"Chat for Order #{self.order.id}"


class ChatMessage(models.Model):
    """Сообщение в чате"""
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    message = models.TextField()
    file = models.FileField(upload_to='chat_files/', null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'chat_messages'
        ordering = ['created_at']
        verbose_name = 'Сообщение'
        verbose_name_plural = 'Сообщения'
    
    def __str__(self):
        return f"{self.sender.email}: {self.message[:50]}"


class ChatParticipant(models.Model):
    """Участник чата"""
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    last_read_at = models.DateTimeField(null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'chat_participants'
        unique_together = ['room', 'user']
        verbose_name = 'Участник чата'
        verbose_name_plural = 'Участники чата'
    
    def __str__(self):
        return f"{self.user.email} in {self.room}"
```

### Шаг 4: Создание сериализаторов

Создать файл `apps/chat/serializers.py`:

```python
from rest_framework import serializers
from .models import ChatRoom, ChatMessage, ChatParticipant
from apps.users.serializers import UserSerializer

class ChatMessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    sender_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatMessage
        fields = ['id', 'room', 'sender', 'sender_name', 'message', 'file', 'is_read', 'created_at']
        read_only_fields = ['id', 'sender', 'created_at']
    
    def get_sender_name(self, obj):
        return obj.sender.get_full_name() or obj.sender.email


class ChatParticipantSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = ChatParticipant
        fields = ['id', 'user', 'last_read_at', 'joined_at']


class ChatRoomSerializer(serializers.ModelSerializer):
    participants = ChatParticipantSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatRoom
        fields = ['id', 'order', 'participants', 'last_message', 'unread_count', 'created_at', 'updated_at']
    
    def get_last_message(self, obj):
        last_msg = obj.messages.last()
        if last_msg:
            return ChatMessageSerializer(last_msg).data
        return None
    
    def get_unread_count(self, obj):
        user = self.context.get('request').user
        participant = obj.participants.filter(user=user).first()
        if participant and participant.last_read_at:
            return obj.messages.filter(created_at__gt=participant.last_read_at).exclude(sender=user).count()
        return obj.messages.exclude(sender=user).count()
```

### Шаг 5: Создание WebSocket Consumer

Создать файл `apps/chat/consumers.py`:

```python
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import ChatRoom, ChatMessage, ChatParticipant
from .serializers import ChatMessageSerializer

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'
        self.user = self.scope['user']
        
        # Проверка доступа к комнате
        has_access = await self.check_room_access()
        if not has_access:
            await self.close()
            return
        
        # Присоединение к группе
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Отправка истории сообщений
        messages = await self.get_room_messages()
        await self.send(text_data=json.dumps({
            'type': 'message_history',
            'messages': messages
        }))
    
    async def disconnect(self, close_code):
        # Выход из группы
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')
        
        if message_type == 'chat_message':
            message_text = data.get('message')
            
            # Сохранение сообщения в БД
            message = await self.save_message(message_text)
            
            # Отправка сообщения в группу
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message
                }
            )
        
        elif message_type == 'typing':
            # Уведомление о печати
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_typing',
                    'user_id': self.user.id,
                    'is_typing': data.get('is_typing', False)
                }
            )
        
        elif message_type == 'mark_read':
            # Отметка сообщений как прочитанных
            await self.mark_messages_read()
    
    async def chat_message(self, event):
        # Отправка сообщения клиенту
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message']
        }))
    
    async def user_typing(self, event):
        # Отправка уведомления о печати
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'user_typing',
                'user_id': event['user_id'],
                'is_typing': event['is_typing']
            }))
    
    @database_sync_to_async
    def check_room_access(self):
        try:
            room = ChatRoom.objects.get(id=self.room_id)
            return ChatParticipant.objects.filter(room=room, user=self.user).exists()
        except ChatRoom.DoesNotExist:
            return False
    
    @database_sync_to_async
    def get_room_messages(self):
        room = ChatRoom.objects.get(id=self.room_id)
        messages = room.messages.select_related('sender').all()[:50]
        return ChatMessageSerializer(messages, many=True).data
    
    @database_sync_to_async
    def save_message(self, message_text):
        room = ChatRoom.objects.get(id=self.room_id)
        message = ChatMessage.objects.create(
            room=room,
            sender=self.user,
            message=message_text
        )
        return ChatMessageSerializer(message).data
    
    @database_sync_to_async
    def mark_messages_read(self):
        from django.utils import timezone
        room = ChatRoom.objects.get(id=self.room_id)
        participant = ChatParticipant.objects.get(room=room, user=self.user)
        participant.last_read_at = timezone.now()
        participant.save()
```

### Шаг 6: Настройка WebSocket роутинга

Создать файл `apps/chat/routing.py`:

```python
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/chat/(?P<room_id>\d+)/$', consumers.ChatConsumer.as_asgi()),
]
```

Создать файл `config/routing.py`:

```python
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from apps.chat.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    'websocket': AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
```

Обновить `config/settings.py`:

```python
# ASGI приложение для Channels
ASGI_APPLICATION = 'config.routing.application'

# Настройка Channel Layers (Redis)
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [('127.0.0.1', 6379)],  # или из переменных окружения
        },
    },
}
```

### Шаг 7: Создание REST API views

Создать файл `apps/chat/views.py`:

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import ChatRoom, ChatMessage, ChatParticipant
from .serializers import ChatRoomSerializer, ChatMessageSerializer
from apps.orders.models import Order

class ChatRoomViewSet(viewsets.ModelViewSet):
    serializer_class = ChatRoomSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Показываем только комнаты, где пользователь является участником
        return ChatRoom.objects.filter(
            participants__user=self.request.user
        ).distinct()
    
    @action(detail=False, methods=['post'])
    def create_for_order(self, request):
        """Создание комнаты чата для заказа"""
        order_id = request.data.get('order_id')
        order = get_object_or_404(Order, id=order_id)
        
        # Проверка прав доступа
        if order.client != request.user and order.expert != request.user:
            return Response(
                {'error': 'У вас нет доступа к этому заказу'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Создание или получение существующей комнаты
        room, created = ChatRoom.objects.get_or_create(order=order)
        
        # Добавление участников
        if created:
            ChatParticipant.objects.get_or_create(room=room, user=order.client)
            if order.expert:
                ChatParticipant.objects.get_or_create(room=room, user=order.expert)
        
        serializer = self.get_serializer(room)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Получение истории сообщений"""
        room = self.get_object()
        messages = room.messages.select_related('sender').all()
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Отметить все сообщения как прочитанные"""
        from django.utils import timezone
        room = self.get_object()
        participant = get_object_or_404(ChatParticipant, room=room, user=request.user)
        participant.last_read_at = timezone.now()
        participant.save()
        return Response({'status': 'messages marked as read'})


class ChatMessageViewSet(viewsets.ModelViewSet):
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Показываем только сообщения из комнат пользователя
        return ChatMessage.objects.filter(
            room__participants__user=self.request.user
        ).select_related('sender', 'room')
    
    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)
```

### Шаг 8: Настройка URL

Создать файл `apps/chat/urls.py`:

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatRoomViewSet, ChatMessageViewSet

router = DefaultRouter()
router.register(r'rooms', ChatRoomViewSet, basename='chatroom')
router.register(r'messages', ChatMessageViewSet, basename='chatmessage')

urlpatterns = [
    path('', include(router.urls)),
]
```

Добавить в `config/urls.py`:

```python
urlpatterns = [
    # ...
    path('api/chat/', include('apps.chat.urls')),
]
```

### Шаг 9: Миграции

```bash
python manage.py makemigrations chat
python manage.py migrate
```

---

## Frontend: React + WebSocket

### Шаг 1: Создание типов

Создать файл `frontend-react/src/types/chat.ts`:

```typescript
export interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface ChatMessage {
  id: number;
  room: number;
  sender: User;
  sender_name: string;
  message: string;
  file?: string;
  is_read: boolean;
  created_at: string;
}

export interface ChatParticipant {
  id: number;
  user: User;
  last_read_at?: string;
  joined_at: string;
}

export interface ChatRoom {
  id: number;
  order: number;
  participants: ChatParticipant[];
  last_message?: ChatMessage;
  unread_count: number;
  created_at: string;
  updated_at: string;
}
```

### Шаг 2: Создание API клиента

Создать файл `frontend-react/src/api/chat.ts`:

```typescript
import axios from 'axios';
import { ChatRoom, ChatMessage } from '../types/chat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const chatApi = {
  // Получить все комнаты чата
  getRooms: async (): Promise<ChatRoom[]> => {
    const response = await axios.get(`${API_URL}/api/chat/rooms/`);
    return response.data;
  },

  // Создать комнату для заказа
  createRoomForOrder: async (orderId: number): Promise<ChatRoom> => {
    const response = await axios.post(`${API_URL}/api/chat/rooms/create_for_order/`, {
      order_id: orderId
    });
    return response.data;
  },

  // Получить историю сообщений
  getMessages: async (roomId: number): Promise<ChatMessage[]> => {
    const response = await axios.get(`${API_URL}/api/chat/rooms/${roomId}/messages/`);
    return response.data;
  },

  // Отметить сообщения как прочитанные
  markAsRead: async (roomId: number): Promise<void> => {
    await axios.post(`${API_URL}/api/chat/rooms/${roomId}/mark_read/`);
  },

  // Отправить сообщение через REST (альтернатива WebSocket)
  sendMessage: async (roomId: number, message: string): Promise<ChatMessage> => {
    const response = await axios.post(`${API_URL}/api/chat/messages/`, {
      room: roomId,
      message: message
    });
    return response.data;
  }
};
```

### Шаг 3: Создание WebSocket хука

Создать файл `frontend-react/src/hooks/useWebSocket.ts`:

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';
import { ChatMessage } from '../types/chat';

interface UseWebSocketProps {
  roomId: number;
  onMessage?: (message: ChatMessage) => void;
  onTyping?: (userId: number, isTyping: boolean) => void;
}

export const useWebSocket = ({ roomId, onMessage, onTyping }: UseWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    const token = localStorage.getItem('access_token');
    const wsUrl = `ws://localhost:8000/ws/chat/${roomId}/?token=${token}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'message_history') {
        setMessages(data.messages);
      } else if (data.type === 'chat_message') {
        setMessages(prev => [...prev, data.message]);
        onMessage?.(data.message);
      } else if (data.type === 'user_typing') {
        onTyping?.(data.user_id, data.is_typing);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      
      // Автопереподключение через 3 секунды
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Reconnecting...');
        connect();
      }, 3000);
    };
  }, [roomId, onMessage, onTyping]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat_message',
        message: message
      }));
    }
  }, []);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        is_typing: isTyping
      }));
    }
  }, []);

  const markAsRead = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'mark_read'
      }));
    }
  }, []);

  return {
    isConnected,
    messages,
    sendMessage,
    sendTyping,
    markAsRead
  };
};
```

### Шаг 4: Создание компонента чата

Создать файл `frontend-react/src/components/chat/ChatWindow.tsx`:

```typescript
import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, List, Avatar, Typography, Badge, Space } from 'antd';
import { SendOutlined, UserOutlined } from '@ant-design/icons';
import { useWebSocket } from '../../hooks/useWebSocket';
import { ChatMessage } from '../../types/chat';
import dayjs from 'dayjs';
import './ChatWindow.css';

const { TextArea } = Input;
const { Text } = Typography;

interface ChatWindowProps {
  roomId: number;
  currentUserId: number;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ roomId, currentUserId }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const { isConnected, messages, sendMessage, sendTyping, markAsRead } = useWebSocket({
    roomId,
    onMessage: (message) => {
      // Автоматически отмечаем как прочитанное
      if (message.sender.id !== currentUserId) {
        markAsRead();
      }
    },
    onTyping: (userId, isTyping) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (isTyping) {
          newSet.add(userId);
        } else {
          newSet.delete(userId);
        }
        return newSet;
      });
    }
  });

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (inputMessage.trim()) {
      sendMessage(inputMessage);
      setInputMessage('');
      sendTyping(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    
    // Отправка уведомления о печати
    sendTyping(true);
    
    // Сброс уведомления через 2 секунды
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <Space>
          <Badge status={isConnected ? 'success' : 'error'} />
          <Text strong>Чат по заказу</Text>
        </Space>
      </div>

      <div className="chat-messages">
        <List
          dataSource={messages}
          renderItem={(message: ChatMessage) => {
            const isOwn = message.sender.id === currentUserId;
            return (
              <List.Item
                className={`message-item ${isOwn ? 'own-message' : 'other-message'}`}
              >
                <div className="message-content">
                  {!isOwn && (
                    <Avatar icon={<UserOutlined />} size="small" />
                  )}
                  <div className="message-bubble">
                    {!isOwn && (
                      <Text type="secondary" className="sender-name">
                        {message.sender_name}
                      </Text>
                    )}
                    <Text>{message.message}</Text>
                    <Text type="secondary" className="message-time">
                      {dayjs(message.created_at).format('HH:mm')}
                    </Text>
                  </div>
                </div>
              </List.Item>
            );
          }}
        />
        
        {typingUsers.size > 0 && (
          <div className="typing-indicator">
            <Text type="secondary">Печатает...</Text>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <TextArea
          value={inputMessage}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Введите сообщение..."
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={!isConnected}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          disabled={!isConnected || !inputMessage.trim()}
        >
          Отправить
        </Button>
      </div>
    </div>
  );
};
```

### Шаг 5: Стили для чата

Создать файл `frontend-react/src/components/chat/ChatWindow.css`:

```css
.chat-window {
  display: flex;
  flex-direction: column;
  height: 600px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  overflow: hidden;
}

.chat-header {
  padding: 16px;
  background: #fafafa;
  border-bottom: 1px solid #d9d9d9;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #fff;
}

.message-item {
  border: none !important;
  padding: 8px 0 !important;
}

.message-content {
  display: flex;
  gap: 8px;
  width: 100%;
}

.own-message .message-content {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 60%;
  padding: 8px 12px;
  border-radius: 8px;
  background: #f0f0f0;
}

.own-message .message-bubble {
  background: #1890ff;
  color: white;
}

.sender-name {
  display: block;
  font-size: 12px;
  margin-bottom: 4px;
}

.message-time {
  display: block;
  font-size: 11px;
  margin-top: 4px;
  text-align: right;
}

.own-message .message-time {
  color: rgba(255, 255, 255, 0.7);
}

.typing-indicator {
  padding: 8px;
  font-style: italic;
}

.chat-input {
  display: flex;
  gap: 8px;
  padding: 16px;
  background: #fafafa;
  border-top: 1px solid #d9d9d9;
}

.chat-input textarea {
  flex: 1;
}
```

### Шаг 6: Список комнат чата

Создать файл `frontend-react/src/components/chat/ChatRoomList.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { List, Badge, Avatar, Typography, Spin } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import { chatApi } from '../../api/chat';
import { ChatRoom } from '../../types/chat';
import dayjs from 'dayjs';

const { Text } = Typography;

interface ChatRoomListProps {
  onSelectRoom: (roomId: number) => void;
}

export const ChatRoomList: React.FC<ChatRoomListProps> = ({ onSelectRoom }) => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const data = await chatApi.getRooms();
      setRooms(data);
    } catch (error) {
      console.error('Failed to load chat rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Spin />;
  }

  return (
    <List
      dataSource={rooms}
      renderItem={(room) => (
        <List.Item
          onClick={() => onSelectRoom(room.id)}
          style={{ cursor: 'pointer' }}
        >
          <List.Item.Meta
            avatar={
              <Badge count={room.unread_count}>
                <Avatar icon={<MessageOutlined />} />
              </Badge>
            }
            title={`Заказ #${room.order}`}
            description={
              room.last_message ? (
                <>
                  <Text ellipsis>{room.last_message.message}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(room.last_message.created_at).format('DD.MM.YYYY HH:mm')}
                  </Text>
                </>
              ) : (
                'Нет сообщений'
              )
            }
          />
        </List.Item>
      )}
    />
  );
};
```

---

## Интеграция с заказами

### Добавление кнопки чата в детали заказа

В компоненте деталей заказа (например, `OrderDetails.tsx`):

```typescript
import { Button, Modal } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { ChatWindow } from '../components/chat/ChatWindow';
import { chatApi } from '../api/chat';

// В компоненте:
const [chatModalVisible, setChatModalVisible] = useState(false);
const [chatRoomId, setChatRoomId] = useState<number | null>(null);

const openChat = async () => {
  try {
    // Создаем или получаем комнату чата для заказа
    const room = await chatApi.createRoomForOrder(orderId);
    setChatRoomId(room.id);
    setChatModalVisible(true);
  } catch (error) {
    console.error('Failed to open chat:', error);
  }
};

// В JSX:
<Button 
  type="primary" 
  icon={<MessageOutlined />}
  onClick={openChat}
>
  Открыть чат
</Button>

<Modal
  title="Чат по заказу"
  open={chatModalVisible}
  onCancel={() => setChatModalVisible(false)}
  footer={null}
  width={700}
>
  {chatRoomId && (
    <ChatWindow 
      roomId={chatRoomId} 
      currentUserId={currentUser.id} 
    />
  )}
</Modal>
```

### Автоматическое создание комнаты при создании заказа

В `apps/orders/models.py` добавить сигнал:

```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.chat.models import ChatRoom, ChatParticipant

@receiver(post_save, sender=Order)
def create_chat_room(sender, instance, created, **kwargs):
    """Автоматически создаем комнату чата при создании заказа"""
    if created:
        room = ChatRoom.objects.create(order=instance)
        ChatParticipant.objects.create(room=room, user=instance.client)
        if instance.expert:
            ChatParticipant.objects.create(room=room, user=instance.expert)
```

---

## Тестирование

### 1. Тестирование Backend

```bash
# Запуск Redis (если еще не запущен)
redis-server

# Запуск Django сервера
python manage.py runserver

# Проверка WebSocket подключения
# Используйте инструмент типа wscat или браузерную консоль
```

### 2. Тестирование Frontend

```bash
cd frontend-react
npm run dev
```

### 3. Ручное тестирование

1. Создайте заказ
2. Откройте чат из деталей заказа
3. Отправьте сообщение
4. Откройте тот же заказ в другом браузере/вкладке
5. Проверьте, что сообщения приходят в реальном времени

### 4. Проверка уведомлений о печати

1. Начните печатать в одном окне
2. Во втором окне должно появиться "Печатает..."

---

## Деплой

### 1. Настройка для продакшена

В `config/settings.py`:

```python
# WebSocket URL для продакшена
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [os.environ.get('REDIS_URL', 'redis://localhost:6379')],
        },
    },
}

# Разрешенные хосты для WebSocket
ALLOWED_HOSTS = ['yourdomain.com', 'www.yourdomain.com']
```

### 2. Настройка Nginx для WebSocket

В `docker/nginx/conf.d/default.conf`:

```nginx
# WebSocket проксирование
location /ws/ {
    proxy_pass http://backend:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
}
```

### 3. Обновление docker-compose.yml

```yaml
services:
  backend:
    # ...
    command: daphne -b 0.0.0.0 -p 8000 config.asgi:application
    # или используйте gunicorn с uvicorn workers:
    # command: gunicorn config.asgi:application -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### 4. Обновление requirements.txt

Добавьте если еще нет:

```
daphne==4.0.0
# или
uvicorn==0.27.0
```

### 5. Frontend переменные окружения

В `frontend-react/.env.production`:

```
VITE_API_URL=https://yourdomain.com
VITE_WS_URL=wss://yourdomain.com
```

В `useWebSocket.ts` обновите URL:

```typescript
const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/chat/${roomId}/?token=${token}`;
```

---

## Дополнительные возможности (опционально)

### 1. Загрузка файлов

В `ChatMessage` модели уже есть поле `file`. Добавьте в форму:

```typescript
<Upload
  beforeUpload={(file) => {
    // Загрузка через API
    return false;
  }}
>
  <Button icon={<PaperClipOutlined />}>Прикрепить файл</Button>
</Upload>
```

### 2. Push-уведомления

Используйте Django Channels для отправки уведомлений:

```python
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def send_notification(user_id, message):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'user_{user_id}',
        {
            'type': 'notification',
            'message': message
        }
    )
```

### 3. История сообщений с пагинацией

```python
# В views.py
from rest_framework.pagination import PageNumberPagination

class MessagePagination(PageNumberPagination):
    page_size = 50

class ChatRoomViewSet(viewsets.ModelViewSet):
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        room = self.get_object()
        messages = room.messages.select_related('sender').all()
        paginator = MessagePagination()
        page = paginator.paginate_queryset(messages, request)
        serializer = ChatMessageSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
```

### 4. Эмодзи

Уже установлен `emoji-picker-react`:

```typescript
import EmojiPicker from 'emoji-picker-react';

const [showEmojiPicker, setShowEmojiPicker] = useState(false);

<Button 
  icon={<SmileOutlined />}
  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
/>

{showEmojiPicker && (
  <EmojiPicker onEmojiClick={(emoji) => {
    setInputMessage(prev => prev + emoji.emoji);
  }} />
)}
```

---

## Чеклист запуска

- [ ] Создано приложение `apps/chat`
- [ ] Созданы модели и выполнены миграции
- [ ] Настроен WebSocket роутинг
- [ ] Настроен ASGI и Channel Layers
- [ ] Созданы REST API endpoints
- [ ] Создан WebSocket Consumer
- [ ] Созданы React компоненты
- [ ] Создан WebSocket хук
- [ ] Настроен Nginx для WebSocket
- [ ] Обновлен docker-compose.yml
- [ ] Протестировано локально
- [ ] Протестировано на продакшене

---

## Полезные команды

```bash
# Проверка подключения к Redis
redis-cli ping

# Просмотр активных WebSocket соединений
redis-cli CLIENT LIST

# Очистка Redis (для тестирования)
redis-cli FLUSHALL

# Запуск с Daphne (для WebSocket)
daphne -b 0.0.0.0 -p 8000 config.asgi:application

# Проверка миграций
python manage.py showmigrations chat
```

---

## Troubleshooting

### WebSocket не подключается

1. Проверьте, что Redis запущен: `redis-cli ping`
2. Проверьте ASGI_APPLICATION в settings.py
3. Проверьте CHANNEL_LAYERS настройки
4. Проверьте токен авторизации в WebSocket URL

### Сообщения не приходят

1. Проверьте консоль браузера на ошибки
2. Проверьте логи Django сервера
3. Проверьте, что пользователь является участником комнаты

### Ошибка CORS

Добавьте в `settings.py`:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "https://yourdomain.com",
]

CORS_ALLOW_CREDENTIALS = True
```

---

## Готово!

Теперь у вас есть полнофункциональный чат с:
- ✅ Реальным временем (WebSocket)
- ✅ Историей сообщений
- ✅ Уведомлениями о печати
- ✅ Счетчиком непрочитанных
- ✅ Автопереподключением
- ✅ Привязкой к заказам

Следуйте инструкции шаг за шагом, и у вас получится рабочий чат!
