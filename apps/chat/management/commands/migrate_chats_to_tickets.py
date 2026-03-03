"""
Команда для миграции существующих чатов поддержки в тикеты
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.chat.models import SupportChat
from apps.admin_panel.models import SupportRequest, SupportMessage as AdminSupportMessage


class Command(BaseCommand):
    help = 'Мигрирует существующие чаты поддержки в тикеты'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Показать что будет сделано без выполнения изменений',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('РЕЖИМ ТЕСТИРОВАНИЯ - изменения не будут сохранены'))
        
        # Получаем все чаты поддержки без связанных тикетов
        chats_without_tickets = SupportChat.objects.filter(
            support_request__isnull=True
        ).select_related('client').prefetch_related('support_messages__sender')
        
        total_chats = chats_without_tickets.count()
        self.stdout.write(f'Найдено {total_chats} чатов без тикетов')
        
        if total_chats == 0:
            self.stdout.write(self.style.SUCCESS('Все чаты уже имеют связанные тикеты'))
            return
        
        created_tickets = 0
        created_messages = 0
        
        with transaction.atomic():
            for chat in chats_without_tickets:
                # Получаем первое сообщение для описания
                first_message = chat.support_messages.first()
                description = first_message.text if first_message else chat.subject
                
                if not dry_run:
                    # Создаем тикет
                    ticket = SupportRequest.objects.create(
                        user=chat.client,
                        support_chat=chat,
                        subject=chat.subject,
                        description=description,
                        status='open' if chat.status == 'open' else 'completed',
                        priority=chat.priority,
                        auto_created=True
                    )
                    created_tickets += 1
                    
                    # Копируем все текстовые сообщения из чата в тикет
                    for msg in chat.support_messages.filter(message_type='text'):
                        AdminSupportMessage.objects.create(
                            request=ticket,
                            sender=msg.sender,
                            message=msg.text,
                            is_admin=(msg.sender.role == 'admin')
                        )
                        created_messages += 1
                    
                    self.stdout.write(f'✓ Создан тикет #{ticket.id} для чата #{chat.id}')
                else:
                    self.stdout.write(f'[ТЕСТ] Будет создан тикет для чата #{chat.id}: {chat.subject}')
                    message_count = chat.support_messages.filter(message_type='text').count()
                    self.stdout.write(f'  - Будет скопировано {message_count} сообщений')
        
        if not dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Миграция завершена:\n'
                    f'- Создано тикетов: {created_tickets}\n'
                    f'- Скопировано сообщений: {created_messages}'
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f'Тестовый режим завершен:\n'
                    f'- Будет создано тикетов: {total_chats}\n'
                    f'- Запустите без --dry-run для выполнения миграции'
                )
            )