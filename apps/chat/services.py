"""
Chat services for moderation and order conversation helpers.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone

from apps.orders.models import Order

from .models import Chat, Message


VIOLATION_TYPE_LABELS = {
    "phone": "номер телефона",
    "email": "email-адрес",
    "telegram": "Telegram",
    "whatsapp": "WhatsApp",
    "social": "социальные сети",
    "keywords": "подозрительные ключевые слова",
    "multiple": "несколько типов контактов",
}

CLOSED_ORDER_STATUSES = {"completed", "cancelled", "canceled", "done"}


def violation_type_label(violation_type: str) -> str:
    return VIOLATION_TYPE_LABELS.get(violation_type, violation_type)


def is_locked_direct_chat(chat: Chat) -> bool:
    """A direct chat is locked when active order chats exist for the same pair."""
    if not chat or getattr(chat, "order_id", None):
        return False

    client_id = getattr(chat, "client_id", None)
    expert_id = getattr(chat, "expert_id", None)
    if not client_id or not expert_id:
        return False

    return (
        Chat.objects.filter(
            order__isnull=False,
            client_id=client_id,
            expert_id=expert_id,
        )
        .exclude(order__status__in=CLOSED_ORDER_STATUSES)
        .exists()
    )


def readable_messages_for_chat(chat: Chat):
    queryset = chat.messages.all()
    if is_locked_direct_chat(chat):
        queryset = queryset.exclude(message_type="system")
    return queryset


def unread_messages_for_user(chat: Chat, user):
    return readable_messages_for_chat(chat).filter(is_read=False).exclude(sender=user)


class ContactDetectionService:
    """Detects contact data in chat messages."""

    PHONE_PATTERNS = [
        r"\+7\s*\(?(\d{3})\)?\s*(\d{3})\s*-?\s*(\d{2})\s*-?\s*(\d{2})",
        r"8\s*\(?(\d{3})\)?\s*(\d{3})\s*-?\s*(\d{2})\s*-?\s*(\d{2})",
        r"\b(\d{3})\s*-?\s*(\d{3})\s*-?\s*(\d{2})\s*-?\s*(\d{2})\b",
        r"\b(\d{11})\b",
    ]
    EMAIL_PATTERN = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
    TELEGRAM_PATTERNS = [
        r"@[A-Za-z0-9_]{5,32}",
        r"t\.me/[A-Za-z0-9_]{5,32}",
        r"telegram\.me/[A-Za-z0-9_]{5,32}",
        r"tg://resolve\?domain=[A-Za-z0-9_]{5,32}",
    ]
    WHATSAPP_PATTERNS = [
        r"wa\.me/\d+",
        r"whatsapp\.com/send\?phone=\d+",
    ]
    SOCIAL_PATTERNS = [
        r"vk\.com/[A-Za-z0-9_.]{1,50}",
        r"instagram\.com/[A-Za-z0-9_.]{1,30}",
        r"facebook\.com/[A-Za-z0-9_.]{1,50}",
    ]
    CONTACT_KEYWORDS = [
        "мой номер",
        "мой телефон",
        "моя почта",
        "мой email",
        "мой тг",
        "мой телеграм",
        "свяжись со мной",
        "напиши мне",
        "позвони мне",
        "мои контакты",
        "личные сообщения",
        "в лс",
        "в личку",
        "скинь номер",
        "дай номер",
        "whatsapp",
        "viber",
        "skype",
        "discord",
    ]

    @classmethod
    def detect_contacts(cls, text: str) -> Dict[str, Any]:
        text_lower = text.lower()
        detected_data: Dict[str, Any] = {}
        contact_types: List[str] = []

        phones = cls._detect_phones(text)
        if phones:
            detected_data["phones"] = phones
            contact_types.append("phone")

        emails = cls._detect_emails(text)
        if emails:
            detected_data["emails"] = emails
            contact_types.append("email")

        telegram_contacts = cls._detect_telegram(text)
        if telegram_contacts:
            detected_data["telegram"] = telegram_contacts
            contact_types.append("telegram")

        whatsapp_contacts = cls._detect_whatsapp(text)
        if whatsapp_contacts:
            detected_data["whatsapp"] = whatsapp_contacts
            contact_types.append("whatsapp")

        social_contacts = cls._detect_social(text)
        if social_contacts:
            detected_data["social"] = social_contacts
            contact_types.append("social")

        keywords_found = cls._detect_keywords(text_lower)
        if keywords_found:
            detected_data["keywords"] = keywords_found
            contact_types.append("keywords")

        risk_level = cls._calculate_risk_level(contact_types)
        return {
            "has_contacts": len(contact_types) > 0,
            "contact_types": contact_types,
            "detected_data": detected_data,
            "risk_level": risk_level,
        }

    @classmethod
    def _detect_phones(cls, text: str) -> List[str]:
        phones: List[str] = []
        for pattern in cls.PHONE_PATTERNS:
            matches = re.findall(pattern, text)
            for match in matches:
                phone = "".join(match) if isinstance(match, tuple) else match
                if len(phone) >= 10:
                    phones.append(phone)
        return list(set(phones))

    @classmethod
    def _detect_emails(cls, text: str) -> List[str]:
        return re.findall(cls.EMAIL_PATTERN, text)

    @classmethod
    def _detect_telegram(cls, text: str) -> List[str]:
        telegram_contacts: List[str] = []
        for pattern in cls.TELEGRAM_PATTERNS:
            telegram_contacts.extend(re.findall(pattern, text, re.IGNORECASE))
        return list(set(telegram_contacts))

    @classmethod
    def _detect_whatsapp(cls, text: str) -> List[str]:
        whatsapp_contacts: List[str] = []
        for pattern in cls.WHATSAPP_PATTERNS:
            whatsapp_contacts.extend(re.findall(pattern, text, re.IGNORECASE))
        return list(set(whatsapp_contacts))

    @classmethod
    def _detect_social(cls, text: str) -> List[str]:
        social_contacts: List[str] = []
        for pattern in cls.SOCIAL_PATTERNS:
            social_contacts.extend(re.findall(pattern, text, re.IGNORECASE))
        return list(set(social_contacts))

    @classmethod
    def _detect_keywords(cls, text: str) -> List[str]:
        return [keyword for keyword in cls.CONTACT_KEYWORDS if keyword in text]

    @classmethod
    def _calculate_risk_level(cls, contact_types: List[str]) -> str:
        if not contact_types:
            return "low"
        if any(ct in {"phone", "email", "telegram", "whatsapp"} for ct in contact_types):
            return "high"
        if any(ct in {"social", "keywords"} for ct in contact_types):
            return "medium"
        return "low"


class ChatModerationService:
    """Moderates chats after contact exchange detection."""

    @staticmethod
    def freeze_chat(chat, violation_type: str, detected_data: Dict[str, Any], message=None, risk_level: str = "medium"):
        from .models import ContactViolationLog

        violation_label = violation_type_label(violation_type)
        chat.freeze(f"Обнаружен обмен контактами: {violation_label}")

        violation = ContactViolationLog.objects.create(
            chat=chat,
            user=message.sender if message else None,
            message=message,
            violation_type=violation_type,
            detected_data=detected_data,
            risk_level=risk_level,
            status="pending",
        )

        if message and message.sender:
            user = message.sender
            user.is_banned_for_contacts = True
            user.contact_ban_reason = f"Обнаружен обмен контактами: {violation_label}"
            user.contact_ban_date = timezone.now()
            user.contact_violations_count += 1
            user.banned_by = None
            user.save()
            if hasattr(user, "freeze_contact_scope"):
                user.freeze_contact_scope(user.contact_ban_reason)

        ChatModerationService._notify_admins_about_violation(violation)
        ChatModerationService._freeze_expert_scope_if_needed(chat, message, violation)
        return violation

    @staticmethod
    def _notify_admins_about_violation(violation):
        from django.contrib.auth import get_user_model
        from apps.notifications.services import NotificationService

        User = get_user_model()
        admins = User.objects.filter(role="admin")
        for admin in admins:
            try:
                NotificationService.create_notification(
                    recipient=admin,
                    type="chat_violation",
                    title="Обнаружен обмен контактами в чате",
                    message=f"Чат #{violation.chat.id} заморожен. Тип нарушения: {violation.get_violation_type_display()}",
                    related_object_id=violation.id,
                    related_object_type="contact_violation",
                )
            except Exception:
                import logging
                logging.getLogger("oko.safe_notify").error("Notification failed in _notify_admins", exc_info=True)

    @staticmethod
    def _freeze_expert_scope_if_needed(chat, message, violation):
        expert = ChatModerationService._get_violation_expert(chat, message)
        if not expert:
            return

        reason = f"Эксперт {expert.get_full_name() or expert.username} нарушил правила платформы. Обмен контактными данными запрещен."
        from .models import Chat as ChatModel
        from apps.notifications.models import NotificationType
        from apps.notifications.services import NotificationService

        chats = ChatModel.objects.filter(expert=expert, is_frozen=False)
        for expert_chat in chats:
            expert_chat.freeze(reason)

        active_orders = Order.objects.filter(
            expert=expert,
            status__in=["in_progress", "review", "revision"],
            is_frozen=False,
        )
        for order in active_orders:
            order.freeze(reason)

        for order in active_orders:
            if not order.client_id:
                continue
            try:
                NotificationService.create_notification(
                    recipient=order.client,
                    type=NotificationType.EXPERT_VIOLATION,
                    title="Эксперт нарушил правила платформы",
                    message=f"Эксперт по заказу #{order.id} временно отстранен. Сроки заказа заморожены до решения администратора.",
                    related_object_id=order.id,
                    related_object_type="order",
                    data={"order_id": order.id, "expert_id": expert.id},
                )
            except Exception:
                import logging
                logging.getLogger("oko.safe_notify").error("Notification failed in _freeze_expert_scope", exc_info=True)

    @staticmethod
    def _get_violation_expert(chat, message):
        if message:
            return message.sender if getattr(message.sender, "role", None) == "expert" else None
        expert = getattr(chat, "expert", None)
        if expert and getattr(expert, "role", None) == "expert":
            return expert
        order = getattr(chat, "order", None)
        if order and getattr(order, "expert", None):
            return order.expert
        return None

    @staticmethod
    def unfreeze_chat(chat, admin_user, decision: str):
        chat.unfreeze()

        violation = chat.contact_violations.filter(status="pending").first()
        if violation:
            violation.status = "approved"
            violation.admin_decision = decision
            violation.reviewed_by = admin_user
            violation.reviewed_at = timezone.now()
            violation.save()

            if violation.user:
                user = violation.user
                if hasattr(user, "clear_contact_ban"):
                    user.clear_contact_ban(unfreeze_related=True)
                else:
                    user.is_banned_for_contacts = False
                    user.contact_ban_reason = None
                    user.save()

        ChatModerationService._unfreeze_expert_scope_if_possible(chat, violation)
        return violation

    @staticmethod
    def _post_unfreeze_system_message(chat):
        if is_locked_direct_chat(chat):
            return

        from django.contrib.auth import get_user_model

        User = get_user_model()
        system_user, _ = User.objects.get_or_create(
            username="system",
            defaults={
                "email": "system@platform.com",
                "first_name": "Система",
                "last_name": "Безопасности",
                "is_active": False,
            },
        )
        Message.objects.create(
            chat=chat,
            sender=system_user,
            text=(
                "ЧАТ РАЗМОРОЖЕН\n\n"
                "Администратор завершил проверку. "
                "Обмен контактными данными запрещён правилами платформы — "
                "повторные нарушения приведут к блокировке."
            ),
            message_type="system",
        )

    @staticmethod
    def _unfreeze_expert_scope_if_possible(chat, violation):
        expert = ChatModerationService._get_violation_expert(chat, None)
        if violation and getattr(violation.user, "role", None) == "expert":
            expert = violation.user
        if not expert:
            return

        from .models import Chat as ChatModel, ContactViolationLog

        if ContactViolationLog.objects.filter(user=expert, status="pending").exists():
            return

        chats = ChatModel.objects.filter(expert=expert, is_frozen=True)
        for expert_chat in chats:
            expert_chat.unfreeze()

        orders = Order.objects.filter(expert=expert, is_frozen=True)
        for order in orders:
            order.unfreeze()


def is_order_context_title(context_title: Optional[str]) -> bool:
    value = (context_title or "").strip().lower()
    return value.startswith("заказ #") or "заказ из ленты #" in value


def resolve_direct_chat_users(user_a, user_b):
    role_a = getattr(user_a, "role", None)
    role_b = getattr(user_b, "role", None)

    if role_a == "client" and role_b == "expert":
        return user_a, user_b
    if role_a == "expert" and role_b == "client":
        return user_b, user_a
    if int(user_a.id) <= int(user_b.id):
        return user_a, user_b
    return user_b, user_a


def get_or_create_direct_chat(user_a, user_b, *, context_title: Optional[str] = None) -> Chat:
    client_user, expert_user = resolve_direct_chat_users(user_a, user_b)
    normalized_context = str(context_title).strip()[:255] or None if context_title is not None else None

    chat = (
        Chat.objects.filter(order__isnull=True)
        .filter(
            Q(client_id=client_user.id, expert_id=expert_user.id)
            | Q(client_id=expert_user.id, expert_id=client_user.id)
        )
        .order_by("id")
        .first()
    )

    if not chat:
        chat = (
            Chat.objects.filter(order__isnull=True, participants=user_a)
            .filter(participants=user_b)
            .order_by("id")
            .first()
        )

    if not chat:
        try:
            with transaction.atomic():
                chat = Chat.objects.create(
                    order=None,
                    client=client_user,
                    expert=expert_user,
                    context_title=normalized_context if normalized_context and not is_order_context_title(normalized_context) else None,
                )
        except IntegrityError:
            chat = (
                Chat.objects.filter(order__isnull=True)
                .filter(
                    Q(client_id=client_user.id, expert_id=expert_user.id)
                    | Q(client_id=expert_user.id, expert_id=client_user.id)
                )
                .order_by("id")
                .first()
            )
            if not chat:
                raise

    updated_fields = []
    if chat.client_id != client_user.id:
        chat.client = client_user
        updated_fields.append("client")
    if chat.expert_id != expert_user.id:
        chat.expert = expert_user
        updated_fields.append("expert")
    if normalized_context and not is_order_context_title(normalized_context) and not chat.context_title:
        chat.context_title = normalized_context
        updated_fields.append("context_title")
    if updated_fields:
        chat.save(update_fields=updated_fields)

    chat.participants.add(user_a, user_b)
    chat.hidden_for_users.remove(user_a, user_b)
    return chat


def get_or_create_order_chat(order: Order, *, client_user=None, expert_user=None) -> Chat:
    client_user = client_user or order.client
    expert_user = expert_user or order.expert
    if not client_user or not expert_user:
        raise ValueError("order chat requires both client and expert")

    try:
        with transaction.atomic():
            chat, _created = Chat.objects.get_or_create(
                order=order,
                client=client_user,
                expert=expert_user,
            )
    except IntegrityError:
        chat = Chat.objects.filter(order=order).order_by("id").first()
        if not chat:
            raise

    updated_fields = []
    if chat.client_id != client_user.id:
        chat.client = client_user
        updated_fields.append("client")
    if chat.expert_id != expert_user.id:
        chat.expert = expert_user
        updated_fields.append("expert")
    if updated_fields:
        chat.save(update_fields=updated_fields)

    chat.participants.add(client_user, expert_user)
    chat.hidden_for_users.remove(client_user, expert_user)
    return chat


def build_order_offer_data(order: Order) -> dict:
    return {
        "status": "accepted",
        "order_id": order.id,
        "title": order.title or f"Заказ #{order.id}",
        "description": order.description or "",
        "cost": str(order.budget) if order.budget is not None else "",
        "deadline": order.deadline.isoformat() if order.deadline else None,
        "subject_id": order.subject_id,
        "subject": order.custom_subject or (order.subject.name if order.subject else None),
        "work_type_id": order.work_type_id,
        "work_type": order.custom_work_type or (order.work_type.name if order.work_type else None),
        "expert_id": order.expert_id,
        "expert_username": order.expert.username if order.expert else None,
        "client_id": order.client_id,
        "accepted_at": timezone.now().isoformat(),
    }


def ensure_order_chat_started(
    order: Order,
    *,
    sender=None,
    text: Optional[str] = None,
) -> Tuple[Chat, Chat, Message]:
    if not order.client_id or not order.expert_id:
        raise ValueError("order chat bootstrap requires assigned client and expert")

    direct_chat = get_or_create_direct_chat(order.client, order.expert)
    order_chat = get_or_create_order_chat(order, client_user=order.client, expert_user=order.expert)

    existing_message = (
        Message.objects.filter(
            chat=order_chat,
            message_type="offer",
            offer_data__status="accepted",
            offer_data__order_id=order.id,
        )
        .order_by("id")
        .first()
    )
    if existing_message:
        return direct_chat, order_chat, existing_message

    message = Message(
        chat=order_chat,
        sender=sender or order.client,
        text=text or f"Заказ #{order.id} принят в работу",
        message_type="offer",
        offer_data=build_order_offer_data(order),
    )
    message.full_clean()
    message.save()
    return direct_chat, order_chat, message
