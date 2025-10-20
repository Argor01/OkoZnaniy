from django.db.models import Sum
from django.db import models
from django.utils import timezone
from apps.catalog.models import DiscountRule
from .models import Order

class DiscountService:
    @staticmethod
    def get_available_discounts(user):
        """
        Получает список доступных скидок для пользователя
        """
        user_orders = user.client_orders.filter(status='completed')
        total_orders = user_orders.count()
        total_spent = user_orders.aggregate(total=Sum('final_price'))['total'] or 0

        now = timezone.now()
        active_discounts = DiscountRule.objects.filter(
            is_active=True,
            valid_from__lte=now
        ).filter(
            models.Q(valid_until__isnull=True) |
            models.Q(valid_until__gt=now)
        )

        return [
            discount for discount in active_discounts
            if total_orders >= discount.min_orders
            and total_spent >= discount.min_total_spent
        ]

    @staticmethod
    def get_best_discount(order: Order) -> DiscountRule | None:
        """
        Находит лучшую доступную скидку для заказа
        """
        available_discounts = DiscountService.get_available_discounts(order.client)
        
        if not available_discounts:
            return None

        best_discount = None
        max_discount_amount = 0

        for discount in available_discounts:
            # Проверяем применимость скидки к типу работы
            if discount.work_types.exists() and order.work_type not in discount.work_types.all():
                continue

            # Рассчитываем сумму скидки
            if discount.discount_type == 'percentage':
                discount_amount = (order.budget * discount.value) / 100
            else:
                discount_amount = min(discount.value, order.budget)

            if discount_amount > max_discount_amount:
                max_discount_amount = discount_amount
                best_discount = discount

        return best_discount

    @staticmethod
    def apply_best_discount(order: Order) -> bool:
        """
        Применяет лучшую доступную скидку к заказу
        Возвращает True если скидка была применена
        """
        best_discount = DiscountService.get_best_discount(order)
        if best_discount:
            return order.apply_discount(best_discount)
        return False 