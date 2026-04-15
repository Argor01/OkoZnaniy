"""
WebSocket routing для Django Channels.
"""

from django.urls import path
from .consumers import ChatConsumer, NotificationConsumer, OrderConsumer, ArbitrationConsumer

websocket_urlpatterns = [
    # Чат: ws://host/ws/chat/<chat_id>/?token=<jwt>
    path("ws/chat/<int:chat_id>/", ChatConsumer.as_asgi()),

    # Уведомления: ws://host/ws/notifications/?token=<jwt>
    path("ws/notifications/", NotificationConsumer.as_asgi()),

    # Заказы: ws://host/ws/orders/<order_id>/?token=<jwt>
    path("ws/orders/<int:order_id>/", OrderConsumer.as_asgi()),

    # Арбитраж: ws://host/ws/arbitration/<case_id>/?token=<jwt>
    path("ws/arbitration/<int:case_id>/", ArbitrationConsumer.as_asgi()),
]
