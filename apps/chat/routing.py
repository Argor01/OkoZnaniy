"""
WebSocket routing для Django Channels.

Импорты consumers выполнятся после инициализации Django в asgi.py.
"""

from django.urls import path

websocket_urlpatterns = []


def get_websocket_urlpatterns():
    """Лениво загружает URL паттерны после инициализации Django."""
    from .consumers import ChatConsumer, NotificationConsumer, OrderConsumer, ArbitrationConsumer

    return [
        path("ws/chat/<int:chat_id>/", ChatConsumer.as_asgi()),
        path("ws/notifications/", NotificationConsumer.as_asgi()),
        path("ws/orders/<int:order_id>/", OrderConsumer.as_asgi()),
        path("ws/arbitration/<int:case_id>/", ArbitrationConsumer.as_asgi()),
    ]
