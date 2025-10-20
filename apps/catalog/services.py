from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from django.core.cache import cache
from .models import WorkType, Complexity, DiscountRule
from django.db import models

class PricingService:
    CACHE_TTL = 3600  # Время жизни кэша в секундах (1 час)
    
    @staticmethod
    def _get_cache_key(work_type_id, complexity_id, deadline_timestamp, requirements_hash=None, user_id=None):
        """Генерирует ключ кэша для расчета цены"""
        key_parts = [
            f"price",
            f"wt_{work_type_id}",
            f"cx_{complexity_id}",
            f"dl_{int(deadline_timestamp)}"
        ]
        if requirements_hash:
            key_parts.append(f"req_{requirements_hash}")
        if user_id:
            key_parts.append(f"user_{user_id}")
        return ":".join(key_parts)

    @staticmethod
    def _hash_requirements(requirements):
        """Создает хэш из дополнительных требований"""
        if not requirements:
            return None
        
        # Сортируем ключи для обеспечения одинакового хэша
        # при одинаковых требованиях в разном порядке
        sorted_items = sorted(requirements.items())
        return ":".join(f"{k}={v}" for k, v in sorted_items)

    @staticmethod
    def calculate_order_price(work_type, complexity, deadline, user=None, additional_requirements=None):
        """
        Рассчитывает стоимость заказа с учетом различных факторов:
        - Базовая цена типа работы
        - Множитель сложности
        - Срочность (дедлайн)
        - Дополнительные требования
        - Скидки пользователя
        """
        # Пробуем получить результат из кэша
        requirements_hash = PricingService._hash_requirements(additional_requirements)
        user_id = user.id if user else None
        cache_key = PricingService._get_cache_key(
            work_type.id,
            complexity.id,
            deadline.timestamp(),
            requirements_hash,
            user_id
        )
        
        cached_result = cache.get(cache_key)
        if cached_result is not None:
            return Decimal(str(cached_result))
        
        # Если в кэше нет, рассчитываем
        # Базовая цена
        base_price = work_type.base_price
        
        # Применяем множитель сложности
        price = base_price * complexity.multiplier
        
        # Рассчитываем коэффициент срочности
        urgency_multiplier = PricingService._calculate_urgency_multiplier(
            work_type.estimated_time,
            deadline
        )
        price *= urgency_multiplier
        
        # Учитываем дополнительные требования
        if additional_requirements:
            requirements_multiplier = PricingService._calculate_requirements_multiplier(
                additional_requirements
            )
            price *= requirements_multiplier

        # Применяем скидки, если есть пользователь
        discount_info = None
        if user:
            price, discount_info = PricingService._apply_discounts(
                price,
                work_type,
                user
            )
        
        # Округляем до сотен рублей
        price = Decimal(round(float(price) / 100.0) * 100)
        
        # Сохраняем в кэш
        cache.set(cache_key, str(price), PricingService.CACHE_TTL)
        
        return price

    @staticmethod
    def get_price_breakdown(work_type, complexity, deadline, user=None, additional_requirements=None):
        """
        Возвращает подробную разбивку цены по компонентам
        """
        # Пробуем получить разбивку из кэша
        requirements_hash = PricingService._hash_requirements(additional_requirements)
        user_id = user.id if user else None
        cache_key = f"breakdown:{PricingService._get_cache_key(work_type.id, complexity.id, deadline.timestamp(), requirements_hash, user_id)}"
        
        cached_result = cache.get(cache_key)
        if cached_result is not None:
            return {k: Decimal(str(v)) for k, v in cached_result.items()}
        
        # Если в кэше нет, рассчитываем
        base_price = work_type.base_price
        complexity_price = base_price * complexity.multiplier
        
        urgency_multiplier = PricingService._calculate_urgency_multiplier(
            work_type.estimated_time,
            deadline
        )
        urgency_price = complexity_price * urgency_multiplier
        
        requirements_price = Decimal('0')
        if additional_requirements:
            requirements_multiplier = PricingService._calculate_requirements_multiplier(
                additional_requirements
            )
            requirements_price = urgency_price * (requirements_multiplier - 1)
        
        # Применяем скидки
        discount_amount = Decimal('0')
        discount_details = None
        if user:
            final_price = urgency_price + requirements_price
            discounted_price, discount_info = PricingService._apply_discounts(
                final_price,
                work_type,
                user
            )
            if discount_info:
                discount_amount = final_price - discounted_price
                discount_details = discount_info
        else:
            discounted_price = urgency_price + requirements_price
        
        # Округляем до сотен рублей
        final_price = Decimal(round(float(discounted_price) / 100.0) * 100)
        
        result = {
            'base_price': base_price,
            'complexity_adjustment': complexity_price - base_price,
            'urgency_adjustment': urgency_price - complexity_price,
            'requirements_adjustment': requirements_price,
            'discount_amount': discount_amount,
            'final_price': final_price
        }
        
        if discount_details:
            result['discount_details'] = discount_details
        
        # Сохраняем в кэш
        cache.set(
            cache_key,
            {k: str(v) if isinstance(v, Decimal) else v for k, v in result.items()},
            PricingService.CACHE_TTL
        )
        
        return result

    @staticmethod
    def _calculate_urgency_multiplier(estimated_time, deadline):
        """
        Рассчитывает множитель срочности на основе:
        - Стандартного времени выполнения
        - Фактического времени до дедлайна
        """
        now = timezone.now()
        hours_until_deadline = (deadline - now).total_seconds() / 3600
        
        # Проверяем, что дедлайн не в прошлом
        if hours_until_deadline <= 0:
            raise ValueError("Дедлайн не может быть в прошлом")
        
        # Проверяем, что estimated_time больше 0
        if estimated_time <= 0:
            return Decimal('1.0')
        
        # Если времени меньше стандартного
        if hours_until_deadline < estimated_time:
            # Максимальный множитель 2.0 при критически малом времени
            urgency = 2.0 - (hours_until_deadline / estimated_time)
            return Decimal(min(2.0, max(1.0, urgency)))
        
        # Если времени больше стандартного, возможна небольшая скидка
        if hours_until_deadline > estimated_time * 2:
            # Минимальный множитель 0.9 при большом запасе времени
            return Decimal('0.9')
        
        return Decimal('1.0')

    @staticmethod
    def _calculate_requirements_multiplier(requirements):
        """
        Рассчитывает множитель на основе дополнительных требований:
        - Уникальность текста
        - Специальное форматирование
        - Дополнительные материалы
        и т.д.
        """
        multiplier = Decimal('1.0')
        
        if requirements.get('uniqueness'):
            # Повышенная уникальность текста
            uniqueness = int(requirements['uniqueness'])
            if uniqueness > 90:
                multiplier *= Decimal('1.2')
            elif uniqueness > 80:
                multiplier *= Decimal('1.1')
        
        if requirements.get('formatting'):
            # Специальные требования к форматированию
            multiplier *= Decimal('1.1')
        
        if requirements.get('additional_materials'):
            # Необходимость изучения дополнительных материалов
            multiplier *= Decimal('1.15')
        
        if requirements.get('presentation'):
            # Требуется презентация
            multiplier *= Decimal('1.25')
        
        return multiplier

    @staticmethod
    def _apply_discounts(price, work_type, user):
        """
        Применяет подходящие скидки к цене
        Возвращает (цена_со_скидкой, информация_о_скидке)
        """
        # Получаем все активные скидки для данного типа работы
        discounts = DiscountRule.objects.filter(
            models.Q(work_types=work_type) | models.Q(work_types=None),
            is_active=True
        ).order_by('-value')  # Сначала проверяем большие скидки
        
        best_discount = None
        max_discount_amount = Decimal('0')
        
        for discount in discounts:
            if discount.is_valid_for_user(user):
                discount_amount = discount.calculate_discount(price)
                if discount_amount > max_discount_amount:
                    max_discount_amount = discount_amount
                    best_discount = discount
        
        if best_discount:
            discounted_price = price - max_discount_amount
            discount_info = {
                'name': best_discount.name,
                'type': best_discount.discount_type,
                'value': best_discount.value,
                'amount': max_discount_amount
            }
            return discounted_price, discount_info
        
        return price, None

    @staticmethod
    def invalidate_cache(work_type_id=None, complexity_id=None):
        """
        Инвалидирует кэш цен для указанного типа работы и/или сложности.
        Если параметры не указаны, инвалидирует весь кэш цен.
        """
        if work_type_id is None and complexity_id is None:
            # Инвалидируем весь кэш цен
            cache.delete_pattern("price:*")
            cache.delete_pattern("breakdown:price:*")
        else:
            # Инвалидируем только конкретные записи
            pattern_parts = ["price"]
            if work_type_id:
                pattern_parts.append(f"wt_{work_type_id}")
            if complexity_id:
                pattern_parts.append(f"cx_{complexity_id}")
            pattern = ":".join(pattern_parts) + "*"
            
            cache.delete_pattern(pattern)
            cache.delete_pattern(f"breakdown:{pattern}") 