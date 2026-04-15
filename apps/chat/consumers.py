"""
WebSocket consumers для real-time обновлений.

Поддерживаемые группы:
- chat_{id} — сообщения в чате
- user_{id} — персональные уведомления, обновления заказов, арбитража
- order_{id} — обновления статуса заказа и отклики
- arbitration_{id} — обновления арбитража
"""

import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

User = get_user_model()


class AuthenticatedConsumer(AsyncJsonWebsocketConsumer):
    """Базовый consumer с аутентификацией через JWT token."""

    user = None

    async def connect(self):
        # Получаем токен из query string
        query_string = self.scope.get("query_string", b"").decode()
        token = self._get_token_from_query(query_string)

        if token:
            self.user = await self._get_user_from_token(token)

        if self.user and self.user.is_authenticated:
            await self.accept()
        else:
            await self.close(code=4001)

    def _get_token_from_query(self, query_string: str) -> str | None:
        """Извлекает JWT токен из query string."""
        params = dict(param.split("=") for param in query_string.split("&") if "=" in param)
        return params.get("token")

    @database_sync_to_async
    def _get_user_from_token(self, token: str) -> User | None:
        """Получает пользователя из JWT токена."""
        try:
            access_token = AccessToken(token)
            user_id = access_token.get("user_id")
            if user_id:
                return User.objects.get(id=user_id)
        except (TokenError, InvalidToken, User.DoesNotExist):
            pass
        return None


class ChatConsumer(AuthenticatedConsumer):
    """Consumer для real-time сообщений в чате."""

    async def connect(self):
        await super().connect()
        if not self.user:
            return

        self.chat_id = self.scope["url_route"]["kwargs"]["chat_id"]
        self.room_group_name = f"chat_{self.chat_id}"

        # Присоединяемся к группе чата
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive_json(self, content):
        """Обработка входящего сообщения от клиента."""
        message_type = content.get("type", "chat_message")

        if message_type == "chat_message":
            # Отправляем сообщение в группу (обработка на стороне Django через API)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_message_broadcast",
                    "data": content.get("data", {}),
                },
            )
        elif message_type == "typing":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "typing_indicator",
                    "user_id": self.user.id,
                    "username": self.user.username,
                },
            )

    async def chat_message_broadcast(self, event):
        """Отправка нового сообщения всем участникам чата."""
        await self.send_json(
            {
                "type": "new_message",
                "data": event["data"],
            }
        )

    async def typing_indicator(self, event):
        """Индикатор набора текста."""
        await self.send_json(
            {
                "type": "typing",
                "user_id": event["user_id"],
                "username": event["username"],
            }
        )


class NotificationConsumer(AuthenticatedConsumer):
    """Consumer для real-time уведомлений."""

    async def connect(self):
        await super().connect()
        if not self.user:
            return

        self.room_group_name = f"user_{self.user.id}"

        # Присоединяемся к персональной группе пользователя
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive_json(self, content):
        """Обработка команд от клиента."""
        message_type = content.get("type", "")

        if message_type == "mark_read":
            # Клиент отмечает уведомления как прочитанные
            pass

    async def new_notification(self, event):
        """Отправка нового уведомления."""
        await self.send_json(
            {
                "type": "new_notification",
                "data": event["data"],
            }
        )

    async def notification_batch(self, event):
        """Отправка пакета уведомлений."""
        await self.send_json(
            {
                "type": "notification_batch",
                "data": event["data"],
            }
        )


class OrderConsumer(AuthenticatedConsumer):
    """Consumer для real-time обновлений заказов."""

    async def connect(self):
        await super().connect()
        if not self.user:
            return

        self.order_id = self.scope["url_route"]["kwargs"]["order_id"]
        self.order_group_name = f"order_{self.order_id}"
        self.user_group_name = f"user_{self.user.id}"

        # Присоединяемся к группе заказа и персональной группе
        await self.channel_layer.group_add(self.order_group_name, self.channel_name)
        await self.channel_layer.group_add(self.user_group_name, self.channel_name)

    async def disconnect(self, close_code):
        if hasattr(self, "order_group_name"):
            await self.channel_layer.group_discard(self.order_group_name, self.channel_name)
        if hasattr(self, "user_group_name"):
            await self.channel_layer.group_discard(self.user_group_name, self.channel_name)

    async def order_status_update(self, event):
        """Обновление статуса заказа."""
        await self.send_json(
            {
                "type": "order_status_changed",
                "data": event["data"],
            }
        )

    async def new_bid(self, event):
        """Новый отклик на заказ."""
        await self.send_json(
            {
                "type": "new_bid",
                "data": event["data"],
            }
        )

    async def order_file_uploaded(self, event):
        """Новый файл в заказе."""
        await self.send_json(
            {
                "type": "order_file_uploaded",
                "data": event["data"],
            }
        )


class ArbitrationConsumer(AuthenticatedConsumer):
    """Consumer для real-time обновлений арбитража."""

    async def connect(self):
        await super().connect()
        if not self.user:
            return

        self.case_id = self.scope["url_route"]["kwargs"]["case_id"]
        self.room_group_name = f"arbitration_{self.case_id}"
        self.user_group_name = f"user_{self.user.id}"

        # Присоединяемся к группе арбитража и персональной группе
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.channel_layer.group_add(self.user_group_name, self.channel_name)

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        if hasattr(self, "user_group_name"):
            await self.channel_layer.group_discard(self.user_group_name, self.channel_name)

    async def receive_json(self, content):
        """Обработка входящего сообщения арбитража."""
        message_type = content.get("type", "")

        if message_type == "arbitration_message":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "arbitration_message_broadcast",
                    "data": content.get("data", {}),
                },
            )

    async def arbitration_message_broadcast(self, event):
        """Отправка нового сообщения арбитража всем участникам."""
        await self.send_json(
            {
                "type": "new_arbitration_message",
                "data": event["data"],
            }
        )

    async def arbitration_status_update(self, event):
        """Обновление статуса арбитража."""
        await self.send_json(
            {
                "type": "arbitration_status_changed",
                "data": event["data"],
            }
        )

    async def arbitration_activity(self, event):
        """Новая активность в арбитраже."""
        await self.send_json(
            {
                "type": "arbitration_activity",
                "data": event["data"],
            }
        )
