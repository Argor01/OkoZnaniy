import logging

from celery import shared_task
from django.core.cache import cache

from vk_bot.sender import send_vk_message
from vk_bot.utils.formatters import format_notification, format_chat_message

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_vk_notification(self, user_id: int, notification_type: str, title: str, message: str, data: dict = None):
    """Send a system notification to the user's VK."""
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(id=user_id)

        if not user.vk_id or not user.vk_notifications_enabled:
            return

        text = format_notification(notification_type, title, message, data)
        send_vk_message(user.vk_id, text)

    except Exception as exc:
        logger.error("send_vk_notification failed for user %s: %s", user_id, exc)
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_vk_chat_notification(
    self,
    recipient_id: int,
    sender_name: str,
    chat_id: int,
    message_preview: str,
    order_id: int = None,
):
    """Send a VK push when someone writes in a chat."""
    try:
        cache_key = f'vk_chat_push_{recipient_id}_{chat_id}'
        if cache.get(cache_key):
            return
        cache.set(cache_key, True, 30)

        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(id=recipient_id)

        if not user.vk_id or not user.vk_notifications_enabled:
            return

        text = format_chat_message(sender_name, message_preview, order_id)
        send_vk_message(user.vk_id, text)

    except Exception as exc:
        logger.error("send_vk_chat_notification failed for user %s: %s", recipient_id, exc)
        self.retry(exc=exc)
