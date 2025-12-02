from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.experts.models import ExpertApplication

User = get_user_model()


class Command(BaseCommand):
    help = 'Синхронизирует роли пользователей с одобренными анкетами экспертов'

    def handle(self, *args, **options):
        # Находим все одобренные анкеты
        approved_applications = ExpertApplication.objects.filter(status='approved').select_related('expert')
        
        updated_count = 0
        for application in approved_applications:
            expert = application.expert
            if expert.role != 'expert':
                self.stdout.write(f'Обновляем роль для пользователя {expert.email} (ID: {expert.id})')
                expert.role = 'expert'
                expert.save(update_fields=['role'])
                updated_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'Успешно обновлено ролей: {updated_count}'))
