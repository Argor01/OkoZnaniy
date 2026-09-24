"""Source-based delivery with durable, bounded-retry outbox."""
import logging
import re
from datetime import timedelta
import requests
from django.conf import settings
from django.core.mail import send_mail, get_connection
from django.db import transaction
from django.utils import timezone
from .models import ExternalDelivery
logger = logging.getLogger(__name__)

def channel_for(user):
    source = (user.registration_source or '').lower()
    if source in ('email', 'google'):
        return 'email'
    if source in ('max', 'vk', 'telegram'):
        return source
    linked = [s for s in ('max', 'vk', 'telegram') if getattr(user, s + '_id', None)]
    if len(linked) == 1:
        return linked[0]
    if not linked and user.email and user.email_verified:
        return 'email'
    return 'unknown'

def skip_reason(user, channel):
    if not user.is_active:
        return 'inactive_recipient'
    if channel not in settings.EXTERNAL_NOTIFICATION_CHANNELS:
        return 'channel_disabled'
    if channel == 'email':
        email = (user.email or '').strip()
        if not email or re.match(r'^(max|tg|telegram|vk)\d+@', email, re.I):
            return 'missing_real_email'
    elif not getattr(user, channel + '_id', None):
        return 'missing_channel_id'
    if channel == 'vk' and not user.vk_notifications_enabled:
        return 'recipient_opted_out'
    return ''

def publish(delivery_id):
    from .tasks import deliver_external_notification
    try:
        deliver_external_notification.delay(delivery_id)
    except Exception:
        logger.warning('External notification enqueue deferred: delivery=%s', delivery_id)

def enqueue(user, event_key, title, body, path='/notifications'):
    channel = channel_for(user)
    reason = skip_reason(user, channel)
    with transaction.atomic():
        row, created = ExternalDelivery.objects.get_or_create(event_key=event_key, defaults={
            'recipient': user, 'channel': channel, 'title': title[:255], 'body': body,
            'path': path, 'state': 'skipped' if reason else 'pending', 'last_error': reason,
        })
        if created and not reason:
            transaction.on_commit(lambda: publish(row.pk))
    return row

def enqueue_notification(notification):
    path = f'/orders/{notification.related_object_id}' if notification.related_object_type == 'order' and notification.related_object_id else '/notifications'
    return enqueue(notification.recipient, f'notification:{notification.pk}', notification.title, notification.message, path)

def enqueue_chat_message(message_id):
    from apps.chat.models import Message
    from django.contrib.auth import get_user_model
    msg = Message.objects.select_related('chat', 'sender').filter(pk=message_id).first()
    if not msg or msg.message_type == 'system' or msg.chat.is_frozen:
        return 0
    chat = msg.chat
    ids = set(chat.participants.values_list('id', flat=True))
    ids.update([chat.client_id, chat.expert_id]); ids.discard(None); ids.discard(msg.sender_id)
    sender_name = msg.sender.get_full_name() or msg.sender.username or 'Пользователь'
    for user in get_user_model().objects.filter(pk__in=ids):
        enqueue(user, f'chat:{msg.pk}:{user.pk}', 'Новое сообщение на Око Знаний',
                f'{sender_name} написал вам. Откройте переписку, чтобы прочитать сообщение.',
                f'/messages?chatId={chat.pk}')
    return len(ids)

class DeliveryRejected(Exception):
    pass

def send_delivery(row):
    user = row.recipient
    path = row.path if row.path.startswith('/') and not row.path.startswith('//') else '/notifications'
    text = f'{row.title}\n\n{row.body}\n\n{settings.FRONTEND_URL.rstrip("/")}{path}'
    if row.channel == 'email':
        sent = send_mail(row.title.replace('\n', ' ').replace('\r', ' '), text,
                         settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False,
                         connection=get_connection(timeout=15))
        if sent != 1:
            raise DeliveryRejected('email_not_accepted')
    elif row.channel == 'max':
        response = requests.post('https://botapi.max.ru/messages',
            headers={'Authorization': settings.MAX_BOT_TOKEN}, params={'user_id': user.max_id},
            json={'text': text[:3900]}, timeout=15)
        if response.status_code in (400, 401, 403, 404):
            raise DeliveryRejected('max_rejected_' + str(response.status_code))
        response.raise_for_status()
        result = response.json()
        if result.get('error') or result.get('code') or not result.get('message'):
            raise DeliveryRejected('max_response_not_accepted')
    else:
        raise DeliveryRejected('channel_disabled')

def deliver(delivery_id):
    now = timezone.now()
    with transaction.atomic():
        row = ExternalDelivery.objects.select_for_update().select_related('recipient').filter(pk=delivery_id).first()
        if not row or row.state not in ('pending', 'processing') or row.next_attempt > now:
            return 'ignored'
        if row.attempts >= 5:
            row.state = 'failed'; row.save(update_fields=['state', 'updated_at']); return 'failed'
        reason = skip_reason(row.recipient, row.channel)
        if reason:
            row.state = 'skipped'; row.last_error = reason
            row.save(update_fields=['state', 'last_error', 'updated_at']); return 'skipped'
        row.state = 'processing'; row.attempts += 1
        row.next_attempt = now + timedelta(minutes=5)
        row.save(update_fields=['state', 'attempts', 'next_attempt', 'updated_at'])
    try:
        send_delivery(row)
    except Exception as exc:
        permanent = isinstance(exc, DeliveryRejected)
        state = 'failed' if permanent or row.attempts >= 5 else 'pending'
        ExternalDelivery.objects.filter(pk=row.pk).update(state=state,
            last_error=str(exc)[:120] if permanent else type(exc).__name__,
            next_attempt=timezone.now()+timedelta(seconds=min(3600, 60 * 2 ** row.attempts)),
            updated_at=timezone.now())
        logger.warning('External notification delivery=%s channel=%s state=%s',row.pk,row.channel,state)
        return state
    ExternalDelivery.objects.filter(pk=row.pk).update(state='sent',last_error='',updated_at=timezone.now())
    return 'sent'

def dispatch_pending():
    ids = list(ExternalDelivery.objects.filter(state__in=['pending','processing'],
                next_attempt__lte=timezone.now()).order_by('next_attempt').values_list('pk',flat=True)[:100])
    for pk in ids:
        publish(pk)
    return len(ids)
