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
    def update_expert_statistics(expert):
        """Обновляет статистику эксперта"""
        statistics, _ = ExpertStatistics.objects.get_or_create(expert=expert)

        # Подсчет заказов
        orders_completed = Order.objects.filter(
            expert=expert,
            status='completed'
        ).count()

        orders_in_progress = Order.objects.filter(
            expert=expert,
            status__in=['in_progress', 'revision']
        ).count()

        orders_cancelled = Order.objects.filter(
            expert=expert,
            status='cancelled'
        ).count()

        # Подсчет заработка
        total_earnings = Order.objects.filter(
            expert=expert,
            status='completed',
            payment_status='paid'
        ).aggregate(
            total=Sum('expert_payment')
        )['total'] or 0

        # Средний рейтинг
        average_rating = expert.reviews.filter(
            is_published=True
        ).aggregate(
            avg=Avg('rating')
        )['avg'] or 0

        # Процент успешных заказов
        total_orders = orders_completed + orders_cancelled
        if total_orders > 0:
            success_rate = (orders_completed / total_orders) * 100
        else:
            success_rate = 0

        # Обновление статистики
        statistics.orders_completed = orders_completed
        statistics.orders_in_progress = orders_in_progress
        statistics.orders_cancelled = orders_cancelled
        statistics.total_earnings = total_earnings
        statistics.average_rating = round(average_rating, 2)
        statistics.success_rate = round(success_rate, 2)
        statistics.last_updated = timezone.now()
        statistics.save()

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