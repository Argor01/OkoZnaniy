"""
Middleware для логирования всех HTTP 500 ошибок.

Ловит исключения, которые не были перехвачены DRF exception handler
(например, в не-DRF views, middleware chain, или при рендеринге шаблонов).
"""

import logging
import traceback

logger = logging.getLogger("oko.error_middleware")


class ErrorLoggingMiddleware:
    """
    Логирует все необработанные исключения с полным traceback.
    Также логирует все 5xx ответы (даже если исключение было поймано).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            response = self.get_response(request)
        except Exception as exc:
            user_id = getattr(request.user, "id", "anon") if hasattr(request, "user") else "unknown"
            logger.critical(
                "[ErrorMiddleware] Unhandled exception: %s %s (user=%s): %s\n%s",
                request.method,
                request.path,
                user_id,
                str(exc),
                traceback.format_exc(),
            )
            raise

        if response.status_code >= 500:
            user_id = getattr(request.user, "id", "anon") if hasattr(request, "user") else "unknown"
            logger.error(
                "[ErrorMiddleware] %d response: %s %s (user=%s)",
                response.status_code,
                request.method,
                request.path,
                user_id,
            )

        return response

    def process_exception(self, request, exception):
        user_id = getattr(request.user, "id", "anon") if hasattr(request, "user") else "unknown"
        logger.error(
            "[ErrorMiddleware] process_exception: %s %s (user=%s): %s",
            request.method,
            request.path,
            user_id,
            str(exception),
            exc_info=True,
        )
        return None
