import os
import sys
import logging
import json

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

import vk_api
from vk_api.bot_longpoll import VkBotLongPoll, VkBotEventType
from django.conf import settings

from vk_bot.handlers.commands import (
    handle_start,
    handle_profile,
    handle_balance,
    handle_orders,
    handle_help,
)
from vk_bot.handlers.auth import handle_auth
from vk_bot.handlers.settings import handle_notifications_menu, handle_toggle_notifications
from vk_bot.utils.keyboards import get_main_keyboard

logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s %(asctime)s %(name)s %(message)s',
)
logger = logging.getLogger(__name__)

VK_BOT_TOKEN = settings.VK_BOT_TOKEN
VK_GROUP_ID = settings.VK_GROUP_ID

if not VK_BOT_TOKEN:
    logger.error("VK_BOT_TOKEN is not set!")
    sys.exit(1)

if not VK_GROUP_ID:
    logger.error("VK_GROUP_ID is not set!")
    sys.exit(1)


COMMAND_MAP = {
    'начать': 'start',
    'start': 'start',
    'профиль': 'profile',
    'баланс': 'balance',
    'мои заказы': 'orders',
    'помощь': 'help',
    'уведомления': 'notifications',
    'включить уведомления': 'enable_notifications',
    'выключить уведомления': 'disable_notifications',
    'назад': 'start',
}


def handle_message(event, vk):
    """Route incoming message to the appropriate handler."""
    message = event.obj.message
    text = message.get('text', '').strip().lower()
    payload_str = message.get('payload')

    # Check payload from keyboard buttons
    if payload_str:
        try:
            payload = json.loads(payload_str)
            if isinstance(payload, dict) and 'command' in payload:
                text = payload['command']
        except (json.JSONDecodeError, TypeError):
            pass

    # Check for deep-link auth (ref parameter or "auth_" in text)
    ref = message.get('ref', '')
    if ref and ref.startswith('auth_'):
        auth_id = ref.replace('auth_', '')
        handle_auth(vk, event, auth_id)
        return

    # Check if text contains auth_ prefix (e.g. user typed it)
    if text.startswith('auth_'):
        auth_id = text.replace('auth_', '')
        handle_auth(vk, event, auth_id)
        return

    command = COMMAND_MAP.get(text)

    if command == 'start':
        handle_start(vk, event)
    elif command == 'profile':
        handle_profile(vk, event)
    elif command == 'balance':
        handle_balance(vk, event)
    elif command == 'orders':
        handle_orders(vk, event)
    elif command == 'help':
        handle_help(vk, event)
    elif command == 'notifications':
        handle_notifications_menu(vk, event)
    elif command == 'enable_notifications':
        handle_toggle_notifications(vk, event, enable=True)
    elif command == 'disable_notifications':
        handle_toggle_notifications(vk, event, enable=False)
    else:
        # Unknown command — show help
        peer_id = message['peer_id']
        vk.messages.send(
            peer_id=peer_id,
            message=(
                "\U0001F914 \u041D\u0435 \u043F\u043E\u043D\u044F\u043B \u043A\u043E\u043C\u0430\u043D\u0434\u0443. "
                "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043A\u043D\u043E\u043F\u043A\u0438 \u043C\u0435\u043D\u044E "
                "\u0438\u043B\u0438 \u043D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \"\u041F\u043E\u043C\u043E\u0449\u044C\"."
            ),
            keyboard=get_main_keyboard(),
            random_id=0,
        )


def main():
    logger.info("Starting VK bot...")
    logger.info("VK Group ID: %s", VK_GROUP_ID)

    vk_session = vk_api.VkApi(token=VK_BOT_TOKEN)
    vk = vk_session.get_api()

    longpoll = VkBotLongPoll(vk_session, VK_GROUP_ID)
    logger.info("VK Bot Long Poll started, listening for events...")

    while True:
        try:
            for event in longpoll.listen():
                if event.type == VkBotEventType.MESSAGE_NEW:
                    try:
                        handle_message(event, vk)
                    except Exception:
                        logger.exception("Error handling message")
        except Exception:
            logger.exception("Long Poll connection error, reconnecting...")
            import time
            time.sleep(5)


if __name__ == "__main__":
    main()
