from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from .models import DiscountRule
from apps.users.models import User
from django.db.models import Count, Sum, Q

class DiscountNotificationService:
    @staticmethod
    def notify_about_available_discounts(user):
        """Уведомляет пользователя о доступных скидках"""
        available_discounts = []
        
        # Получаем все активные скидки
        active_discounts = DiscountRule.objects.filter(
            is_active=True,
            valid_from__lte=timezone.now()
        ).filter(
            Q(valid_until__isnull=True) | Q(valid_until__gt=timezone.now())
        )
        
        for discount in active_discounts:
            if discount.is_valid_for_user(user):
                available_discounts.append(discount)
        
        if available_discounts:
            # Формируем контекст для шаблона
            context = {
                'user': user,
                'discounts': available_discounts
            }
            
            # Рендерим HTML и текстовую версии письма
            html_message = render_to_string('catalog/emails/available_discounts.html', context)
            text_message = render_to_string('catalog/emails/available_discounts.txt', context)
            
            # Отправляем уведомление
            send_mail(
                subject='Доступные скидки на заказы',
                message=text_message,
                html_message=html_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True
            )
    
    @staticmethod
    def notify_about_upcoming_discounts(user):
        """Уведомляет пользователя о скидках, которые скоро станут доступны"""
        # Получаем статистику пользователя
        user_stats = User.objects.filter(id=user.id).annotate(
            completed_orders=Count('client_orders', filter=Q(client_orders__status='completed')),
            total_spent=Sum('client_orders__budget', filter=Q(client_orders__status='completed'))
        ).first()
        
        # Находим скидки, до которых пользователю осталось совсем немного
        nearly_available_discounts = DiscountRule.objects.filter(
            is_active=True,
            valid_from__lte=timezone.now() + timezone.timedelta(days=30)
        ).filter(
            Q(valid_until__isnull=True) | Q(valid_until__gt=timezone.now())
        )
        
        upcoming_discounts = []
        for discount in nearly_available_discounts:
            orders_remaining = max(0, discount.min_orders - user_stats.completed_orders)
            spent_remaining = max(0, discount.min_total_spent - (user_stats.total_spent or 0))
            
            # Если пользователю осталось немного до получения скидки
            if (orders_remaining > 0 and orders_remaining <= 3) or \
               (spent_remaining > 0 and spent_remaining <= 5000):
                upcoming_discounts.append({
                    'discount': discount,
                    'orders_remaining': orders_remaining,
                    'spent_remaining': spent_remaining
                })
        
        if upcoming_discounts:
            # Формируем контекст для шаблона
            context = {
                'user': user,
                'upcoming_discounts': upcoming_discounts
            }
            
            # Рендерим HTML и текстовую версии письма
            html_message = render_to_string('catalog/emails/upcoming_discounts.html', context)
            text_message = render_to_string('catalog/emails/upcoming_discounts.txt', context)
            
            # Отправляем уведомление
            send_mail(
                subject='Скоро доступные скидки',
                message=text_message,
                html_message=html_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True
            )

    @staticmethod
    def get_discount_statistics():
        """Возвращает статистику по использованию скидок"""
        from apps.orders.models import Order
        from django.db.models import Count, Sum, Avg
        
        # Статистика по всем скидкам
        stats = DiscountRule.objects.annotate(
            users_count=Count('orders__client', distinct=True),
            orders_count=Count('orders'),
            total_discount_amount=Sum('orders__discount_amount'),
            avg_discount_amount=Avg('orders__discount_amount')
        )
        
        # Статистика по периодам
        now = timezone.now()
        week_ago = now - timezone.timedelta(days=7)
        month_ago = now - timezone.timedelta(days=30)
        
        period_stats = {
            'week': Order.objects.filter(
                created_at__gte=week_ago,
                discount_rule__isnull=False
            ).aggregate(
                orders_count=Count('id'),
                total_discount=Sum('discount_amount'),
                avg_discount=Avg('discount_amount')
            ),
            'month': Order.objects.filter(
                created_at__gte=month_ago,
                discount_rule__isnull=False
            ).aggregate(
                orders_count=Count('id'),
                total_discount=Sum('discount_amount'),
                avg_discount=Avg('discount_amount')
            )
        }
        
        return {
            'discounts': stats,
            'periods': period_stats
        } 