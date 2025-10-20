import os
from celery import Celery
from celery.schedules import crontab

# Установка переменной окружения для настроек проекта
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('config')

# Загрузка настроек из Django settings
app.config_from_object('django.conf:settings', namespace='CELERY')

# Автоматическое обнаружение и регистрация задач из приложений
app.autodiscover_tasks()

# Настройка периодических задач
app.conf.beat_schedule = {
    'update-expert-statistics': {
        'task': 'apps.experts.tasks.update_all_experts_statistics',
        'schedule': crontab(hour='*/6'),  # Каждые 6 часов
    },
    'check-order-deadlines': {
        'task': 'apps.notifications.tasks.check_deadlines',
        'schedule': crontab(minute='*/30'),  # Каждые 30 минут
    },
    'cleanup-old-notifications': {
        'task': 'apps.notifications.tasks.cleanup_old_notifications',
        'schedule': crontab(hour='3', minute='0'),  # Каждый день в 3:00
    },
}

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}') 