"""Move JWTs from API response bodies into Secure HttpOnly cookies."""
from django.conf import settings

from .cookie_auth import ACCESS_COOKIE, REFRESH_COOKIE


class AuthCookieMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        data = getattr(response, "data", None)
        if not isinstance(data, dict):
            return response

        access = data.pop("access", None)
        refresh = data.pop("refresh", None)
        secure = not settings.DEBUG
        common = {
            "secure": secure,
            "httponly": True,
            "samesite": "Strict",
        }
        if access:
            response.set_cookie(
                ACCESS_COOKIE, access, max_age=60 * 60,
                path="/api/", **common,
            )
        if refresh:
            response.set_cookie(
                REFRESH_COOKIE, refresh, max_age=24 * 60 * 60,
                path="/api/users/", **common,
            )
        return response
