"""Durable email outbox for new partners; never email passwords."""
from django.db import transaction
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from apps.notifications.models import ExternalDelivery
from apps.notifications.delivery import publish


def enqueue_partner_welcome(user):
    if user.role != 'partner' or not user.is_active:
        return None
    try:
        validate_email(user.email or '')
    except ValidationError:
        return None
    with transaction.atomic():
        row, created = ExternalDelivery.objects.get_or_create(
            event_key=f'partner-welcome:{user.pk}',
            defaults={'recipient': user, 'channel': 'email', 'title': 'Ваш партнёрский кабинет Око Знаний',
                      'body': f'Здравствуйте!\n\nВаш партнёрский аккаунт создан.\nЛогин: {user.username}\n'
                              'Для установки пароля откройте страницу входа, нажмите «Забыли пароль?» '
                              'и укажите эту почту. Никому не передавайте код из письма.',
                      'path': '/login', 'state': 'pending'})
        if created:
            transaction.on_commit(lambda: publish(row.pk))
    return row
