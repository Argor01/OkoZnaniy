# Примеры использования NotificationService

## Основное использование

```python
from apps.notifications.services import NotificationService
from apps.notifications.models import NotificationType

# Создание простого уведомления
NotificationService.create_notification(
    recipient=user,
    notification_type=NotificationType.NEW_ORDER,
    title='Новый заказ',
    message='У вас новый заказ на выполнение'
)
```

## Примеры для разных событий

### 1. Новый заказ

```python
# В views.py при создании заказа
from apps.notifications.services import NotificationService

def create_order(request):
    order = Order.objects.create(...)
    
    # Уведомляем подходящих экспертов
    NotificationService.notify_new_order(order)
    
    return Response(...)
```

### 2. Заказ принят экспертом

```python
# В views.py когда эксперт берет заказ
def take_order(request, order_id):
    order = Order.objects.get(id=order_id)
    order.expert = request.user
    order.status = 'in_progress'
    order.save()
    
    # Уведомляем клиента
    NotificationService.notify_order_taken(order)
    
    return Response(...)
```

### 3. Новое сообщение в чате

```python
# В apps/chat/views.py
from apps.notifications.services import NotificationService

def send_message(request, chat_id):
    message = Message.objects.create(
        chat=chat,
        sender=request.user,
        text=request.data['text']
    )
    
    # Уведомляем другого участника
    other_user = chat.participants.exclude(id=request.user.id).first()
    if other_user:
        NotificationService.create_notification(
            recipient=other_user,
            notification_type='new_comment',
            title=f'Новое сообщение от {request.user.username}',
            message=message.text[:100],
            related_object_id=chat.id,
            related_object_type='chat'
        )
```

### 4. Изменение статуса заказа

```python
# В signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=Order)
def order_status_changed(sender, instance, created, **kwargs):
    if not created and 'status' in instance.get_dirty_fields():
        old_status = instance.get_dirty_fields()['status']
        NotificationService.notify_status_changed(instance, old_status)
```

### 5. Загружен файл

```python
# В views.py при загрузке файла
def upload_file(request, order_id):
    order_file = OrderFile.objects.create(
        order=order,
        file=request.FILES['file'],
        uploaded_by=request.user
    )
    
    # Уведомляем участников
    NotificationService.notify_file_uploaded(order_file)
```

### 6. Приближается дедлайн

```python
# В tasks.py (Celery task)
from celery import shared_task
from datetime import datetime, timedelta

@shared_task
def check_deadlines():
    # Заказы с дедлайном через 24 часа
    tomorrow = datetime.now() + timedelta(hours=24)
    orders = Order.objects.filter(
        deadline__lte=tomorrow,
        deadline__gte=datetime.now(),
        status='in_progress'
    )
    
    for order in orders:
        hours_left = (order.deadline - datetime.now()).total_seconds() / 3600
        NotificationService.notify_deadline_soon(order, int(hours_left))
```

### 7. Документ проверен

```python
# В admin.py или views.py
def verify_document(request, document_id):
    document = ExpertDocument.objects.get(id=document_id)
    document.is_verified = True
    document.save()
    
    NotificationService.notify_document_verified(document)
```

### 8. Специализация подтверждена

```python
# В admin action
def approve_specializations(modeladmin, request, queryset):
    for specialization in queryset:
        specialization.is_verified = True
        specialization.save()
        NotificationService.notify_specialization_verified(specialization)
```

### 9. Получен отзыв

```python
# В views.py при создании отзыва
def create_review(request):
    review = Review.objects.create(
        expert=expert,
        client=request.user,
        rating=request.data['rating'],
        comment=request.data['comment']
    )
    
    NotificationService.notify_review_received(review)
```

### 10. Получена оплата

```python
# В webhook обработчике платежей
def payment_webhook(request):
    payment = Payment.objects.get(id=payment_id)
    if payment.status == 'completed':
        NotificationService.notify_payment_received(payment.order)
```

### 11. Заказ завершен

```python
# В views.py при завершении заказа
def complete_order(request, order_id):
    order = Order.objects.get(id=order_id)
    order.status = 'completed'
    order.save()
    
    NotificationService.notify_order_completed(order)
```

### 12. Анкета эксперта одобрена/отклонена

```python
# В admin action
def approve_applications(modeladmin, request, queryset):
    for application in queryset:
        application.status = 'approved'
        application.save()
        NotificationService.notify_application_approved(application)

def reject_applications(modeladmin, request, queryset):
    for application in queryset:
        application.status = 'rejected'
        application.save()
        NotificationService.notify_application_rejected(application)
```

## Массовые уведомления

```python
# Уведомить всех экспертов определенной специализации
experts = User.objects.filter(
    role='expert',
    specializations__subject='Математика',
    specializations__is_verified=True
).distinct()

NotificationService.bulk_notify_experts(
    experts=experts,
    type=NotificationType.NEW_ORDER,
    title='Новый заказ по математике',
    message='Появился новый заказ, который может вас заинтересовать',
    related_object_id=order.id,
    related_object_type='order'
)
```

## Уведомления с истечением срока

```python
from datetime import timedelta

# Уведомление действительно 24 часа
NotificationService.create_notification(
    recipient=expert,
    notification_type=NotificationType.NEW_ORDER,
    title='Срочный заказ',
    message='Требуется выполнить срочный заказ',
    related_object_id=order.id,
    related_object_type='order',
    expires_in=timedelta(hours=24)
)
```

## Уведомления с дополнительными данными

```python
# Сохранение дополнительной информации в JSON
NotificationService.create_notification(
    recipient=user,
    notification_type=NotificationType.ORDER_ASSIGNED,
    title='Эксперт назначен',
    message=f'Эксперт {expert.username} взял ваш заказ',
    related_object_id=order.id,
    related_object_type='order',
    data={
        'expert_id': expert.id,
        'expert_name': expert.get_full_name(),
        'order_title': order.title,
        'deadline': order.deadline.isoformat()
    }
)
```

## Интеграция с сигналами Django

```python
# apps/orders/signals.py
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import Order
from apps.notifications.services import NotificationService

@receiver(post_save, sender=Order)
def order_created(sender, instance, created, **kwargs):
    if created:
        # Новый заказ создан
        NotificationService.notify_new_order(instance)

@receiver(pre_save, sender=Order)
def order_status_changing(sender, instance, **kwargs):
    if instance.pk:
        old_instance = Order.objects.get(pk=instance.pk)
        if old_instance.status != instance.status:
            # Статус изменился
            NotificationService.notify_status_changed(instance, old_instance.status)
```

## Интеграция с Celery задачами

```python
# apps/notifications/tasks.py
from celery import shared_task
from datetime import datetime, timedelta
from apps.orders.models import Order
from .services import NotificationService

@shared_task
def send_deadline_reminders():
    """Отправка напоминаний о приближающихся дедлайнах"""
    # За 24 часа
    tomorrow = datetime.now() + timedelta(hours=24)
    orders_24h = Order.objects.filter(
        deadline__lte=tomorrow,
        deadline__gte=datetime.now(),
        status='in_progress'
    )
    
    for order in orders_24h:
        NotificationService.notify_deadline_soon(order, 24)
    
    # За 1 час
    one_hour = datetime.now() + timedelta(hours=1)
    orders_1h = Order.objects.filter(
        deadline__lte=one_hour,
        deadline__gte=datetime.now(),
        status='in_progress'
    )
    
    for order in orders_1h:
        NotificationService.notify_deadline_soon(order, 1)

@shared_task
def cleanup_expired_notifications():
    """Удаление истекших уведомлений"""
    from .models import Notification
    expired = Notification.objects.filter(
        expires_at__lt=datetime.now()
    )
    count = expired.count()
    expired.delete()
    return f"Удалено {count} истекших уведомлений"
```

## Настройка периодических задач

```python
# config/celery.py
from celery.schedules import crontab

app.conf.beat_schedule = {
    'send-deadline-reminders': {
        'task': 'apps.notifications.tasks.send_deadline_reminders',
        'schedule': crontab(minute='*/30'),  # Каждые 30 минут
    },
    'cleanup-expired-notifications': {
        'task': 'apps.notifications.tasks.cleanup_expired_notifications',
        'schedule': crontab(hour=3, minute=0),  # Каждый день в 3:00
    },
}
```

## Проверка уведомлений в тестах

```python
# tests.py
from django.test import TestCase
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService

class NotificationTests(TestCase):
    def test_order_notification_created(self):
        order = Order.objects.create(...)
        NotificationService.notify_new_order(order)
        
        # Проверяем, что уведомление создано
        notifications = Notification.objects.filter(
            type='new_order',
            related_object_id=order.id
        )
        self.assertTrue(notifications.exists())
    
    def test_notification_marked_as_read(self):
        notification = Notification.objects.create(...)
        notification.mark_as_read()
        
        notification.refresh_from_db()
        self.assertTrue(notification.is_read)
```

## Best Practices

1. **Всегда используйте NotificationService** вместо прямого создания Notification
2. **Указывайте related_object** для связи с объектами
3. **Используйте expires_in** для временных уведомлений
4. **Добавляйте data** для дополнительной информации
5. **Используйте сигналы** для автоматических уведомлений
6. **Используйте Celery** для отложенных уведомлений
7. **Тестируйте** создание уведомлений
