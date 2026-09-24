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
            # Lax, а не Strict: со Strict браузер не отдаёт куку при переходе
            # с чужого сайта — а именно так человек возвращается с платёжной
            # формы эквайера. От подделки запросов Lax защищает так же: на
            # межсайтовый POST куку он по-прежнему не отдаёт.
            "samesite": "Lax",
        }
        if access:
            response.set_cookie(
                ACCESS_COOKIE, access, max_age=60 * 60,
                # path="/" (не "/api/"): cookie должен уходить и на WebSocket-
                # хендшейк /ws/..., иначе real-time не авторизуется у cookie-сессий.
                path="/", **common,
            )
        if refresh:
            response.set_cookie(
                # Сутки означали, что раз в день вход слетал у всех.
                REFRESH_COOKIE, refresh, max_age=30 * 24 * 60 * 60,
                path="/api/users/", **common,
            )
        return response
