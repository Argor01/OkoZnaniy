#!/usr/bin/env python
"""
Скрипт для тестирования уведомлений о статусе заявки эксперта
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.experts.models import ExpertApplication
from apps.notifications.services import NotificationService
from apps.notifications.models import Notification

User = get_user_model()

def test_application_notifications():
    print("🧪 Тестирование уведомлений о статусе заявки эксперта\n")
    
    # Находим пользователя с заявкой
    applications = ExpertApplication.objects.filter(status='pending').first()
    
    if not applications:
        print("❌ Не найдено заявок в статусе 'pending'")
        print("Создайте тестовую заявку через интерфейс")
        return
    
    expert = applications.expert
    print(f"✅ Найдена заявка эксперта: {expert.username}")
    print(f"   Статус: {applications.get_status_display()}")
    print(f"   ФИО: {applications.full_name}")
    print(f"   Опыт: {applications.work_experience_years} лет\n")
    
    # Проверяем существующие уведомления
    existing_notifications = Notification.objects.filter(
        recipient=expert,
        type__in=['application_approved', 'application_rejected']
    )
    print(f"📬 Существующих уведомлений о заявке: {existing_notifications.count()}\n")
    
    # Тестируем создание уведомления об одобрении
    print("📤 Создаём тестовое уведомление об одобрении...")
    NotificationService.notify_application_approved(applications)
    
    # Проверяем создание
    new_notification = Notification.objects.filter(
        recipient=expert,
        type='application_approved'
    ).order_by('-created_at').first()
    
    if new_notification:
        print(f"✅ Уведомление создано успешно!")
        print(f"   ID: {new_notification.id}")
        print(f"   Заголовок: {new_notification.title}")
        print(f"   Сообщение: {new_notification.message}")
        print(f"   Прочитано: {new_notification.is_read}")
        print(f"   Создано: {new_notification.created_at}")
    else:
        print("❌ Уведомление не создано")
    
    print("\n" + "="*60)
    print("✅ Тест завершён!")
    print("="*60)
    print("\nДля проверки на фронтенде:")
    print(f"1. Войдите как пользователь: {expert.username}")
    print("2. Откройте модальное окно уведомлений")
    print("3. Проверьте наличие уведомления об одобрении заявки")

if __name__ == '__main__':
    test_application_notifications()
