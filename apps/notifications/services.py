from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta
from .models import Notification, NotificationType

User = get_user_model()

class NotificationService:
    @staticmethod
    def _order_ref(order):
        return f"№{order.id}"

    @staticmethod
    def create_notification(recipient, type, title, message, related_object_id=None, related_object_type=None, expires_in=None, data=None):
        notification = Notification.objects.create(
            recipient=recipient,
            type=type,
            title=title,
            message=message,
            related_object_id=related_object_id,
            related_object_type=related_object_type,
            data=data or {}
        )
        
        if expires_in:
            notification.expires_at = timezone.now() + expires_in
            notification.save(update_fields=['expires_at'])

        # WebSocket уведомление
        try:
            from apps.chat.websocket_utils import notify_new_notification
            notify_new_notification(
                recipient.id,
                {
                    'id': notification.id,
                    'type': notification.type,
                    'title': notification.title,
                    'message': notification.message,
                    'related_object_id': notification.related_object_id,
                    'related_object_type': notification.related_object_type,
                    'data': notification.data,
                    'is_read': False,
                    'created_at': notification.created_at.isoformat(),
                }
            )
        except Exception:
            pass
            
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
                title=f"Новый заказ: {NotificationService._order_ref(order)}",
                message=f"Появился новый заказ по предмету {order.subject}. Бюджет: {order.budget}",
                related_object_id=order.id,
                related_object_type='order',
                expires_in=timedelta(days=1)
            )

    @staticmethod
    def notify_new_bid(order, bid, expert, is_updated=False):
        NotificationService.create_notification(
            recipient=order.client,
            type=NotificationType.NEW_BID,
            title=(
                f"Отклик обновлён: {NotificationService._order_ref(order)}"
                if is_updated
                else f"Новый отклик на заказ: {NotificationService._order_ref(order)}"
            ),
            message=(
                f"Эксперт {expert.get_full_name() or expert.username} "
                f"{'обновил отклик' if is_updated else 'откликнулся на ваш заказ'}. "
                f"Ставка: {bid.amount} ₽"
            ),
            related_object_id=order.id,
            related_object_type='order'
        )

    @staticmethod
    def notify_order_taken(order):
        # Уведомляем клиента о том, что его заказ взят в работу
        NotificationService.create_notification(
            recipient=order.client,
            type=NotificationType.ORDER_TAKEN,
            title="Заказ принят в работу",
            message=f"Ваш заказ {NotificationService._order_ref(order)} принят в работу экспертом {order.expert}",
            related_object_id=order.id,
            related_object_type='order'
        )

    @staticmethod
    def notify_expert_assigned(order):
        """Уведомляет клиента о назначении эксперта на заказ"""
        NotificationService.create_notification(
            recipient=order.client,
            type=NotificationType.ORDER_ASSIGNED,
            title="Эксперт назначен на заказ",
            message=f"Эксперт {order.expert.username} взял ваш заказ {NotificationService._order_ref(order)} в работу",
            related_object_id=order.id,
            related_object_type='order',
            data={'expert_id': order.expert.id, 'order_id': order.id}
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
                    message=f"К заказу {NotificationService._order_ref(order_file.order)} прикреплен файл",
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
                    message=f"Новый комментарий к заказу {NotificationService._order_ref(order)}",
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
                message=f"Статус заказа {NotificationService._order_ref(order)} изменен с '{old_status}' на '{order.get_status_display()}'",
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
                message=f"До срока сдачи заказа {NotificationService._order_ref(order)} осталось {hours_left} часов",
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
                message=f"Получена оплата за заказ {NotificationService._order_ref(order)}",
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
                message=f"Заказ {NotificationService._order_ref(order)} успешно завершен",
                related_object_id=order.id,
                related_object_type='order'
            )
        # Просим клиента оставить отзыв о работе эксперта
        if order.client and order.expert_id:
            expert_name = order.expert.get_full_name() or order.expert.username
            NotificationService.create_notification(
                recipient=order.client,
                type=NotificationType.REVIEW_REQUEST,
                title="Оставьте отзыв о работе",
                message=(
                    f"Заказ {NotificationService._order_ref(order)} завершён. "
                    f"Поделитесь впечатлениями о работе эксперта {expert_name}."
                ),
                related_object_id=order.id,
                related_object_type='order',
                data={
                    'order_id': order.id,
                    'expert_id': order.expert_id,
                    'expert_username': getattr(order.expert, 'username', None),
                },
                expires_in=timedelta(days=30),
            )

    @staticmethod
    def notify_complaint_filed(case):
        """Уведомляем ответчика о поданной на него претензии."""
        if not case.defendant_id:
            return
        plaintiff_name = (
            case.plaintiff.get_full_name() or case.plaintiff.username
            if case.plaintiff_id else 'пользователь'
        )
        NotificationService.create_notification(
            recipient=case.defendant,
            type=NotificationType.COMPLAINT_FILED,
            title=f"На вас подана претензия {case.case_number}",
            message=(
                f"{plaintiff_name} подал претензию по заказу №{case.order_id}. "
                f"Откройте дело, чтобы дать пояснения."
            ),
            related_object_id=case.id,
            related_object_type='arbitration_case',
            data={
                'case_id': case.id,
                'case_number': case.case_number,
                'order_id': case.order_id,
            },
        )
        # Истцу — подтверждение, что претензия зарегистрирована.
        if case.plaintiff_id:
            NotificationService.create_notification(
                recipient=case.plaintiff,
                type=NotificationType.COMPLAINT_FILED,
                title=f"Претензия {case.case_number} зарегистрирована",
                message=(
                    f"Ваша претензия по заказу №{case.order_id} принята. "
                    f"Дождитесь ответа второй стороны и решения арбитра."
                ),
                related_object_id=case.id,
                related_object_type='arbitration_case',
                data={
                    'case_id': case.id,
                    'case_number': case.case_number,
                    'order_id': case.order_id,
                },
            )

    @staticmethod
    def notify_review_reply(review):
        """Клиент видит, что эксперт ответил на его отзыв."""
        recipient = getattr(review, 'client', None)
        if not recipient:
            return
        expert_name = review.expert.get_full_name() or review.expert.username
        NotificationService.create_notification(
            recipient=recipient,
            type=NotificationType.REVIEW_REPLY,
            title="Ответ на ваш отзыв",
            message=f"Эксперт {expert_name} ответил на ваш отзыв.",
            related_object_id=review.id,
            related_object_type='expert_review',
            data={
                'review_id': review.id,
                'expert_id': review.expert_id,
                'expert_username': getattr(review.expert, 'username', None),
            },
        )

    @staticmethod
    def notify_review_appeal(review):
        """Админы получают уведомление, что эксперт обжаловал отзыв."""
        from django.db.models import Q
        admins = User.objects.filter(is_active=True).filter(
            Q(role__in=['admin', 'arbitrator']) | Q(is_staff=True)
        ).distinct()
        for admin in admins:
            NotificationService.create_notification(
                recipient=admin,
                type=NotificationType.REVIEW_APPEAL,
                title=f"Обжалование отзыва #{review.id}",
                message=(
                    f"Эксперт {review.expert.username} обжаловал отзыв клиента "
                    f"{review.client.username} (оценка {review.rating}/5)."
                ),
                related_object_id=review.id,
                related_object_type='expert_review',
                data={
                    'review_id': review.id,
                    'expert_id': review.expert_id,
                    'client_id': review.client_id,
                    'rating': review.rating,
                },
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
            message=f"Вас приглашают выполнить заказ {NotificationService._order_ref(order)}. "
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
                   f"по заказу {NotificationService._order_ref(order)}",
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
                message=f"Клиент {dispute.order.client.username} создал спор по заказу {NotificationService._order_ref(dispute.order)}. Причина: {dispute.reason[:100]}...",
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
                message=f"Вам назначен спор по заказу {NotificationService._order_ref(dispute.order)}. Причина спора: {dispute.reason[:100]}...",
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
                message=f"Спор по заказу {NotificationService._order_ref(dispute.order)} решен арбитром. Решение: {dispute.result[:100]}...",
                related_object_id=dispute.id,
                related_object_type='dispute'
            )

    @staticmethod
    def notify_application_approved(application):
        """Уведомляет эксперта об одобрении анкеты"""
        NotificationService.create_notification(
            recipient=application.expert,
            type=NotificationType.APPLICATION_APPROVED,
            title="Анкета одобрена",
            message=f"Ваша анкета эксперта была одобрена! Теперь вы можете брать заказы в работу.",
            related_object_id=application.id,
            related_object_type='expert_application'
        )

    @staticmethod
    def notify_application_rejected(application, reason=None):
        """Уведомляет эксперта об отклонении анкеты"""
        reason = reason or application.rejection_reason or "Не указана"
        NotificationService.create_notification(
            recipient=application.expert,
            type=NotificationType.APPLICATION_REJECTED,
            title="Анкета отклонена",
            message=f"К сожалению, ваша анкета эксперта была отклонена. Причина: {reason}",
            related_object_id=application.id,
            related_object_type='expert_application'
        )

    @staticmethod
    def notify_application_rework(application, comment=None):
        """Уведомляет эксперта о необходимости доработки анкеты"""
        comment = comment or application.rejection_reason or "Требуется доработка"
        NotificationService.create_notification(
            recipient=application.expert,
            type=NotificationType.APPLICATION_REJECTED,  # Используем тот же тип
            title="Требуется доработка анкеты",
            message=f"Ваша анкета требует доработки. Комментарий: {comment}",
            related_object_id=application.id,
            related_object_type='expert_application'
        )

    @staticmethod
    def notify_application_restored(application):
        """Уведомляет эксперта о восстановлении анкеты на рассмотрение"""
        NotificationService.create_notification(
            recipient=application.expert,
            type=NotificationType.APPLICATION_APPROVED,  # Используем тот же тип
            title="Анкета восстановлена",
            message=f"Ваша анкета эксперта была восстановлена и отправлена на повторное рассмотрение.",
            related_object_id=application.id,
            related_object_type='expert_application'
        )

    @staticmethod
    def notify_new_answer(question, answer, expert):
        """Уведомляет автора вопроса о новом ответе"""
        if question.author:
            NotificationService.create_notification(
                recipient=question.author,
                type=NotificationType.NEW_ANSWER,
                title="Новый ответ на ваш вопрос",
                message=f"Эксперт {expert.get_full_name() or expert.username} ответил на ваш вопрос '{question.title[:50]}...'",
                related_object_id=question.id,
                related_object_type='question',
                data={'answer_id': answer.id}
            )

    @staticmethod
    def notify_document_uploaded(document):
        """Уведомляет администраторов о загрузке нового документа экспертом"""
        admins = User.objects.filter(is_staff=True)
        for admin in admins:
            NotificationService.create_notification(
                recipient=admin,
                type=NotificationType.DOCUMENT_VERIFIED,
                title="Загружен новый документ эксперта",
                message=f"Эксперт {document.expert.username} загрузил документ '{document.title}' для проверки",
                related_object_id=document.id,
                related_object_type='expert_document'
            )

    @staticmethod
    def bulk_notify_experts(experts, type, title, message, related_object_id=None, related_object_type=None, data=None):
        """Массовое создание уведомлений для нескольких экспертов"""
        notifications = []
        for expert in experts:
            notification = Notification(
                recipient=expert,
                type=type,
                title=title,
                message=message,
                related_object_id=related_object_id,
                related_object_type=related_object_type,
                data=data or {}
            )
            notifications.append(notification)
        
        # Массовое создание для оптимизации
        Notification.objects.bulk_create(notifications)
        return len(notifications)

class EmailService:
    """Сервис для отправки email"""
    
    @staticmethod
    def send_registration_instructions(email):
        """Отправляет инструкцию по регистрации и доступные заказы"""
        from django.core.mail import EmailMultiAlternatives
        from django.template.loader import render_to_string
        
        subject = "Инструкция по регистрации на OkoZnaniy"
        
        # Текстовая версия письма
        text_content = f"""
Здравствуйте!

Спасибо за интерес к нашей платформе OkoZnaniy!

📋 Инструкция по регистрации:

1. Перейдите на сайт {settings.FRONTEND_URL}/register
2. Заполните форму регистрации (email, пароль, имя)
3. Подтвердите email (письмо придет на указанный адрес)
4. Выберите роль: Эксперт или Клиент
5. Заполните профиль

Для экспертов:
- Укажите специализацию и предметы
- Загрузите документы об образовании
- Дождитесь проверки анкеты (обычно 1-2 дня)
- После одобрения начинайте брать заказы!

💼 Первые доступные заказы:

На платформе уже есть заказы по различным предметам:
- Математика, физика, химия
- Программирование и IT
- Экономика и бизнес
- Гуманитарные науки
- И многое другое!

Средняя стоимость заказа: от 500 до 5000 рублей
Срок выполнения: от 1 дня до 2 недель

🎯 Преимущества работы с нами:

✓ Прозрачная система оплаты
✓ Защита от мошенничества
✓ Удобный интерфейс
✓ Поддержка 24/7
✓ Быстрый вывод средств

Если у вас есть вопросы, напишите нам в поддержку через сайт или на {settings.DEFAULT_FROM_EMAIL}

С уважением,
Команда OkoZnaniy
{settings.FRONTEND_URL}
        """
        
        try:
            # HTML версия письма
            html_content = render_to_string('emails/registration_instructions.html', {
                'frontend_url': settings.FRONTEND_URL,
                'support_email': settings.DEFAULT_FROM_EMAIL,
            })
            
            # Создаем письмо с HTML и текстовой версией
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[email]
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send()
            
            return True
        except Exception as e:
            print(f"Ошибка отправки email: {e}")
            # Fallback на простую отправку
            try:
                send_mail(
                    subject=subject,
                    message=text_content,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    fail_silently=False,
                )
                return True
            except Exception as e2:
                print(f"Ошибка fallback отправки email: {e2}")
                return False

    @staticmethod
    def send_partner_instructions(email):
        """Отправляет информацию о партнерской программе"""
        from django.core.mail import EmailMultiAlternatives
        from django.template.loader import render_to_string
        
        subject = "Партнерская программа OkoZnaniy — зарабатывайте до 30%"
        
        # Текстовая версия письма
        text_content = f"""
Здравствуйте!

Спасибо за интерес к партнерской программе OkoZnaniy!

💰 ЗАРАБАТЫВАЙТЕ ДО 30% С КАЖДОГО ЗАКАЗА!

📋 Как стать партнером:

1. Зарегистрируйтесь на платформе {settings.FRONTEND_URL}/register
2. Перейдите в раздел "Партнерская программа"
3. Получите уникальную реферальную ссылку
4. Делитесь ссылкой с вашей аудиторией
5. Получайте вознаграждение за каждого привлеченного пользователя

🎯 Преимущества:

✓ Высокие комиссии — до 30% от заказов
✓ Пожизненные отчисления от привлеченных пользователей
✓ Прозрачная статистика в личном кабинете
✓ Быстрый вывод средств
✓ Маркетинговые материалы для продвижения
✓ Персональный менеджер для крупных партнеров
✓ Бонусы за достижение целей

💼 Кому подходит:

- Блогерам и инфлюенсерам
- Владельцам образовательных сайтов
- Студенческим сообществам
- Преподавателям и репетиторам
- Всем, кто хочет дополнительный доход

📊 Примеры заработка:

• 10 привлеченных клиентов → ~5,000 ₽/месяц
• 50 привлеченных клиентов → ~25,000 ₽/месяц
• 100+ привлеченных клиентов → 50,000+ ₽/месяц

🎁 СПЕЦИАЛЬНОЕ ПРЕДЛОЖЕНИЕ:
Первые 100 партнеров получают повышенную комиссию 35% на первый месяц!

Готовы начать? Зарегистрируйтесь прямо сейчас:
{settings.FRONTEND_URL}/partner-program

Если у вас есть вопросы, напишите нам на {settings.DEFAULT_FROM_EMAIL}

С уважением,
Команда OkoZnaniy
{settings.FRONTEND_URL}
        """
        
        try:
            # HTML версия письма
            html_content = render_to_string('emails/partner_instructions.html', {
                'frontend_url': settings.FRONTEND_URL,
                'support_email': settings.DEFAULT_FROM_EMAIL,
            })
            
            # Создаем письмо с HTML и текстовой версией
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[email]
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send()
            
            return True
        except Exception as e:
            print(f"Ошибка отправки партнерского email: {e}")
            # Fallback на простую отправку
            try:
                send_mail(
                    subject=subject,
                    message=text_content,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    fail_silently=False,
                )
                return True
            except Exception as e2:
                print(f"Ошибка fallback отправки партнерского email: {e2}")
                return False

    @staticmethod
    def notify_application_submitted(application):
        """Уведомляет пользователя о том, что анкета подана и находится на рассмотрении"""
        NotificationService.create_notification(
            recipient=application.expert,
            type=NotificationType.APPLICATION_SUBMITTED,
            title="Анкета эксперта подана",
            message="Ваша анкета успешно подана и находится на рассмотрении. Мы уведомим вас о результате проверки.",
            related_object_id=application.id,
            related_object_type='application'
        )
