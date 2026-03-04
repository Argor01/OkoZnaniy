from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import SupportChat, SupportMessage, Message, Chat
from .services import ContactDetectionService, ChatModerationService
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


@receiver(post_save, sender=Message)
def check_message_for_contacts(sender, instance, created, **kwargs):
    """
    Проверяет сообщения на наличие контактных данных
    """
    if not created or not instance.text:
        return
    
    # Пропускаем сообщения от админов
    if hasattr(instance.sender, 'role') and instance.sender.role in ['admin', 'director']:
        return
    
    # Пропускаем уже замороженные чаты
    if instance.chat.is_frozen:
        return
    
    # Пропускаем системные сообщения
    if instance.message_type == 'system':
        return
    
    # Проверяем сообщение на контакты
    detection_result = ContactDetectionService.detect_contacts(instance.text)
    
    if detection_result['has_contacts']:
        # Определяем тип нарушения
        contact_types = detection_result['contact_types']
        if len(contact_types) > 1:
            violation_type = 'multiple'
        else:
            violation_type = contact_types[0]
        
        # Замораживаем чат только при высоком или среднем риске
        if detection_result['risk_level'] in ['high', 'medium']:
            # Проверяем, нет ли уже нарушения для этого сообщения
            from .models import ContactViolationLog
            existing_violation = ContactViolationLog.objects.filter(
                chat=instance.chat,
                message=instance
            ).first()
            
            if existing_violation:
                return  # Уже обработано
            
            # Замораживаем чат
            ChatModerationService.freeze_chat(
                chat=instance.chat,
                violation_type=violation_type,
                detected_data=detection_result['detected_data'],
                message=instance
            )
            
            # Создаем запись о нарушении
            ContactViolationLog.objects.create(
                chat=instance.chat,
                user=instance.sender,
                message=instance,
                violation_type=violation_type,
                detected_data=detection_result['detected_data'],
                risk_level=detection_result['risk_level'],
                status='pending'
            )
            
            # Создаем тикет для админов и директоров
            from apps.admin_panel.models import SupportRequest
            
            # Формируем описание нарушения
            detected_contacts = []
            data = detection_result['detected_data']
            if 'phones' in data and data['phones']:
                detected_contacts.append(f"Телефоны: {', '.join(data['phones'])}")
            if 'emails' in data and data['emails']:
                detected_contacts.append(f"Email: {', '.join(data['emails'])}")
            if 'telegram' in data and data['telegram']:
                detected_contacts.append(f"Telegram: {', '.join(data['telegram'])}")
            if 'whatsapp' in data and data['whatsapp']:
                detected_contacts.append(f"WhatsApp: {', '.join(data['whatsapp'])}")
            if 'social' in data and data['social']:
                detected_contacts.append(f"Соц.сети: {', '.join(data['social'])}")
            if 'keywords' in data and data['keywords']:
                detected_contacts.append(f"Ключевые слова: {', '.join(data['keywords'])}")
            
            contacts_summary = '; '.join(detected_contacts) if detected_contacts else 'Обнаружены контактные данные'
            
            # Создаем тикет
            ticket_subject = f"🚨 Нарушение: обмен контактными данными в чате #{instance.chat.id}"
            ticket_description = f"""АВТОМАТИЧЕСКОЕ УВЕДОМЛЕНИЕ О НАРУШЕНИИ

📋 Детали нарушения:
• Чат: #{instance.chat.id}
• Пользователь: {instance.sender.username} ({instance.sender.first_name} {instance.sender.last_name})
• Тип нарушения: {violation_type}
• Уровень риска: {detection_result['risk_level']}

📞 Обнаруженные контактные данные:
{contacts_summary}

💬 Сообщение пользователя:
"{instance.text}"

⚠️ Действия системы:
• Чат автоматически заморожен
• Пользователю отправлено предупреждение
• Требуется решение администратора

🔗 Ссылка на чат: /admin/chat/{instance.chat.id}
"""
            
            support_ticket = SupportRequest.objects.create(
                user=instance.sender,
                subject=ticket_subject,
                description=ticket_description,
                status='open',
                priority='high',  # Высокий приоритет для нарушений
                auto_created=True,
                tags=['#нарушение', '#контакты', f'#{violation_type}']
            )
            
            print(f"Создан тикет #{support_ticket.ticket_number} для нарушения в чате #{instance.chat.id}")
            
            # Добавляем системное сообщение о заморозке
            from django.db import transaction
            
            # Используем transaction.on_commit чтобы избежать рекурсивного вызова сигнала
            def create_system_message():
                # Получаем или создаем системного пользователя
                from django.contrib.auth import get_user_model
                User = get_user_model()
                
                system_user, created = User.objects.get_or_create(
                    username='system',
                    defaults={
                        'email': 'system@platform.com',
                        'first_name': 'Система',
                        'last_name': 'Безопасности',
                        'is_active': False,  # Системный пользователь неактивен
                    }
                )
                
                Message.objects.create(
                    chat=instance.chat,
                    sender=system_user,  # От системного пользователя
                    text="ЧАТ ЗАМОРОЖЕН\n\nВаше сообщение содержит контактные данные. Обмен контактными данными запрещен правилами платформы.\n\nИдет проверка администратором\nОтправлять контактные данные категорически нельзя\n\nПожалуйста, дождитесь решения администратора.",
                    message_type='system'
                )
            
            transaction.on_commit(create_system_message)
