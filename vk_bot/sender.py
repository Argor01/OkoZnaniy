import logging
import random

import vk_api
from django.conf import settings

logger = logging.getLogger(__name__)


def _get_vk_session():
    token = settings.VK_BOT_TOKEN
    if not token:
        raise ValueError("VK_BOT_TOKEN is not set")
    return vk_api.VkApi(token=token)


def send_vk_message(vk_id: int, message: str, keyboard: str = None) -> bool:
    """Send a message to a VK user on behalf of the community.

    Returns True on success, False on expected/recoverable errors.
    """
    try:
        session = _get_vk_session()
        vk = session.get_api()

        params = {
            'user_id': vk_id,
            'message': message,
            'random_id': random.randint(1, 2**31),
        }
        if keyboard:
            params['keyboard'] = keyboard

        vk.messages.send(**params)
        logger.info("VK message sent to user %s", vk_id)
        return True

    except vk_api.exceptions.ApiError as exc:
        error_code = exc.code
        # 901 — user has blocked the bot
        # 902 — sending is forbidden by privacy settings
        if error_code in (901, 902):
            logger.warning(
                "Cannot send VK message to %s: blocked or privacy (code %s)",
                vk_id, error_code,
            )
            return False
        logger.error("VK API error sending to %s: %s", vk_id, exc)
        raise

    except Exception:
        logger.exception("Unexpected error sending VK message to %s", vk_id)
        raise
