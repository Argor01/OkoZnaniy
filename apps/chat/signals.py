from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import SupportChat, SupportMessage
from apps.admin_panel.models import SupportRequest, SupportMessage as AdminSupportMessage


@receiver(post_save, sender=SupportChat)
def create_support_request_from_chat(sender, instance, created, **kwargs):
    """
    Автоматически создает тикет (SupportRequest) при создании чата техподдержки
    """
    if created:
        # Получаем первое сообщение из чата для описания
        first_message = instance.support_messages.first()
        description = first_message.text if first_message else instance.subject
        
        # Создаем тикет
        support_request = SupportRequest.objects.create(
            user=instance.client,
            support_chat=instance,
            subject=instance.subject,
            description=description,
            status='open',
            priority=instance.priority,
            auto_created=True
        )
        
        # Если есть первое сообщение, добавляем его в тикет
        if first_message:
            AdminSupportMessage.objects.create(
                request=support_request,
                sender=instance.client,
                message=first_message.text,
                is_admin=False
            )


@receiver(post_save, sender=SupportMessage)
def sync_message_to_support_request(sender, instance, created, **kwargs):
    """
    Синхронизирует сообщения из чата в соответствующий тикет
    """
    if created and instance.message_type == 'text':
        # Находим соответствующий SupportRequest
        # Ищем по клиенту и теме чата
        support_request = SupportRequest.objects.filter(
            user=instance.chat.client,
            subject=instance.chat.subject,
            status__in=['open', 'in_progress']
        ).first()
        
        if support_request:
            # Добавляем сообщение в тикет
            AdminSupportMessage.objects.create(
                request=support_request,
                sender=instance.sender,
                message=instance.text,
                is_admin=(instance.sender.role == 'admin')
            )
