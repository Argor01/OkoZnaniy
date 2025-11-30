from django.db.models import Avg, Count, Q, Sum, F, ExpressionWrapper, FloatField
from django.utils import timezone
from datetime import timedelta
from .models import ExpertStatistics, Specialization
from apps.orders.models import Order


class ExpertMatchingService:
    @staticmethod
    def find_matching_experts(order, limit=5):
        """
        Находит подходящих экспертов для заказа с учетом различных факторов:
        - Специализация по предмету
        - Рейтинг эксперта
        - Загруженность
        - Процент успешных заказов
        - Время ответа
        """
        # Базовый QuerySet экспертов со специализацией по предмету
        experts = Specialization.objects.filter(
            subject=order.subject,
            is_verified=True,
            expert__is_active=True
        ).select_related(
            'expert',
            'expert__statistics'
        ).annotate(
            # Текущая загруженность (активные заказы)
            current_workload=Count(
                'expert__expert_orders',
                filter=Q(expert__expert_orders__status__in=['in_progress', 'revision'])
            ),
            # Средний рейтинг
            avg_rating=Avg('expert__received_ratings__rating'),
            # Процент успешных заказов
            success_rate=ExpressionWrapper(
                F('expert__statistics__completed_orders') * 100.0 / 
                F('expert__statistics__total_orders'),
                output_field=FloatField()
            )
        ).filter(
            # Фильтруем экспертов с приемлемой загрузкой
            current_workload__lt=5
        )

        # Рассчитываем релевантность каждого эксперта
        experts = experts.annotate(
            relevance_score=ExpressionWrapper(
                # Формула расчета релевантности:
                # (0.4 * рейтинг + 0.3 * процент успешных заказов + 
                #  0.2 * опыт работы + 0.1 * (1 - текущая загрузка/5))
                (F('avg_rating') * 0.4 +
                 F('success_rate') * 0.003 +
                 F('experience_years') * 0.2 +
                 (1 - F('current_workload') * 0.02) * 0.1),
                output_field=FloatField()
            )
        ).order_by('-relevance_score')[:limit]

        return experts

    @staticmethod
    def get_expert_availability(expert):
        """
        Определяет доступность эксперта для новых заказов
        """
        current_time = timezone.now()
        
        # Проверяем текущую загрузку
        active_orders = expert.expert_orders.filter(
            status__in=['in_progress', 'revision']
        ).count()
        
        # Проверяем последнюю активность
        last_activity = expert.last_activity if hasattr(expert, 'last_activity') else None
        is_recently_active = (
            last_activity and 
            (current_time - last_activity) < timedelta(hours=24)
        )
        
        # Проверяем статистику выполнения
        stats = getattr(expert, 'statistics', None)
        has_good_stats = (
            stats and
            stats.success_rate >= 70 and
            stats.average_rating >= 4.0
        )
        
        return {
            'is_available': active_orders < 5 and is_recently_active,
            'active_orders': active_orders,
            'last_active': last_activity,
            'has_good_stats': has_good_stats,
            'estimated_start_time': (
                current_time + timedelta(days=active_orders)
                if active_orders > 0 else current_time
            )
        }

class ExpertStatisticsService:
    @staticmethod
    def get_dashboard_statistics(expert):
        """
        Получает агрегированную статистику для дашборда эксперта
        
        Returns:
            dict: Словарь со статистикой включающей заработок, заказы, рейтинг
        """
        from django.core.cache import cache
        from apps.orders.models import Transaction
        from .models import ExpertReview
        
        # Пытаемся получить из кэша
        cache_key = f'expert_dashboard_stats_{expert.id}'
        cached_stats = cache.get(cache_key)
        if cached_stats:
            return cached_stats
        
        # Получаем или создаем статистику
        stats, created = ExpertStatistics.objects.get_or_create(expert=expert)
        if created:
            ExpertStatisticsService.update_expert_statistics(expert)
            stats.refresh_from_db()
        
        # Общий заработок из транзакций
        total_earnings = Transaction.objects.filter(
            user=expert,
            type='payout'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Заработок за текущий месяц
        current_month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_earnings = Transaction.objects.filter(
            user=expert,
            type='payout',
            timestamp__gte=current_month_start
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Активные заказы
        active_orders_count = Order.objects.filter(
            expert=expert,
            status__in=['in_progress', 'review', 'revision']
        ).count()
        
        # Завершенные заказы
        completed_orders_count = Order.objects.filter(
            expert=expert,
            status='completed'
        ).count()
        
        # Средний рейтинг
        avg_rating = ExpertReview.objects.filter(
            expert=expert,
            is_published=True
        ).aggregate(avg=Avg('rating'))['avg'] or 0
        
        # Количество верифицированных специализаций
        verified_specializations = Specialization.objects.filter(
            expert=expert,
            is_verified=True
        ).count()
        
        result = {
            'total_earnings': float(total_earnings),
            'monthly_earnings': float(monthly_earnings),
            'active_orders': active_orders_count,
            'completed_orders': completed_orders_count,
            'average_rating': float(avg_rating),
            'verified_specializations': verified_specializations,
            'success_rate': float(stats.success_rate),
            'total_orders': stats.total_orders,
            'response_time_avg': stats.response_time_avg.total_seconds() if stats.response_time_avg else None
        }
        
        # Кэшируем на 5 минут
        cache.set(cache_key, result, timeout=300)
        
        return result
    
    @staticmethod
    def get_earnings_by_period(expert, start_date, end_date):
        """
        Получает заработок эксперта за указанный период
        
        Args:
            expert: Объект пользователя-эксперта
            start_date: Начальная дата периода
            end_date: Конечная дата периода
            
        Returns:
            Decimal: Сумма заработка за период
        """
        from apps.orders.models import Transaction
        
        earnings = Transaction.objects.filter(
            user=expert,
            type='payout',
            timestamp__gte=start_date,
            timestamp__lte=end_date
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        return earnings
    
    @staticmethod
    def update_expert_statistics(expert):
        """Обновляет статистику эксперта"""
        from django.core.cache import cache
        from apps.orders.models import Transaction
        from .models import ExpertReview
        
        statistics, _ = ExpertStatistics.objects.get_or_create(expert=expert)

        # Подсчет заказов
        orders = Order.objects.filter(expert=expert)
        total_orders = orders.count()
        completed_orders = orders.filter(status='completed').count()

        # Подсчет заработка из транзакций
        total_earnings = Transaction.objects.filter(
            user=expert,
            type='payout'
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Средний рейтинг из отзывов
        average_rating = ExpertReview.objects.filter(
            expert=expert,
            is_published=True
        ).aggregate(avg=Avg('rating'))['avg'] or 0

        # Процент успешных заказов
        if total_orders > 0:
            success_rate = (completed_orders / total_orders) * 100
        else:
            success_rate = 0

        # Обновление статистики
        statistics.total_orders = total_orders
        statistics.completed_orders = completed_orders
        statistics.total_earnings = total_earnings
        statistics.average_rating = round(average_rating, 2)
        statistics.success_rate = round(success_rate, 2)
        statistics.last_updated = timezone.now()
        statistics.save()
        
        # Инвалидируем кэш
        cache_key = f'expert_dashboard_stats_{expert.id}'
        cache.delete(cache_key)

        return statistics

    @staticmethod
    def update_all_experts_statistics():
        """Обновляет статистику всех экспертов"""
        from apps.users.models import User
        experts = User.objects.filter(role='expert')
        updated_count = 0
        for expert in experts:
            try:
                ExpertStatisticsService.update_expert_statistics(expert)
                updated_count += 1
            except Exception as e:
                print(f"Ошибка обновления статистики эксперта {expert.id}: {str(e)}")
        return updated_count


class ExpertFinanceService:
    """Сервис для работы с финансами эксперта"""
    
    @staticmethod
    def get_financial_summary(expert):
        """
        Получает финансовую сводку эксперта
        
        Returns:
            dict: Словарь с финансовой информацией
        """
        from apps.orders.models import Transaction
        from decimal import Decimal
        
        # Текущий баланс
        current_balance = expert.balance
        frozen_balance = expert.frozen_balance
        available_balance = current_balance - frozen_balance
        
        # Общий заработок
        total_earnings = Transaction.objects.filter(
            user=expert,
            type='payout'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Заработок за текущий месяц
        current_month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_earnings = Transaction.objects.filter(
            user=expert,
            type='payout',
            timestamp__gte=current_month_start
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Ожидающие выплаты (замороженные средства)
        pending_payouts = frozen_balance
        
        # Последняя выплата
        last_payout = ExpertFinanceService.get_last_payout(expert)
        last_payout_data = None
        if last_payout:
            last_payout_data = {
                'amount': float(last_payout.amount),
                'date': last_payout.timestamp.isoformat()
            }
        
        return {
            'current_balance': float(current_balance),
            'frozen_balance': float(frozen_balance),
            'available_balance': float(available_balance),
            'total_earnings': float(total_earnings),
            'monthly_earnings': float(monthly_earnings),
            'pending_payouts': float(pending_payouts),
            'last_payout': last_payout_data
        }
    
    @staticmethod
    def get_transactions(expert, filters=None):
        """
        Получает транзакции эксперта с фильтрацией
        
        Args:
            expert: Объект пользователя-эксперта
            filters: Словарь с фильтрами (type, date_from, date_to)
            
        Returns:
            QuerySet: Отфильтрованный QuerySet транзакций
        """
        from apps.orders.models import Transaction
        
        queryset = Transaction.objects.filter(user=expert).select_related('order')
        
        if filters:
            # Фильтр по типу транзакции
            if 'type' in filters and filters['type']:
                queryset = queryset.filter(type=filters['type'])
            
            # Фильтр по дате от
            if 'date_from' in filters and filters['date_from']:
                queryset = queryset.filter(timestamp__gte=filters['date_from'])
            
            # Фильтр по дате до
            if 'date_to' in filters and filters['date_to']:
                # Добавляем 1 день чтобы включить конечную дату
                end_date = filters['date_to'] + timedelta(days=1)
                queryset = queryset.filter(timestamp__lt=end_date)
        
        return queryset.order_by('-timestamp')
    
    @staticmethod
    def calculate_pending_payouts(expert):
        """
        Вычисляет сумму ожидающих выплат
        
        Returns:
            Decimal: Сумма ожидающих выплат
        """
        return expert.frozen_balance
    
    @staticmethod
    def get_last_payout(expert):
        """
        Получает последнюю выплату эксперта
        
        Returns:
            Transaction или None: Последняя транзакция типа payout
        """
        from apps.orders.models import Transaction
        
        return Transaction.objects.filter(
            user=expert,
            type='payout'
        ).order_by('-timestamp').first()


class ExpertOrderService:
    """Сервис для работы с заказами эксперта"""
    
    @staticmethod
    def get_available_orders(expert):
        """
        Получает доступные заказы по специализациям эксперта
        с оптимизацией запросов
        
        Returns:
            QuerySet: Доступные заказы
        """
        # Получаем ID предметов из верифицированных специализаций эксперта
        expert_subjects = Specialization.objects.filter(
            expert=expert,
            is_verified=True
        ).values_list('subject_id', flat=True)
        
        # Ищем заказы по специализациям эксперта
        orders = Order.objects.filter(
            status='new',
            subject_id__in=expert_subjects,
            expert__isnull=True
        ).select_related(
            'client',
            'subject',
            'work_type',
            'complexity'
        ).order_by('-created_at')
        
        return orders
    
    @staticmethod
    def get_active_orders(expert):
        """
        Получает активные заказы эксперта с оптимизацией
        
        Returns:
            QuerySet: Активные заказы
        """
        orders = Order.objects.filter(
            expert=expert,
            status__in=['in_progress', 'review', 'revision']
        ).select_related(
            'client',
            'subject',
            'work_type',
            'complexity'
        ).order_by('-created_at')
        
        return orders
    
    @staticmethod
    def can_take_order(expert, order):
        """
        Проверяет может ли эксперт взять заказ
        
        Args:
            expert: Объект пользователя-эксперта
            order: Объект заказа
            
        Returns:
            tuple: (can_take: bool, reason: str)
        """
        # Проверяем статус заказа
        if order.status != 'new':
            return False, 'Заказ уже взят в работу или завершен'
        
        # Проверяем что заказ не назначен другому эксперту
        if order.expert is not None:
            return False, 'Заказ уже назначен другому эксперту'
        
        # Проверяем наличие специализации
        if order.subject:
            has_specialization = Specialization.objects.filter(
                expert=expert,
                subject=order.subject,
                is_verified=True
            ).exists()
            
            if not has_specialization:
                return False, 'У вас нет верифицированной специализации по данному предмету'
        
        return True, 'OK'
    
    @staticmethod
    def take_order(expert, order):
        """
        Берет заказ в работу
        
        Args:
            expert: Объект пользователя-эксперта
            order: Объект заказа
            
        Returns:
            tuple: (success: bool, message: str)
        """
        from apps.notifications.services import NotificationService
        
        # Проверяем возможность взятия заказа
        can_take, reason = ExpertOrderService.can_take_order(expert, order)
        if not can_take:
            return False, reason
        
        # Назначаем эксперта на заказ
        order.expert = expert
        order.status = 'in_progress'
        order.save()
        
        # Отправляем уведомление клиенту
        try:
            NotificationService.notify_expert_assigned(order)
        except Exception as e:
            print(f"Ошибка отправки уведомления: {str(e)}")
        
        return True, 'Заказ успешно взят в работу'



class ExpertCacheService:
    """Сервис для управления кэшем эксперта"""
    
    @staticmethod
    def invalidate_expert_cache(expert):
        """Инвалидирует весь кэш эксперта"""
        from django.core.cache import cache
        
        cache_keys = [
            f'expert_dashboard_stats_{expert.id}',
            f'expert_profile_{expert.id}',
        ]
        
        for key in cache_keys:
            cache.delete(key)
    
    @staticmethod
    def invalidate_statistics_cache(expert):
        """Инвалидирует кэш статистики"""
        from django.core.cache import cache
        cache.delete(f'expert_dashboard_stats_{expert.id}')
    
    @staticmethod
    def invalidate_profile_cache(expert):
        """Инвалидирует кэш профиля"""
        from django.core.cache import cache
        cache.delete(f'expert_profile_{expert.id}')
