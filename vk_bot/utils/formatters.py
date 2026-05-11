import os

WEBSITE_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

NOTIFICATION_EMOJI = {
    'new_order': '\U0001F4E6',
    'new_bid': '\U0001F4AC',
    'order_taken': '\u2705',
    'order_assigned': '\U0001F468\u200D\U0001F3EB',
    'file_uploaded': '\U0001F4CE',
    'new_comment': '\U0001F5E8',
    'status_changed': '\U0001F504',
    'deadline_soon': '\u23F0',
    'document_verified': '\U0001F4DD',
    'specialization_verified': '\U0001F393',
    'review_received': '\u2B50',
    'new_rating': '\U0001F31F',
    'rating_milestone': '\U0001F3C6',
    'payment_received': '\U0001F4B0',
    'order_completed': '\U0001F3C1',
    'new_contact': '\U0001F4E9',
    'application_submitted': '\U0001F4CB',
    'application_approved': '\u2705',
    'application_rejected': '\u274C',
    'expert_violation': '\u26A0\uFE0F',
    'new_answer': '\U0001F4AC',
    'complaint_filed': '\u2696\uFE0F',
    'review_request': '\u270D\uFE0F',
    'review_reply': '\U0001F4AC',
    'review_appeal': '\U0001F4E2',
}


def format_notification(notification_type: str, title: str, message: str, data: dict = None) -> str:
    emoji = NOTIFICATION_EMOJI.get(notification_type, '\U0001F514')
    text = f"{emoji} {title}\n\n{message}"

    if data:
        order_id = data.get('order_id')
        if order_id:
            text += f"\n\n\U0001F517 {WEBSITE_URL}/orders/{order_id}"

    if len(text) > 4096:
        text = text[:4090] + '...'

    return text


def format_chat_message(sender_name: str, message_preview: str, order_id: int = None) -> str:
    text = f"\U0001F4AC \u041D\u043E\u0432\u043E\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435\n\n\u041E\u0442: {sender_name}\n"
    if order_id:
        text += f"\u0417\u0430\u043A\u0430\u0437: \u2116{order_id}\n"
    preview = message_preview[:100]
    if len(message_preview) > 100:
        preview += '...'
    text += f'\n"{preview}"'
    if order_id:
        text += f"\n\n\U0001F517 {WEBSITE_URL}/orders/{order_id}"
    return text
