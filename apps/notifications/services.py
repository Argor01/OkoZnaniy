from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from .models import Notification, NotificationType

User = get_user_model()

class NotificationService:
    @staticmethod
    def create_notification(recipient, type, title, message, related_object_id=None, related_object_type=None, expires_in=None):
        notification = Notification.objects.create(
            recipient=recipient,
            type=type,
            title=title,
            message=message,
            related_object_id=related_object_id,
            related_object_type=related_object_type
        )
        
        if expires_in:
            notification.expires_at = timezone.now() + expires_in
            notification.save(update_fields=['expires_at'])
            
        return notification

    @staticmethod
    def notify_new_order(order):
        # Уведомляем подходящих экспертов о новом заказе
        experts = User.objects.filter(
            role='expert',
            specializations__subject=order.subject,
            specializations__is_verified=True
        ).distinct()
        
        for expert in experts:
            NotificationService.create_notification(
                recipient=expert,
                type=NotificationType.NEW_ORDER,
                title=f"Новый заказ: {order.title or 'Без названия'}",
                message=f"Появился новый заказ по предмету {order.subject}. Бюджет: {order.budget}",
                related_object_id=order.id,
                related_object_type='order',
                expires_in=timedelta(days=1)
            )

    @staticmethod
    def notify_order_taken(order):
        # Уведомляем клиента о том, что его заказ взят в работу
        NotificationService.create_notification(
            recipient=order.client,
            type=NotificationType.ORDER_TAKEN,
            title="Заказ принят в работу",
            message=f"Ваш заказ '{order.title or 'Без названия'}' принят в работу экспертом {order.expert}",
            related_object_id=order.id,
            related_object_type='order'
        )

    @staticmethod
    def notify_file_uploaded(order_file):
        # Уведомляем заинтересованных пользователей о новом файле
        recipients = [order_file.order.client, order_file.order.expert]
        for recipient in filter(None, recipients):  # filter(None) уберет None значения
            if recipient != order_file.uploaded_by:
                NotificationService.create_notification(
                    recipient=recipient,
                    type=NotificationType.FILE_UPLOADED,
                    title="Загружен новый файл",
                    message=f"К заказу '{order_file.order.title or 'Без названия'}' добавлен новый файл",
                    related_object_id=order_file.order.id,
                    related_object_type='order'
                )

    @staticmethod
    def notify_new_comment(comment):
        # Уведомляем участников обсуждения о новом комментарии
        order = comment.order
        recipients = [order.client, order.expert]
        for recipient in filter(None, recipients):
            if recipient != comment.author:
                NotificationService.create_notification(
                    recipient=recipient,
                    type=NotificationType.NEW_COMMENT,
                    title="Новый комментарий",
                    message=f"Новый комментарий к заказу '{order.title or 'Без названия'}'",
                    related_object_id=order.id,
                    related_object_type='order'
                )

    @staticmethod
    def notify_status_changed(order, old_status):
        # Уведомляем участников о смене статуса заказа
        recipients = [order.client, order.expert]
        for recipient in filter(None, recipients):
            NotificationService.create_notification(
                recipient=recipient,
                type=NotificationType.STATUS_CHANGED,
                title="Изменен статус заказа",
                message=f"Статус заказа '{order.title or 'Без названия'}' изменен с '{old_status}' на '{order.get_status_display()}'",
                related_object_id=order.id,
                related_object_type='order'
            )

    @staticmethod
    def notify_deadline_soon(order, hours_left):
        # Уведомляем о приближающемся дедлайне
        recipients = [order.client, order.expert]
        for recipient in filter(None, recipients):
            NotificationService.create_notification(
                recipient=recipient,
                type=NotificationType.DEADLINE_SOON,
                title="Приближается срок сдачи",
                message=f"До срока сдачи заказа '{order.title or 'Без названия'}' осталось {hours_left} часов",
                related_object_id=order.id,
                related_object_type='order',
                expires_in=timedelta(hours=hours_left)
            )

    @staticmethod
    def notify_document_verified(document):
        NotificationService.create_notification(
            recipient=document.expert,
            type=NotificationType.DOCUMENT_VERIFIED,
            title="Документ проверен",
            message=f"Ваш документ '{document.title}' был проверен и подтвержден",
            related_object_id=document.id,
            related_object_type='document'
        )

    @staticmethod
    def notify_specialization_verified(specialization):
        NotificationService.create_notification(
            recipient=specialization.expert,
            type=NotificationType.SPECIALIZATION_VERIFIED,
            title="Специализация подтверждена",
            message=f"Ваша специализация по предмету '{specialization.subject}' была подтверждена",
            related_object_id=specialization.id,
            related_object_type='specialization'
        )

    @staticmethod
    def notify_review_received(review):
        NotificationService.create_notification(
            recipient=review.expert,
            type=NotificationType.REVIEW_RECEIVED,
            title="Получен новый отзыв",
            message=f"Вы получили новый отзыв с оценкой {review.rating}/5",
            related_object_id=review.id,
            related_object_type='review'
        )

    @staticmethod
    def notify_payment_received(order):
        if order.expert:
            NotificationService.create_notification(
                recipient=order.expert,
                type=NotificationType.PAYMENT_RECEIVED,
                title="Получена оплата",
                message=f"Получена оплата за заказ '{order.title or 'Без названия'}'",
                related_object_id=order.id,
                related_object_type='order'
            )

    @staticmethod
    def notify_order_completed(order):
        recipients = [order.client, order.expert]
        for recipient in filter(None, recipients):
            NotificationService.create_notification(
                recipient=recipient,
                type=NotificationType.ORDER_COMPLETED,
                title="Заказ завершен",
                message=f"Заказ '{order.title or 'Без названия'}' успешно завершен",
                related_object_id=order.id,
                related_object_type='order'
            )

    @staticmethod
    def notify_new_contact(contact):
        """Уведомляет администраторов о новом обращении через форму обратной связи"""
        admins = User.objects.filter(is_staff=True)
        for admin in admins:
            NotificationService.create_notification(
                recipient=admin,
                type=NotificationType.NEW_CONTACT,
                title="Новое обращение",
                message=f"Получено новое обращение от {contact.name} ({contact.email})",
                related_object_id=contact.id,
                related_object_type='contact',
                expires_in=timedelta(days=7)  # Уведомление будет актуально неделю
            )

    @staticmethod
    def notify_new_rating(rating):
        """Уведомление эксперта о новом рейтинге"""
        Notification.objects.create(
            recipient=rating.expert,
            type=NotificationType.NEW_RATING,
            title="Новый отзыв",
            message=f"Клиент {rating.client.username} оставил вам отзыв с оценкой {rating.rating}/5",
            related_object_id=rating.id,
            related_object_type='expert_rating'
        )

    @staticmethod
    def notify_rating_milestone(expert, milestone):
        """Уведомление о достижении определенного рейтинга"""
        Notification.objects.create(
            recipient=expert,
            type=NotificationType.RATING_MILESTONE,
            title="Поздравляем с достижением!",
            message=f"Ваш рейтинг достиг {milestone}! Продолжайте в том же духе!",
            related_object_id=expert.id,
            related_object_type='expert'
        )

    @staticmethod
    def notify_expert_invitation(order, expert):
        """Уведомляет эксперта о приглашении выполнить заказ"""
        Notification.objects.create(
            recipient=expert,
            type=NotificationType.EXPERT_INVITATION,
            title="Приглашение выполнить заказ",
            message=f"Вас приглашают выполнить заказ '{order.title or 'Без названия'}'. "
                   f"Бюджет: {order.budget}₽, срок: {order.deadline.strftime('%d.%m.%Y')}",
            related_object_id=order.id,
            related_object_type='order',
            expires_at=timezone.now() + timedelta(days=1)  # Приглашение действительно 24 часа
        )

    @staticmethod
    def notify_expert_response(order, expert, accepted):
        """Уведомляет клиента о решении эксперта"""
        status = "принял" if accepted else "отклонил"
        Notification.objects.create(
            recipient=order.client,
            type=NotificationType.EXPERT_RESPONSE,
            title=f"Ответ на приглашение",
            message=f"Эксперт {expert.username} {status} ваше приглашение "
                   f"по заказу '{order.title or 'Без названия'}'",
            related_object_id=order.id,
            related_object_type='order'
        )

    @staticmethod
    def notify_dispute_created(dispute):
        """Уведомляет администраторов о создании нового спора"""
        admins = User.objects.filter(role='admin')
        for admin in admins:
            NotificationService.create_notification(
                recipient=admin,
                type=NotificationType.NEW_CONTACT,  # Используем существующий тип
                title="Создан новый спор",
                message=f"Клиент {dispute.order.client.username} создал спор по заказу '{dispute.order.title or 'Без названия'}'. Причина: {dispute.reason[:100]}...",
                related_object_id=dispute.id,
                related_object_type='dispute',
                expires_in=timedelta(days=7)
            )

    @staticmethod
    def notify_arbitrator_assigned(dispute):
        """Уведомляет арбитра о назначении на спор"""
        if dispute.arbitrator:
            NotificationService.create_notification(
                recipient=dispute.arbitrator,
                type=NotificationType.NEW_ORDER,  # Используем существующий тип
                title="Назначен на рассмотрение спора",
                message=f"Вам назначен спор по заказу '{dispute.order.title or 'Без названия'}'. Причина спора: {dispute.reason[:100]}...",
                related_object_id=dispute.id,
                related_object_type='dispute',
                expires_in=timedelta(days=3)
            )

    @staticmethod
    def notify_dispute_resolved(dispute):
        """Уведомляет участников о решении спора"""
        recipients = [dispute.order.client, dispute.order.expert]
        for recipient in filter(None, recipients):
            NotificationService.create_notification(
                recipient=recipient,
                type=NotificationType.ORDER_COMPLETED,  # Используем существующий тип
                title="Спор решен",
                message=f"Спор по заказу '{dispute.order.title or 'Без названия'}' решен арбитром. Решение: {dispute.result[:100]}...",
                related_object_id=dispute.id,
                related_object_type='dispute'
            ) 