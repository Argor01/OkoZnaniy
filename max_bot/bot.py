"""MAX messenger registration/login bot (long polling).

Mirrors the Telegram auth flow: the site opens a deep link
https://max.ru/<bot>?start=auth_<authId>, the user taps Start, MAX delivers a
`bot_started` (or `/start` `message_created`) update with the payload, and we
create/find a User by max_id, issue JWT and stash it in the cache under
`max_auth_<authId>`. The frontend polls /api/users/max_auth_status/<authId>/.

MAX Bot API: base https://botapi.max.ru, token in Authorization header.
"""
import os
import time
import logging

import django
import requests

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.core.cache import cache  # noqa: E402
from apps.users.models import User  # noqa: E402
from rest_framework_simplejwt.tokens import RefreshToken  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("max_bot")

BASE_URL = "https://botapi.max.ru"
TOKEN = os.getenv("MAX_BOT_TOKEN", "").strip()
if not TOKEN:
    raise ValueError("MAX_BOT_TOKEN is not set!")

HEADERS = {"Authorization": TOKEN}
WEBSITE_URL = os.getenv("FRONTEND_URL", "https://okoznaniy.ru").rstrip("/")


def _api_get(path, params=None):
    resp = requests.get(f"{BASE_URL}{path}", headers=HEADERS, params=params or {}, timeout=60)
    resp.raise_for_status()
    return resp.json()


def send_message(user_id, text):
    """Send a plain text message to a MAX user."""
    try:
        requests.post(
            f"{BASE_URL}/messages",
            headers=HEADERS,
            params={"user_id": user_id},
            json={"text": text},
            timeout=30,
        )
    except requests.RequestException as e:
        logger.error(f"send_message failed: {e}")


def _make_username(first_name, last_name, max_id):
    parts = [p for p in (first_name, last_name) if p]
    base = "_".join(parts).strip() if parts else f"max_{max_id}"
    base = "".join(ch for ch in base if ch.isalnum() or ch in "_-").strip("_-") or f"max_{max_id}"
    username = base
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base}{counter}"
        counter += 1
    return username


def get_or_create_user(max_id, first_name, last_name):
    """Find a user by max_id or create a fresh client account."""
    try:
        user = User.objects.get(max_id=max_id)
        changed = False
        if first_name and user.first_name != first_name:
            user.first_name = first_name
            changed = True
        if last_name and user.last_name != last_name:
            user.last_name = last_name
            changed = True
        if changed:
            user.save(update_fields=["first_name", "last_name"])
        return user, False
    except User.DoesNotExist:
        user = User.objects.create(
            username=_make_username(first_name, last_name, max_id),
            email=f"max{max_id}@okoznaniy.ru",
            max_id=max_id,
            first_name=first_name or "",
            last_name=last_name or "",
            role="client",
            email_verified=True,
        )
        return user, True


def save_auth_data(auth_id, user):
    """Persist issued JWT for the frontend poller."""
    refresh = RefreshToken.for_user(user)
    data = {
        "authenticated": True,
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "first_name": user.first_name,
            "last_name": user.last_name,
        },
    }
    cache.set(f"max_auth_{auth_id}", data, 300)
    logger.info(f"MAX auth saved for auth_id={auth_id} user={user.username}")


def _extract_auth_id(raw):
    if not raw:
        return None
    raw = raw.strip()
    # payload may arrive as 'auth_<id>' or 'auth_<id>' inside '/start auth_<id>'
    for token in raw.split():
        if token.startswith("auth_"):
            return token[len("auth_"):]
    if raw.startswith("auth_"):
        return raw[len("auth_"):]
    return None


def handle_registration(user_id, first_name, last_name, auth_id):
    user, created = get_or_create_user(user_id, first_name, last_name)
    save_auth_data(auth_id, user)
    role_display = user.get_role_display() if hasattr(user, "get_role_display") else user.role
    send_message(
        user_id,
        "\U0001F389 Авторизация успешна!\n\n"
        f"Пользователь: {first_name} {last_name}\n"
        f"Роль: {role_display}\n\n"
        "Вернитесь на сайт OkoZnaniy — вход произойдёт автоматически через несколько секунд.",
    )


def handle_greeting(user_id, first_name):
    send_message(
        user_id,
        f"\U0001F44B Привет, {first_name}!\n\n"
        "Это бот платформы OkoZnaniy для регистрации и входа.\n"
        "Чтобы войти, нажмите кнопку «MAX» на странице входа сайта.",
    )


def process_update(update):
    utype = update.get("update_type") or update.get("type")

    if utype == "bot_started":
        user = update.get("user") or {}
        user_id = user.get("user_id") or user.get("id")
        first_name = (user.get("first_name") or "").strip()
        last_name = (user.get("last_name") or "").strip()
        auth_id = _extract_auth_id(update.get("payload"))
        if user_id is None:
            return
        if auth_id:
            handle_registration(user_id, first_name, last_name, auth_id)
        else:
            handle_greeting(user_id, first_name)
        return

    if utype == "message_created":
        message = update.get("message") or {}
        sender = message.get("sender") or {}
        body = message.get("body") or {}
        user_id = sender.get("user_id") or sender.get("id")
        first_name = (sender.get("first_name") or "").strip()
        last_name = (sender.get("last_name") or "").strip()
        text = (body.get("text") or "").strip()
        if user_id is None:
            return
        if text.startswith("/start"):
            auth_id = _extract_auth_id(text)
            if auth_id:
                handle_registration(user_id, first_name, last_name, auth_id)
            else:
                handle_greeting(user_id, first_name)


def main():
    logger.info("Starting MAX bot (long polling)...")
    try:
        me = _api_get("/me")
        logger.info(f"Authorized as MAX bot: {me.get('name')} (@{me.get('username')})")
    except Exception as e:
        logger.error(f"Failed to fetch bot info: {e}")

    marker = None
    while True:
        try:
            params = {"timeout": 30, "limit": 100}
            if marker is not None:
                params["marker"] = marker
            data = _api_get("/updates", params=params)
            for update in data.get("updates", []):
                try:
                    process_update(update)
                except Exception:
                    logger.exception("Failed to process update")
            marker = data.get("marker", marker)
        except requests.RequestException as e:
            logger.error(f"Polling error: {e}")
            time.sleep(3)
        except Exception:
            logger.exception("Unexpected error in poll loop")
            time.sleep(3)


if __name__ == "__main__":
    main()
