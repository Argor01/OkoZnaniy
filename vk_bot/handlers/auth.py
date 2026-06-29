import logging

from django.core.cache import cache
from rest_framework_simplejwt.tokens import RefreshToken

from vk_bot.utils.keyboards import get_auth_success_keyboard, get_main_keyboard

logger = logging.getLogger(__name__)
NOT_SET = 'Не указан'


def _save_auth_data(auth_id: str, user):
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)

    auth_data = {
        'authenticated': True,
        'access': access_token,
        'refresh': refresh_token,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'first_name': user.first_name,
            'last_name': user.last_name,
        },
    }
    cache_key = f'vk_auth_{auth_id}'
    cache.set(cache_key, auth_data, 300)
    logger.info("VK auth data saved for auth_id: %s", auth_id)
    return user.get_role_display()


def handle_auth(vk, event, auth_id: str):
    """Handle deep-link authorization: /start auth_XXXXX."""
    from vk_bot.handlers.commands import get_or_create_user

    vk_id = event.obj.message['from_id']
    peer_id = event.obj.message['peer_id']

    user_info = vk.users.get(user_ids=vk_id)
    first_name = user_info[0].get('first_name', '') if user_info else ''
    last_name = user_info[0].get('last_name', '') if user_info else ''

    user, _ = get_or_create_user(vk_id, first_name, last_name)
    role_display = _save_auth_data(auth_id, user)

    text = (
        "\U0001F389 \u0410\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F \u0443\u0441\u043F\u0435\u0448\u043D\u0430!\n\n"
        f"\U0001F464 \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C: {first_name} {last_name}\n"
        f"\U0001F3AD \u0420\u043E\u043B\u044C: {role_display}\n"
        f"\U0001F4E7 Email: {user.email or NOT_SET}\n\n"
        "\u2728 \u0412\u044B \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0432\u043E\u0448\u043B\u0438 \u043D\u0430 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0443 OkoZnaniy!\n"
        "\U0001F504 \u0412\u0435\u0440\u043D\u0438\u0442\u0435\u0441\u044C \u043D\u0430 \u0441\u0430\u0439\u0442 \u2014 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F \u043F\u0440\u043E\u0438\u0437\u043E\u0439\u0434\u0451\u0442 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438."
    )

    vk.messages.send(
        peer_id=peer_id,
        message=text,
        keyboard=get_auth_success_keyboard(),
        random_id=0,
    )
