"""
Утилиты для отправки WebSocket уведомлений.

Используются в views, signals, services для real-time обновлений.
"""

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


channel_layer = get_channel_layer()


def send_to_group(group_name: str, event_type: str, data: dict):
    """Отправить событие в группу WebSocket."""
    if not channel_layer:
        return

    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": event_type,
            "data": data,
        },
    )


def notify_chat_message(chat_id: int, message_data: dict):
    """Отправить уведомление о новом сообщении в чате."""
    send_to_group(
        f"chat_{chat_id}",
        "chat_message_broadcast",
        message_data,
    )


def notify_typing(chat_id: int, user_id: int, username: str):
    """Отправить индикатор набора текста."""
    if not channel_layer:
        return

    async_to_sync(channel_layer.group_send)(
        f"chat_{chat_id}",
        {
            "type": "typing_indicator",
            "user_id": user_id,
            "username": username,
        },
    )


def notify_user(user_id: int, event_type: str, data: dict):
    """Отправить персональное уведомление пользователю."""
    send_to_group(
        f"user_{user_id}",
        event_type,
        data,
    )


def notify_new_notification(user_id: int, notification_data: dict):
    """Отправить уведомление о новом уведомлении."""
    notify_user(user_id, "new_notification", notification_data)


def notify_order_status(order_id: int, order_data: dict):
    """Отправить уведомление об обновлении заказа."""
    send_to_group(
        f"order_{order_id}",
        "order_status_update",
        order_data,
    )


def notify_new_bid(order_id: int, bid_data: dict):
    """Отправить уведомление о новом отклике."""
    send_to_group(
        f"order_{order_id}",
        "new_bid",
        bid_data,
    )


def notify_arbitration_message(case_id: int, message_data: dict):
    """Отправить уведомление о новом сообщении арбитража."""
    send_to_group(
        f"arbitration_{case_id}",
        "arbitration_message_broadcast",
        message_data,
    )


def notify_arbitration_status(case_id: int, case_data: dict):
    """Отправить уведомление об обновлении статуса арбитража."""
    send_to_group(
        f"arbitration_{case_id}",
        "arbitration_status_update",
        case_data,
    )


def notify_arbitration_activity(case_id: int, activity_data: dict):
    """Отправить уведомление об активности в арбитраже."""
    send_to_group(
        f"arbitration_{case_id}",
        "arbitration_activity",
        activity_data,
    )
