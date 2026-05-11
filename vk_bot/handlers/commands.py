import logging

from asgiref.sync import sync_to_async
from django.conf import settings

from vk_bot.utils.keyboards import get_main_keyboard

logger = logging.getLogger(__name__)

WEBSITE_URL = settings.FRONTEND_URL


def get_or_create_user(vk_id, first_name, last_name):
    from apps.users.models import User
    try:
        user = User.objects.get(vk_id=vk_id)
        created = False
        user.first_name = first_name
        user.last_name = last_name
        user.save(update_fields=['first_name', 'last_name'])
        logger.info("User updated: %s (vk_id: %s)", user.username, vk_id)
    except User.DoesNotExist:
        username = f"vk_{vk_id}"
        user = User.objects.create(
            username=username,
            vk_id=vk_id,
            first_name=first_name,
            last_name=last_name,
            role='client',
        )
        created = True
        logger.info("New user created: %s (vk_id: %s)", user.username, vk_id)
    return user, created


def handle_start(vk, event):
    vk_id = event.obj.message['from_id']
    peer_id = event.obj.message['peer_id']

    user_info = vk.users.get(user_ids=vk_id)
    if user_info:
        first_name = user_info[0].get('first_name', '')
        last_name = user_info[0].get('last_name', '')
    else:
        first_name, last_name = '', ''

    payload = event.obj.message.get('payload')
    ref = event.obj.message.get('ref', '')

    user, created = get_or_create_user(vk_id, first_name, last_name)

    if created:
        text = (
            f"\U0001F44B \u041F\u0440\u0438\u0432\u0435\u0442, {first_name}!\n\n"
            f"\u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C \u043D\u0430 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0443 OkoZnaniy!\n\n"
            f"\U0001F393 \u0417\u0434\u0435\u0441\u044C \u0432\u044B \u043C\u043E\u0436\u0435\u0442\u0435:\n"
            f"\u2022 \u0417\u0430\u043A\u0430\u0437\u0430\u0442\u044C \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435 \u0443\u0447\u0435\u0431\u043D\u044B\u0445 \u0440\u0430\u0431\u043E\u0442\n"
            f"\u2022 \u0421\u0442\u0430\u0442\u044C \u044D\u043A\u0441\u043F\u0435\u0440\u0442\u043E\u043C \u0438 \u0437\u0430\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u0442\u044C\n"
            f"\u2022 \u0423\u0447\u0430\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C \u0432 \u043F\u0430\u0440\u0442\u043D\u0451\u0440\u0441\u043A\u043E\u0439 \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0435\n\n"
            f"\u0412\u0430\u0448 VK ID \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D \u043A \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0443. "
            f"\u0422\u0435\u043F\u0435\u0440\u044C \u0432\u044B \u0431\u0443\u0434\u0435\u0442\u0435 \u043F\u043E\u043B\u0443\u0447\u0430\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u043F\u0440\u044F\u043C\u043E \u0441\u044E\u0434\u0430!"
        )
    else:
        text = (
            f"\U0001F44B \u0421 \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0435\u043D\u0438\u0435\u043C, {first_name}!\n\n"
            f"\u0412\u0430\u0448\u0438 \u0434\u0430\u043D\u043D\u044B\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u044B."
        )

    vk.messages.send(
        peer_id=peer_id,
        message=text,
        keyboard=get_main_keyboard(),
        random_id=0,
    )


def handle_profile(vk, event):
    vk_id = event.obj.message['from_id']
    peer_id = event.obj.message['peer_id']

    from apps.users.models import User
    try:
        user = User.objects.get(vk_id=vk_id)
        text = (
            f"\U0001F464 \u0412\u0430\u0448 \u043F\u0440\u043E\u0444\u0438\u043B\u044C:\n\n"
            f"\u0418\u043C\u044F: {user.first_name} {user.last_name}\n"
            f"\u0420\u043E\u043B\u044C: {user.get_role_display()}\n"
            f"Email: {user.email or '\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D'}\n"
            f"\u0422\u0435\u043B\u0435\u0444\u043E\u043D: {user.phone or '\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D'}\n"
            f"\u0414\u0430\u0442\u0430 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438: {user.date_joined.strftime('%d.%m.%Y')}\n"
        )
    except User.DoesNotExist:
        text = "\u274C \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D. \u041D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \"\u041D\u0430\u0447\u0430\u0442\u044C\" \u0434\u043B\u044F \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438."

    vk.messages.send(
        peer_id=peer_id,
        message=text,
        keyboard=get_main_keyboard(),
        random_id=0,
    )


def handle_balance(vk, event):
    vk_id = event.obj.message['from_id']
    peer_id = event.obj.message['peer_id']

    from apps.users.models import User
    try:
        user = User.objects.get(vk_id=vk_id)
        text = (
            f"\U0001F4B0 \u0412\u0430\u0448 \u0431\u0430\u043B\u0430\u043D\u0441:\n\n"
            f"\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E: {user.balance} \u20BD\n"
            f"\u0417\u0430\u043C\u043E\u0440\u043E\u0436\u0435\u043D\u043E: {user.frozen_balance} \u20BD\n"
            f"\u0412\u0441\u0435\u0433\u043E: {user.balance + user.frozen_balance} \u20BD\n"
        )
        if user.role == 'partner':
            text += f"\n\U0001F4BC \u041F\u0430\u0440\u0442\u043D\u0451\u0440\u0441\u043A\u0438\u0439 \u0434\u043E\u0445\u043E\u0434: {user.total_earnings} \u20BD"
    except User.DoesNotExist:
        text = "\u274C \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D. \u041D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \"\u041D\u0430\u0447\u0430\u0442\u044C\" \u0434\u043B\u044F \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438."

    vk.messages.send(
        peer_id=peer_id,
        message=text,
        keyboard=get_main_keyboard(),
        random_id=0,
    )


def handle_orders(vk, event):
    vk_id = event.obj.message['from_id']
    peer_id = event.obj.message['peer_id']

    from apps.users.models import User
    from apps.orders.models import Order
    try:
        user = User.objects.get(vk_id=vk_id)
        if user.role == 'expert':
            orders = Order.objects.filter(expert=user).exclude(status='completed').order_by('-created_at')[:5]
        else:
            orders = Order.objects.filter(client=user).exclude(status='completed').order_by('-created_at')[:5]

        if orders:
            text = "\U0001F4CB \u0412\u0430\u0448\u0438 \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0435 \u0437\u0430\u043A\u0430\u0437\u044B:\n\n"
            for order in orders:
                text += f"\u2022 \u2116{order.id} \u2014 {order.get_status_display()}\n"
            text += f"\n\U0001F517 {WEBSITE_URL}/orders"
        else:
            text = "\U0001F4CB \u0423 \u0432\u0430\u0441 \u043D\u0435\u0442 \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0445 \u0437\u0430\u043A\u0430\u0437\u043E\u0432."

    except User.DoesNotExist:
        text = "\u274C \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D. \u041D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \"\u041D\u0430\u0447\u0430\u0442\u044C\" \u0434\u043B\u044F \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438."

    vk.messages.send(
        peer_id=peer_id,
        message=text,
        keyboard=get_main_keyboard(),
        random_id=0,
    )


def handle_help(vk, event):
    peer_id = event.obj.message['peer_id']
    text = (
        "\U0001F4DA \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B:\n\n"
        "\U0001F464 \u041F\u0440\u043E\u0444\u0438\u043B\u044C \u2014 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043E \u0432\u0430\u0448\u0435\u043C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0435\n"
        "\U0001F4B0 \u0411\u0430\u043B\u0430\u043D\u0441 \u2014 \u0442\u0435\u043A\u0443\u0449\u0438\u0439 \u0431\u0430\u043B\u0430\u043D\u0441\n"
        "\U0001F4CB \u041C\u043E\u0438 \u0437\u0430\u043A\u0430\u0437\u044B \u2014 \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0435 \u0437\u0430\u043A\u0430\u0437\u044B\n"
        "\U0001F514 \u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u2014 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 VK-\u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0439\n\n"
        "\U0001F4A1 \u0412\u044B \u0431\u0443\u0434\u0435\u0442\u0435 \u043F\u043E\u043B\u0443\u0447\u0430\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F "
        "\u043E \u043D\u043E\u0432\u044B\u0445 \u0437\u0430\u043A\u0430\u0437\u0430\u0445, \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F\u0445 \u0438 \u0434\u0440\u0443\u0433\u0438\u0445 \u0441\u043E\u0431\u044B\u0442\u0438\u044F\u0445 \u043F\u0440\u044F\u043C\u043E \u0441\u044E\u0434\u0430!"
    )
    vk.messages.send(
        peer_id=peer_id,
        message=text,
        keyboard=get_main_keyboard(),
        random_id=0,
    )
