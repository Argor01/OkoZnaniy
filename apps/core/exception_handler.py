"""
Глобальный обработчик исключений для DRF.

Перехватывает ВСЕ необработанные исключения и возвращает JSON-ответ
вместо HTML 500. Логирует полный traceback для отладки.
"""

import logging

from django.db import IntegrityError, OperationalError
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404

from rest_framework import status
from rest_framework.exceptions import (
    APIException,
    ValidationError as DRFValidationError,
)
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger("oko.exception_handler")


def global_exception_handler(exc, context):
    """
    Кастомный exception handler для REST_FRAMEWORK.

    1. Сначала вызываем стандартный DRF handler (он обрабатывает
       APIException, Http404, PermissionDenied).
    2. Если стандартный handler вернул None — значит исключение
       необработанное (500). Ловим его здесь и возвращаем JSON.
    """
    response = drf_exception_handler(exc, context)

    if response is not None:
        return response

    view = context.get("view", None)
    request = context.get("request", None)
    view_name = getattr(view, "__class__", type(view)).__name__ if view else "unknown"
    user_info = ""
    if request and hasattr(request, "user") and request.user and request.user.is_authenticated:
        user_info = f" user={request.user.id}"

    if isinstance(exc, DjangoValidationError):
        logger.warning(
            "[%s] Django ValidationError%s: %s",
            view_name, user_info, exc.messages if hasattr(exc, "messages") else str(exc),
        )
        return Response(
            {"detail": exc.messages if hasattr(exc, "messages") else str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if isinstance(exc, IntegrityError):
        logger.error(
            "[%s] IntegrityError%s: %s",
            view_name, user_info, str(exc),
            exc_info=True,
        )
        return Response(
            {"detail": "Ошибка целостности данных. Возможно, объект уже существует."},
            status=status.HTTP_409_CONFLICT,
        )

    if isinstance(exc, OperationalError):
        logger.critical(
            "[%s] OperationalError (DB)%s: %s",
            view_name, user_info, str(exc),
            exc_info=True,
        )
        return Response(
            {"detail": "Временная ошибка базы данных. Пожалуйста, попробуйте снова."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if isinstance(exc, (ValueError, TypeError, KeyError, AttributeError)):
        logger.error(
            "[%s] %s%s: %s",
            view_name, type(exc).__name__, user_info, str(exc),
            exc_info=True,
        )
        return Response(
            {"detail": "Внутренняя ошибка обработки запроса."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    logger.error(
        "[%s] Unhandled %s%s: %s",
        view_name, type(exc).__name__, user_info, str(exc),
        exc_info=True,
    )
    return Response(
        {"detail": "Внутренняя ошибка сервера. Мы уже работаем над исправлением."},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
