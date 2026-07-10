"""One-time OAuth handoff codes.

JWTs must never travel in redirect URLs: URLs leak to browser history, reverse
proxy logs and Referer headers. OAuth callbacks store tokens server-side for 90
seconds and redirect with an opaque one-time code instead.
"""
import secrets

from django.core.cache import cache
from rest_framework_simplejwt.tokens import RefreshToken

PREFIX = "oauth_exchange:"
TTL_SECONDS = 90


def create_oauth_exchange(user) -> str:
    refresh = RefreshToken.for_user(user)
    code = secrets.token_urlsafe(32)
    cache.set(
        PREFIX + code,
        {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user_id": user.pk,
        },
        TTL_SECONDS,
    )
    return code


def consume_oauth_exchange(code: str):
    if not code or len(code) > 128:
        return None
    key = PREFIX + code
    data = cache.get(key)
    if data is None:
        return None
    cache.delete(key)
    return data
