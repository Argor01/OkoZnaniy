"""
Безопасная обёртка для NotificationService.

Любой вызов NotificationService через safe_notify() гарантированно
НЕ сломает основной запрос, даже если уведомление не отправится.
"""

import logging
import functools

logger = logging.getLogger("oko.safe_notify")


def safe_notify(func):
    """
    Декоратор: оборачивает вызов NotificationService в try/except.

    Использование:
        from apps.core.safe_notify import safe_notify

        @safe_notify
        def _send_notification():
            NotificationService.create_notification(...)
        _send_notification()

    Или как context manager / прямой вызов:
        safe_call(NotificationService.create_notification, user=..., ...)
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logger.error(
                "Notification failed in %s: %s",
                func.__qualname__, str(e),
                exc_info=True,
            )
            return None
    return wrapper


def safe_call(func, *args, **kwargs):
    """
    Безопасный вызов любой функции. Если функция падает — логируем и возвращаем None.

    Использование:
        from apps.core.safe_notify import safe_call
        safe_call(NotificationService.create_notification, user=user, ...)
    """
    try:
        return func(*args, **kwargs)
    except Exception as e:
        logger.error(
            "safe_call failed for %s.%s: %s",
            getattr(func, "__module__", "?"),
            getattr(func, "__qualname__", getattr(func, "__name__", "?")),
            str(e),
            exc_info=True,
        )
        return None
