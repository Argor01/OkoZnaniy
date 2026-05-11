import logging

from vk_bot.utils.keyboards import get_notifications_keyboard, get_main_keyboard

logger = logging.getLogger(__name__)


def handle_notifications_menu(vk, event):
    """Show current notification settings."""
    from apps.users.models import User

    vk_id = event.obj.message['from_id']
    peer_id = event.obj.message['peer_id']

    try:
        user = User.objects.get(vk_id=vk_id)
        status = "\u2705 \u0412\u043A\u043B\u044E\u0447\u0435\u043D\u044B" if user.vk_notifications_enabled else "\u274C \u0412\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u044B"
        text = (
            f"\U0001F514 \u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0439\n\n"
            f"\u0421\u0442\u0430\u0442\u0443\u0441: {status}\n\n"
            f"\u0412\u044B \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442\u0435 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u043E:\n"
            f"\u2022 \u041D\u043E\u0432\u044B\u0445 \u0437\u0430\u043A\u0430\u0437\u0430\u0445\n"
            f"\u2022 \u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F\u0445 \u0432 \u0447\u0430\u0442\u0435\n"
            f"\u2022 \u0418\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F\u0445 \u0441\u0442\u0430\u0442\u0443\u0441\u043E\u0432\n"
            f"\u2022 \u041E\u043F\u043B\u0430\u0442\u0430\u0445 \u0438 \u043E\u0442\u0437\u044B\u0432\u0430\u0445"
        )
        vk.messages.send(
            peer_id=peer_id,
            message=text,
            keyboard=get_notifications_keyboard(user.vk_notifications_enabled),
            random_id=0,
        )
    except User.DoesNotExist:
        vk.messages.send(
            peer_id=peer_id,
            message="\u274C \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D. \u041D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \"\u041D\u0430\u0447\u0430\u0442\u044C\" \u0434\u043B\u044F \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438.",
            keyboard=get_main_keyboard(),
            random_id=0,
        )


def handle_toggle_notifications(vk, event, enable: bool):
    """Enable or disable VK notifications."""
    from apps.users.models import User

    vk_id = event.obj.message['from_id']
    peer_id = event.obj.message['peer_id']

    try:
        user = User.objects.get(vk_id=vk_id)
        user.vk_notifications_enabled = enable
        user.save(update_fields=['vk_notifications_enabled'])

        if enable:
            text = "\u2705 VK-\u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u044B!"
        else:
            text = "\u274C VK-\u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u044B."

        vk.messages.send(
            peer_id=peer_id,
            message=text,
            keyboard=get_main_keyboard(),
            random_id=0,
        )
    except User.DoesNotExist:
        vk.messages.send(
            peer_id=peer_id,
            message="\u274C \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.",
            keyboard=get_main_keyboard(),
            random_id=0,
        )
