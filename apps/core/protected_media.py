"""Выдача файлов заказов и чатов с проверкой прав.

Раньше nginx отдавал их напрямую с диска: любой человек по ссылке
скачивал готовую работу — без оплаты, без входа, вообще без аккаунта.
Ссылки при этом лежали в ответах API, то есть искать их не приходилось.

Теперь каждый файл проходит проверку: кто просит и можно ли ему. Адреса
остались прежними, поэтому ничего в интерфейсе менять не нужно.
"""
import logging
import mimetypes
import os

from django.http import FileResponse, Http404, HttpResponseForbidden
from django.views.decorators.http import require_GET
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed
from apps.users.cookie_auth import CookieJWTAuthentication

logger = logging.getLogger("oko.media")


def _media_user(request):
    # Django's AuthenticationMiddleware does not read JWT cookies; DRF does.
    if request.user.is_authenticated:
        return request.user
    try:
        result = CookieJWTAuthentication().authenticate(request)
    except AuthenticationFailed:
        return request.user
    return result[0] if result else request.user


def _mark_received(order_file, user):
    if (order_file.order.client_id == user.id
            and order_file.file_type in ('solution', 'revision')):
        type(order_file).objects.filter(
            pk=order_file.pk, client_downloaded_at__isnull=True,
        ).update(client_downloaded_at=timezone.now())


def _deny(message):
    return HttpResponseForbidden(message)


def _serve(file_field, download_name=None):
    content_type, _ = mimetypes.guess_type(file_field.name)
    response = FileResponse(
        file_field.open("rb"), content_type=content_type or "application/octet-stream",
    )
    name = download_name or os.path.basename(file_field.name)
    response["Content-Disposition"] = f'inline; filename="{name}"'
    response["Cache-Control"] = "private, no-store"
    return response


@require_GET
def protected_order_media(request, path):
    """Файл заказа: задание, решение, доработка.

    Готовую работу заказчик получает только после полной оплаты — то же
    правило, что и на обычном скачивании через API. Иначе смысл резерва
    теряется: можно забрать работу и остаток не вносить.
    """
    from apps.orders.models import OrderFile
    from apps.wallet.policy import order_remaining_payment

    user = _media_user(request)
    if not user.is_authenticated:
        return _deny("Требуется вход.")

    order_file = OrderFile.objects.filter(file=f"orders/{path}").select_related(
        "order", "order__client",
    ).first()
    if order_file is None:
        raise Http404

    order = order_file.order
    is_participant = (
        user.is_staff
        or getattr(user, "role", None) in ("admin", "director", "arbitrator")
        or order.client_id == user.id
        or order.expert_id == user.id
    )
    if not is_participant:
        return _deny("Файл доступен только участникам заказа.")

    if order_file.file_type in ("solution", "revision") and order.client_id == user.id:
        try:
            remaining = order_remaining_payment(order)
        except Exception:  # noqa: BLE001
            logger.exception("Payment verification failed for protected media")
            return _deny("Не удалось проверить оплату. Повторите попытку позже.")
        if remaining > 0:
            return _deny(
                "Работа доступна после полной оплаты заказа. "
                f"Осталось внести {remaining} ₽."
            )

    response = _serve(order_file.file, order_file.filename())
    _mark_received(order_file, user)
    return response


@require_GET
def protected_chat_media(request, path):
    """Вложение из переписки — только её участникам.

    Работу часто присылают прямо в чат, поэтому здесь то же правило по
    оплате, если файл заодно числится решением по заказу.
    """
    from apps.chat.models import Message
    from apps.orders.models import OrderFile
    from apps.wallet.policy import order_remaining_payment

    user = _media_user(request)
    if not user.is_authenticated:
        return _deny("Требуется вход.")

    message = Message.objects.filter(file=f"chat/{path}").select_related("chat").first()
    if message is None:
        raise Http404

    chat = message.chat
    is_participant = (
        user.is_staff
        or getattr(user, "role", None) in ("admin", "director", "arbitrator")
        or chat.client_id == user.id
        or chat.expert_id == user.id
        or chat.participants.filter(pk=user.pk).exists()
    )
    if not is_participant:
        return _deny("Файл доступен только участникам переписки.")

    # Тот же файл может быть зарегистрирован как готовая работа по заказу —
    # тогда и правило оплаты то же, иначе работу забирали бы через чат.
    order_file = OrderFile.objects.filter(
        file=message.file.name, file_type__in=("solution", "revision"),
    ).select_related("order").first()
    if order_file is not None and order_file.order.client_id == user.id:
        try:
            remaining = order_remaining_payment(order_file.order)
        except Exception:  # noqa: BLE001
            logger.exception("Payment verification failed for protected media")
            return _deny("Не удалось проверить оплату. Повторите попытку позже.")
        if remaining > 0:
            return _deny(
                "Работа доступна после полной оплаты заказа. "
                f"Осталось внести {remaining} ₽."
            )

    response = _serve(message.file, message.file_name or None)
    if order_file is not None:
        _mark_received(order_file, user)
    return response
