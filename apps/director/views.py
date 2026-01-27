from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Sum, Q, Avg
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
from django.db.models.functions import TruncDate, TruncMonth

from apps.experts.models import ExpertApplication
from apps.experts.serializers import ExpertApplicationSerializer
from apps.users.serializers import UserSerializer
from apps.orders.models import Order
from apps.payments.models import Payment
from apps.shop.models import ReadyWork
from .serializers import (
    DirectorStatsSerializer, MonthlyTurnoverSerializer, 
    NetProfitSerializer, PartnerSerializer, PartnerTurnoverSerializer
)


class IsDirector(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and (user.is_staff or getattr(user, 'role', None) == 'admin')
        )


class DirectorExpertApplicationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ExpertApplication.objects.select_related('expert', 'reviewed_by').prefetch_related('educations')
    serializer_class = ExpertApplicationSerializer
    permission_classes = [permissions.IsAuthenticated, IsDirector]

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        application = self.get_object()
        
        # Проверяем, что заявка еще не одобрена
        if application.status == 'approved':
            return Response(
                {'detail': 'Заявка уже одобрена'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        application.status = 'approved'
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])

        # Синхронизируем флаги пользователя и меняем роль на expert
        User = get_user_model()
        expert = application.expert
        
        # Логируем текущее состояние
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Approving application {application.id} for user {expert.id} (current role: {expert.role})")
        
        expert.application_approved = True
        expert.application_reviewed_at = application.updated_at
        expert.application_reviewed_by = request.user
        expert.has_submitted_application = True
        expert.role = 'expert'  # Всегда устанавливаем роль expert при одобрении
        
        logger.info(f"Set role to expert for user {expert.id}")
        expert.save(update_fields=['application_approved', 'application_reviewed_at', 'application_reviewed_by', 'has_submitted_application', 'role'])

        # Отправляем уведомление пользователю
        from apps.notifications.services import NotificationService
        NotificationService.notify_application_approved(application)

        serializer = self.get_serializer(application)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        reason = request.data.get('reason', '')
        
        if not reason:
            return Response(
                {'detail': 'Укажите причину отклонения'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        application = self.get_object()
        
        # Проверяем, что заявка еще не отклонена
        if application.status == 'rejected':
            return Response(
                {'detail': 'Заявка уже отклонена'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        application.status = 'rejected'
        application.rejection_reason = reason
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.save(update_fields=['status', 'rejection_reason', 'reviewed_by', 'reviewed_at', 'updated_at'])

        # Синхронизируем флаги пользователя и возвращаем роль client
        expert = application.expert
        
        # Логируем текущее состояние
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Rejecting application {application.id} for user {expert.id} (current role: {expert.role})")
        
        expert.application_approved = False
        expert.application_reviewed_at = application.updated_at
        expert.application_reviewed_by = request.user
        expert.has_submitted_application = True
        
        # Если пользователь был экспертом, возвращаем роль client
        if expert.role == 'expert':
            expert.role = 'client'
            logger.info(f"Changed role back to client for user {expert.id}")
            expert.save(update_fields=['application_approved', 'application_reviewed_at', 'application_reviewed_by', 'has_submitted_application', 'role'])
        else:
            expert.save(update_fields=['application_approved', 'application_reviewed_at', 'application_reviewed_by', 'has_submitted_application'])

        # Отправляем уведомление пользователю
        from apps.notifications.services import NotificationService
        NotificationService.notify_application_rejected(application, reason)

        serializer = self.get_serializer(application)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def rework(self, request, pk=None):
        comment = request.data.get('comment', '')
        
        if not comment:
            return Response(
                {'detail': 'Укажите комментарий для доработки'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        application = self.get_object()
        
        # Возвращаем в рассмотрение (pending) и сохраняем комментарий в поле причины
        application.status = 'pending'
        application.rejection_reason = f"Требуется доработка: {comment}"
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.save(update_fields=['status', 'rejection_reason', 'reviewed_by', 'reviewed_at', 'updated_at'])

        # Флаги пользователя остаются как подана, но не одобрена
        expert = application.expert
        expert.application_approved = False
        expert.has_submitted_application = True
        expert.save(update_fields=['application_approved', 'has_submitted_application'])

        # Отправляем уведомление пользователю
        from apps.notifications.services import NotificationService
        NotificationService.notify_application_rework(application, comment)

        serializer = self.get_serializer(application)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DirectorPersonnelViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsDirector]

    def get_queryset(self):
        User = get_user_model()
        from django.db.models import Q
        
        # Для действия restore разрешаем доступ к архивированным пользователям И деактивированным экспертам
        if self.action == 'restore':
            return User.objects.filter(
                Q(is_active=False) |  # Архивированные
                Q(role='client', application_approved=False, has_submitted_application=True)  # Деактивированные эксперты
            ).exclude(
                Q(role='client', has_submitted_application=False)  # Обычные клиенты
            )
        
        # Для действия activate разрешаем доступ к деактивированным экспертам
        if self.action == 'activate':
            return User.objects.all().exclude(
                Q(role='client', has_submitted_application=False)  # Обычные клиенты
            )
        
        # Показываем активных сотрудников:
        # - Все роли кроме client (admin, expert, partner, arbitrator)
        # - Исключаем только обычных клиентов (role=client)
        # - Архивированные (is_active=False) не показываем
        return User.objects.filter(
            is_active=True
        ).exclude(
            role='client'  # Исключаем всех клиентов (обычных и деактивированных экспертов)
        )

    def get_serializer_class(self):
        return UserSerializer

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Активация сотрудника или восстановление эксперта"""
        user = self.get_object()
        
        # Если это деактивированный эксперт (client с application_approved=False)
        # возвращаем заявку на рассмотрение
        if user.role == 'client' and user.application_approved == False:
            try:
                application = ExpertApplication.objects.get(expert=user)
                if application.status == 'deactivated':
                    # Возвращаем заявку на рассмотрение
                    application.status = 'pending'
                    application.rejection_reason = ''  # Очищаем причину деактивации
                    application.reviewed_by = None
                    application.reviewed_at = None
                    application.save(update_fields=['status', 'rejection_reason', 'reviewed_by', 'reviewed_at', 'updated_at'])
                    
                    # Пользователь остается клиентом до одобрения заявки
                    user.application_approved = False
                    user.has_submitted_application = True
                    user.save(update_fields=['application_approved', 'has_submitted_application'])
                    
                    # Отправляем уведомление пользователю о восстановлении
                    from apps.notifications.services import NotificationService
                    NotificationService.notify_application_restored(application)
            except ExpertApplication.DoesNotExist:
                pass
        else:
            # Обычная активация аккаунта
            user.is_active = True
            user.save(update_fields=['is_active'])
        
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Деактивация эксперта - убирает роль expert, но не деактивирует аккаунт"""
        user = self.get_object()
        
        # Если это эксперт, меняем роль на client и деактивируем анкету
        if user.role == 'expert':
            user.role = 'client'
            user.application_approved = False
            user.save(update_fields=['role', 'application_approved'])
            
            # Деактивируем анкету, если она есть (нельзя подавать заново)
            try:
                application = ExpertApplication.objects.get(expert=user)
                application.status = 'deactivated'
                application.rejection_reason = 'Деактивирован администратором'
                application.reviewed_by = request.user
                application.save(update_fields=['status', 'rejection_reason', 'reviewed_by', 'updated_at'])
                
                # Отправляем уведомление пользователю о деактивации
                from apps.notifications.services import NotificationService
                NotificationService.notify_application_rejected(application, 'Ваш статус эксперта был деактивирован администратором')
            except ExpertApplication.DoesNotExist:
                pass
        else:
            # Для других ролей просто деактивируем аккаунт
            user.is_active = False
            user.save(update_fields=['is_active'])
        
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Архивирование сотрудника - полная деактивация аккаунта"""
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=['is_active'])
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Восстановление сотрудника из архива или деактивированного эксперта"""
        user = self.get_object()
        
        # Если это деактивированный эксперт (client с application_approved=False)
        # возвращаем заявку на рассмотрение
        if user.role == 'client' and user.application_approved == False and user.has_submitted_application:
            try:
                application = ExpertApplication.objects.get(expert=user)
                if application.status == 'deactivated':
                    # Возвращаем заявку на рассмотрение
                    application.status = 'pending'
                    application.rejection_reason = ''  # Очищаем причину деактивации
                    application.reviewed_by = None
                    application.reviewed_at = None
                    application.save(update_fields=['status', 'rejection_reason', 'reviewed_by', 'reviewed_at', 'updated_at'])
                    
                    # Пользователь остается клиентом до одобрения заявки
                    user.application_approved = False
                    user.has_submitted_application = True
                    user.is_active = True
                    user.save(update_fields=['application_approved', 'has_submitted_application', 'is_active'])
                    
                    # Отправляем уведомление пользователю о восстановлении
                    from apps.notifications.services import NotificationService
                    NotificationService.notify_application_restored(application)
            except ExpertApplication.DoesNotExist:
                pass
        else:
            # Обычное восстановление архивированного аккаунта
            user.is_active = True
            user.save(update_fields=['is_active'])
        
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='archive')
    def get_archive(self, request):
        """Получить список заархивированных сотрудников и деактивированных экспертов"""
        User = get_user_model()
        from django.db.models import Q
        
        # Включаем:
        # 1. Неактивных пользователей (кроме обычных клиентов)
        # 2. Деактивированных экспертов (role=client, application_approved=False, has_submitted_application=True)
        archived = User.objects.filter(
            Q(is_active=False) & ~Q(role='client') |  # Архивированные сотрудники
            Q(role='client', application_approved=False, has_submitted_application=True)  # Деактивированные эксперты
        ).distinct()
        
        serializer = UserSerializer(archived, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def register(self, request):
        User = get_user_model()
        data = request.data or {}
        email = data.get('email') or None
        phone = data.get('phone') or None
        first_name = data.get('first_name') or ''
        last_name = data.get('last_name') or ''
        role = data.get('role')
        password = data.get('password')
        username = data.get('username')

        if not (email or phone):
            return Response({'detail': 'Укажите email или телефон'}, status=status.HTTP_400_BAD_REQUEST)
        if not role:
            return Response({'detail': 'Укажите роль'}, status=status.HTTP_400_BAD_REQUEST)
        # Генерируем пароль если не указан
        if not password:
            import secrets, string
            alphabet = string.ascii_letters + string.digits + '!@#$%^&*'
            password = ''.join(secrets.choice(alphabet) for _ in range(12))

        allowed_roles = {'admin', 'arbitrator', 'partner', 'expert'}
        if role not in allowed_roles:
            return Response({'detail': 'Недопустимая роль'}, status=status.HTTP_400_BAD_REQUEST)

        # Уникальность email/телефона
        if email and User.objects.filter(email=email).exists():
            return Response({'detail': 'Пользователь с таким email уже существует'}, status=status.HTTP_400_BAD_REQUEST)
        if phone and User.objects.filter(phone=phone).exists():
            return Response({'detail': 'Пользователь с таким телефоном уже существует'}, status=status.HTTP_400_BAD_REQUEST)

        # Генерация/проверка username
        if not username:
            base_username = (email.split('@')[0] if email else (phone or 'user'))
            candidate = base_username
            suffix = 1
            while User.objects.filter(username=candidate).exists():
                candidate = f"{base_username}{suffix}"
                suffix += 1
            username = candidate
        else:
            if User.objects.filter(username=username).exists():
                return Response({'detail': 'Имя пользователя занято'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            username=username,
            email=email,
            phone=phone,
            password=password,
            role=role,
            first_name=first_name,
            last_name=last_name,
        )

        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class DirectorFinanceViewSet(viewsets.ViewSet):
    """ViewSet для финансовой статистики директора"""
    permission_classes = [permissions.IsAuthenticated, IsDirector]
    
    @action(detail=False, methods=['get'])
    def turnover(self, request):
        """Получить оборот за период"""
        period = request.query_params.get('period')
        
        # Определяем период
        if period:
            try:
                date_obj = datetime.strptime(period, '%Y-%m')
                start_date = date_obj.replace(day=1)
                if date_obj.month == 12:
                    end_date = date_obj.replace(year=date_obj.year + 1, month=1, day=1) - timedelta(days=1)
                else:
                    end_date = date_obj.replace(month=date_obj.month + 1, day=1) - timedelta(days=1)
                month_name = date_obj.strftime('%B %Y')
            except:
                # Если формат неверный, используем текущий месяц
                now = timezone.now()
                start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                if now.month == 12:
                    end_date = now.replace(year=now.year + 1, month=1, day=1) - timedelta(days=1)
                else:
                    end_date = now.replace(month=now.month + 1, day=1) - timedelta(days=1)
                month_name = now.strftime('%B %Y')
        else:
            # Текущий месяц
            now = timezone.now()
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if now.month == 12:
                end_date = now.replace(year=now.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                end_date = now.replace(month=now.month + 1, day=1) - timedelta(days=1)
            month_name = now.strftime('%B %Y')
        
        # Получаем реальные данные из БД
        # Оборот от заказов
        orders_turnover = Payment.objects.filter(
            status='completed',
            paid_at__gte=start_date,
            paid_at__lte=end_date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Оборот от продаж готовых работ (пока не реализовано)
        shop_turnover = Decimal('0.00')
        
        total_turnover = orders_turnover + shop_turnover
        
        # Данные за предыдущий период для сравнения
        prev_start = start_date - timedelta(days=32)
        prev_start = prev_start.replace(day=1)
        prev_end = start_date - timedelta(days=1)
        
        prev_orders_turnover = Payment.objects.filter(
            status='completed',
            paid_at__gte=prev_start,
            paid_at__lte=prev_end
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        prev_shop_turnover = Decimal('0.00')
        
        prev_total = prev_orders_turnover + prev_shop_turnover
        
        # Вычисляем процент изменения
        if prev_total > 0:
            change_percent = float((total_turnover - prev_total) / prev_total * 100)
        else:
            change_percent = 100.0 if total_turnover > 0 else 0.0
        
        # Ежедневные данные за период
        daily_data = []
        current_date = start_date
        while current_date <= end_date:
            day_start = current_date
            day_end = current_date.replace(hour=23, minute=59, second=59)
            
            day_orders = Payment.objects.filter(
                status='completed',
                paid_at__gte=day_start,
                paid_at__lte=day_end
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            day_shop = Decimal('0.00')
            
            daily_data.append({
                'date': current_date.strftime('%Y-%m-%d'),
                'amount': float(day_orders + day_shop)
            })
            
            current_date += timedelta(days=1)
        
        data = {
            'period': month_name,
            'total': total_turnover,
            'previous_period': prev_total,
            'change_percent': round(change_percent, 2),
            'daily_data': daily_data
        }
        
        serializer = MonthlyTurnoverSerializer(data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='net-profit')
    def net_profit(self, request):
        """Получить чистую прибыль за период"""
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        # Определяем период
        if start_date_str and end_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
            except:
                # Если формат неверный, используем текущий месяц
                now = timezone.now()
                start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                if now.month == 12:
                    end_date = now.replace(year=now.year + 1, month=1, day=1) - timedelta(days=1)
                else:
                    end_date = now.replace(month=now.month + 1, day=1) - timedelta(days=1)
        else:
            # Текущий месяц по умолчанию
            now = timezone.now()
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if now.month == 12:
                end_date = now.replace(year=now.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                end_date = now.replace(month=now.month + 1, day=1) - timedelta(days=1)
        
        # Доходы
        # От заказов
        orders_income = Payment.objects.filter(
            status='completed',
            paid_at__gte=start_date,
            paid_at__lte=end_date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # От продаж готовых работ (пока не реализовано)
        shop_income = Decimal('0.00')
        
        total_income = orders_income + shop_income
        
        # Расходы (примерные расчеты, так как модели расходов может не быть)
        # Выплаты экспертам (примерно 60% от стоимости заказов)
        expert_payments = orders_income * Decimal('0.60')
        
        # Комиссии партнерам (примерно 10% от оборота партнерских продаж)
        User = get_user_model()
        partner_orders = Payment.objects.filter(
            status='completed',
            paid_at__gte=start_date,
            paid_at__lte=end_date,
            order__client__partner__isnull=False
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        partner_commissions = partner_orders * Decimal('0.10')
        
        # Операционные расходы (примерно 15% от общего дохода)
        operational_expenses = total_income * Decimal('0.15')
        
        # Маркетинг (примерно 8% от общего дохода)
        marketing_expenses = total_income * Decimal('0.08')
        
        # Техническое обслуживание (примерно 3% от общего дохода)
        tech_expenses = total_income * Decimal('0.03')
        
        total_expenses = expert_payments + partner_commissions + operational_expenses + marketing_expenses + tech_expenses
        net_profit = total_income - total_expenses
        
        # Данные за предыдущий период
        period_length = (end_date - start_date).days
        prev_start = start_date - timedelta(days=period_length + 1)
        prev_end = start_date - timedelta(days=1)
        
        prev_orders_income = Payment.objects.filter(
            status='completed',
            paid_at__gte=prev_start,
            paid_at__lte=prev_end
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        prev_shop_income = Decimal('0.00')
        
        prev_total_income = prev_orders_income + prev_shop_income
        prev_total_expenses = prev_total_income * Decimal('0.64')  # Примерно 64% расходов
        prev_net_profit = prev_total_income - prev_total_expenses
        
        # Процент изменения
        if prev_net_profit > 0:
            change_percent = float((net_profit - prev_net_profit) / prev_net_profit * 100)
        else:
            change_percent = 100.0 if net_profit > 0 else 0.0
        
        # Разбивка доходов
        income_breakdown = []
        if total_income > 0:
            if orders_income > 0:
                income_breakdown.append({
                    'category': 'Заказы студентов',
                    'amount': float(orders_income),
                    'percentage': round(float(orders_income / total_income * 100), 1)
                })
            if shop_income > 0:
                income_breakdown.append({
                    'category': 'Готовые работы',
                    'amount': float(shop_income),
                    'percentage': round(float(shop_income / total_income * 100), 1)
                })
            if partner_orders > 0:
                income_breakdown.append({
                    'category': 'Партнерские продажи',
                    'amount': float(partner_orders),
                    'percentage': round(float(partner_orders / total_income * 100), 1)
                })
        
        # Разбивка расходов
        expense_breakdown = []
        if total_expenses > 0:
            expense_breakdown = [
                {
                    'category': 'Выплаты экспертам',
                    'amount': float(expert_payments),
                    'percentage': round(float(expert_payments / total_expenses * 100), 1)
                },
                {
                    'category': 'Операционные расходы',
                    'amount': float(operational_expenses),
                    'percentage': round(float(operational_expenses / total_expenses * 100), 1)
                },
                {
                    'category': 'Маркетинг и реклама',
                    'amount': float(marketing_expenses),
                    'percentage': round(float(marketing_expenses / total_expenses * 100), 1)
                },
                {
                    'category': 'Комиссии партнерам',
                    'amount': float(partner_commissions),
                    'percentage': round(float(partner_commissions / total_expenses * 100), 1)
                },
                {
                    'category': 'Техническое обслуживание',
                    'amount': float(tech_expenses),
                    'percentage': round(float(tech_expenses / total_expenses * 100), 1)
                }
            ]
        
        data = {
            'total': net_profit,
            'income': total_income,
            'expense': total_expenses,
            'previous_period': prev_net_profit,
            'change_percent': round(change_percent, 2),
            'income_breakdown': income_breakdown,
            'expense_breakdown': expense_breakdown
        }
        
        serializer = NetProfitSerializer(data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def income(self, request):
        """Получить детализацию доходов"""
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        # Определяем период
        if start_date_str and end_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
            except:
                # Последние 30 дней по умолчанию
                end_date = timezone.now()
                start_date = end_date - timedelta(days=30)
        else:
            # Последние 30 дней по умолчанию
            end_date = timezone.now()
            start_date = end_date - timedelta(days=30)
        
        data = []
        
        # Доходы от заказов
        payments = Payment.objects.filter(
            status='completed',
            paid_at__gte=start_date,
            paid_at__lte=end_date
        ).select_related('order', 'order__client').order_by('-paid_at')[:50]
        
        for payment in payments:
            data.append({
                'date': payment.paid_at.strftime('%Y-%m-%d'),
                'category': 'Заказы студентов',
                'amount': float(payment.amount),
                'description': payment.order.title or f'Заказ #{payment.order.id}',
                'order_id': payment.order.id,
                'client_name': f'{payment.order.client.first_name} {payment.order.client.last_name}'.strip() or payment.order.client.username
            })
        
        # Доходы от продаж готовых работ (пока не реализовано)
        # purchases = Purchase.objects.filter(...)
        
        # Сортируем по дате (новые первыми)
        data.sort(key=lambda x: x['date'], reverse=True)
        
        return Response(data[:20])  # Возвращаем последние 20 записей
    
    @action(detail=False, methods=['get'])
    def expense(self, request):
        """Получить детализацию расходов"""
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        # Определяем период
        if start_date_str and end_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
            except:
                # Последние 30 дней по умолчанию
                end_date = timezone.now()
                start_date = end_date - timedelta(days=30)
        else:
            # Последние 30 дней по умолчанию
            end_date = timezone.now()
            start_date = end_date - timedelta(days=30)
        
        data = []
        
        # Получаем выплаты экспертам (на основе завершенных заказов)
        completed_orders = Order.objects.filter(
            status='completed',
            updated_at__gte=start_date,
            updated_at__lte=end_date,
            expert__isnull=False
        ).select_related('expert', 'client')[:20]
        
        for order in completed_orders:
            # Примерная выплата эксперту (60% от стоимости заказа)
            expert_payment = (order.final_price or order.budget) * Decimal('0.60')
            data.append({
                'date': order.updated_at.strftime('%Y-%m-%d'),
                'category': 'Выплаты экспертам',
                'amount': float(expert_payment),
                'description': f'Выплата за заказ: {order.title or f"Заказ #{order.id}"}',
                'recipient_name': f'{order.expert.first_name} {order.expert.last_name}'.strip() or order.expert.username,
                'order_id': order.id
            })
        
        # Добавляем примерные операционные расходы
        # (в реальной системе это должно браться из отдельной модели расходов)
        current_date = start_date
        while current_date <= end_date:
            if current_date.day == 1:  # Ежемесячные расходы
                data.append({
                    'date': current_date.strftime('%Y-%m-%d'),
                    'category': 'Операционные расходы',
                    'amount': 25000.0,
                    'description': 'Хостинг, домены, серверы',
                    'recipient_name': 'IT-инфраструктура',
                    'service_type': 'hosting'
                })
                
                data.append({
                    'date': current_date.strftime('%Y-%m-%d'),
                    'category': 'Маркетинг и реклама',
                    'amount': 50000.0,
                    'description': 'Контекстная реклама и продвижение',
                    'recipient_name': 'Рекламные сервисы',
                    'campaign_id': f'CAMPAIGN_{current_date.strftime("%Y%m")}'
                })
            
            current_date += timedelta(days=1)
        
        # Комиссии партнерам
        User = get_user_model()
        partner_payments = Payment.objects.filter(
            status='completed',
            paid_at__gte=start_date,
            paid_at__lte=end_date,
            order__client__partner__isnull=False
        ).select_related('order__client__partner')[:10]
        
        for payment in partner_payments:
            commission = payment.amount * Decimal('0.10')  # 10% комиссия
            data.append({
                'date': payment.paid_at.strftime('%Y-%m-%d'),
                'category': 'Комиссии партнерам',
                'amount': float(commission),
                'description': f'Комиссия за привлеченного клиента',
                'recipient_name': f'{payment.order.client.partner.first_name} {payment.order.client.partner.last_name}'.strip() or payment.order.client.partner.username,
                'partner_code': payment.order.client.partner.referral_code or f'PARTNER_{payment.order.client.partner.id}'
            })
        
        # Сортируем по дате (новые первыми)
        data.sort(key=lambda x: x['date'], reverse=True)
        
        return Response(data[:20])  # Возвращаем последние 20 записей


class DirectorPartnersViewSet(viewsets.ViewSet):
    """ViewSet для управления партнерами"""
    permission_classes = [permissions.IsAuthenticated, IsDirector]
    
    def list(self, request):
        """Получить список партнеров"""
        User = get_user_model()
        partners = User.objects.filter(role='partner', is_active=True)
        
        # Добавляем вычисляемые поля
        for partner in partners:
            partner.total_referrals = User.objects.filter(partner=partner).count()
            partner.active_referrals = User.objects.filter(partner=partner, is_active=True).count()
            partner.total_earnings = Decimal('0.00')  # TODO: вычислить из реальных данных
        
        serializer = PartnerSerializer(partners, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def turnover(self, request):
        """Получить оборот по всем партнерам"""
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        # Определяем период
        if start_date_str and end_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
            except:
                # Текущий месяц по умолчанию
                now = timezone.now()
                start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                if now.month == 12:
                    end_date = now.replace(year=now.year + 1, month=1, day=1) - timedelta(days=1)
                else:
                    end_date = now.replace(month=now.month + 1, day=1) - timedelta(days=1)
        else:
            # Текущий месяц по умолчанию
            now = timezone.now()
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if now.month == 12:
                end_date = now.replace(year=now.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                end_date = now.replace(month=now.month + 1, day=1) - timedelta(days=1)
        
        # Получаем реальных партнеров из БД
        User = get_user_model()
        partners = User.objects.filter(role='partner', is_active=True)
        
        partners_data = []
        total_turnover = Decimal('0.00')
        total_commission = Decimal('0.00')
        
        for partner in partners:
            # Получаем оборот от клиентов этого партнера
            partner_turnover = Payment.objects.filter(
                status='completed',
                paid_at__gte=start_date,
                paid_at__lte=end_date,
                order__client__partner=partner
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Комиссия партнера (обычно 10%)
            commission_rate = partner.partner_commission_rate or Decimal('10.00')
            partner_commission = partner_turnover * (commission_rate / 100)
            
            # Количество рефералов
            referrals_count = User.objects.filter(partner=partner).count()
            
            if partner_turnover > 0 or referrals_count > 0:  # Показываем только активных партнеров
                partners_data.append({
                    'partner_id': partner.id,
                    'partner_name': f'{partner.first_name} {partner.last_name}'.strip() or partner.username,
                    'partner_email': partner.email,
                    'referrals_count': referrals_count,
                    'turnover': partner_turnover,
                    'commission': partner_commission
                })
                
                total_turnover += partner_turnover
                total_commission += partner_commission
        
        data = {
            'period': f"{start_date.strftime('%Y-%m-%d')} - {end_date.strftime('%Y-%m-%d')}",
            'total_turnover': total_turnover,
            'total_commission': total_commission,
            'partners': partners_data
        }
        return Response(data)


class DirectorStatisticsViewSet(viewsets.ViewSet):
    """ViewSet для общей статистики"""
    permission_classes = [permissions.IsAuthenticated, IsDirector]
    
    @action(detail=False, methods=['get'])
    def kpi(self, request):
        """Получить ключевые показатели эффективности"""
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        # Определяем период
        if start_date_str and end_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
            except:
                # Текущий месяц по умолчанию
                now = timezone.now()
                start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                if now.month == 12:
                    end_date = now.replace(year=now.year + 1, month=1, day=1) - timedelta(days=1)
                else:
                    end_date = now.replace(month=now.month + 1, day=1) - timedelta(days=1)
        else:
            # Текущий месяц по умолчанию
            now = timezone.now()
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if now.month == 12:
                end_date = now.replace(year=now.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                end_date = now.replace(month=now.month + 1, day=1) - timedelta(days=1)
        
        User = get_user_model()
        
        # Реальные данные из БД
        total_clients = User.objects.filter(role='client').count()
        total_experts = User.objects.filter(role='expert').count()
        total_partners = User.objects.filter(role='partner').count()
        
        # Общий оборот
        orders_turnover = Payment.objects.filter(
            status='completed',
            paid_at__gte=start_date,
            paid_at__lte=end_date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        shop_turnover = Purchase.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date,
            status='completed'
        ).aggregate(total=Sum('price'))['total'] or Decimal('0.00')
        
        total_turnover = orders_turnover + shop_turnover
        
        # Чистая прибыль (примерно 36% от оборота)
        net_profit = total_turnover * Decimal('0.36')
        
        # Активные заказы
        active_orders = Order.objects.filter(
            status__in=['new', 'waiting_payment', 'in_progress', 'review', 'revision']
        ).count()
        
        # Средний чек
        if orders_turnover > 0:
            orders_count = Payment.objects.filter(
                status='completed',
                paid_at__gte=start_date,
                paid_at__lte=end_date
            ).count()
            average_check = orders_turnover / orders_count if orders_count > 0 else Decimal('0.00')
        else:
            average_check = Decimal('0.00')
        
        # Конверсия (примерная)
        total_orders = Order.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date
        ).count()
        
        completed_orders = Order.objects.filter(
            status='completed',
            updated_at__gte=start_date,
            updated_at__lte=end_date
        ).count()
        
        conversion_rate = (completed_orders / total_orders * 100) if total_orders > 0 else 0.0
        
        data = {
            'total_turnover': total_turnover,
            'net_profit': net_profit,
            'active_orders': active_orders,
            'total_clients': total_clients,
            'total_experts': total_experts,
            'total_partners': total_partners,
            'conversion_rate': round(conversion_rate, 1),
            'average_check': average_check
        }
        
        serializer = DirectorStatsSerializer(data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Получить сводку по всем показателям"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Получить сводку по всем показателям"""
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        # Получаем KPI данные
        kpi_response = self.kpi(request)
        kpi_data = kpi_response.data
        
        # Определяем период для сравнения
        if start_date_str and end_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
            except:
                now = timezone.now()
                start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                if now.month == 12:
                    end_date = now.replace(year=now.year + 1, month=1, day=1) - timedelta(days=1)
                else:
                    end_date = now.replace(month=now.month + 1, day=1) - timedelta(days=1)
        else:
            now = timezone.now()
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if now.month == 12:
                end_date = now.replace(year=now.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                end_date = now.replace(month=now.month + 1, day=1) - timedelta(days=1)
        
        # Данные за предыдущий период
        period_length = (end_date - start_date).days
        prev_start = start_date - timedelta(days=period_length + 1)
        prev_end = start_date - timedelta(days=1)
        
        # Предыдущий оборот
        prev_orders_turnover = Payment.objects.filter(
            status='completed',
            paid_at__gte=prev_start,
            paid_at__lte=prev_end
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        prev_shop_turnover = Decimal('0.00')
        
        prev_total_turnover = prev_orders_turnover + prev_shop_turnover
        prev_net_profit = prev_total_turnover * Decimal('0.36')
        
        prev_orders_count = Payment.objects.filter(
            status='completed',
            paid_at__gte=prev_start,
            paid_at__lte=prev_end
        ).count()
        
        prev_average_check = prev_orders_turnover / prev_orders_count if prev_orders_count > 0 else Decimal('0.00')
        
        # Вычисляем изменения
        current_turnover = Decimal(str(kpi_data['total_turnover']))
        current_profit = Decimal(str(kpi_data['net_profit']))
        current_orders = kpi_data['active_orders']
        current_average_check = Decimal(str(kpi_data['average_check']))
        
        turnover_change = float((current_turnover - prev_total_turnover) / prev_total_turnover * 100) if prev_total_turnover > 0 else 100.0
        profit_change = float((current_profit - prev_net_profit) / prev_net_profit * 100) if prev_net_profit > 0 else 100.0
        average_check_change = float((current_average_check - prev_average_check) / prev_average_check * 100) if prev_average_check > 0 else 100.0
        
        # Тренды (последние 7 дней)
        trends_start = end_date - timedelta(days=6)
        trends = {
            'turnover': [],
            'profit': [],
            'orders': []
        }
        
        current_date = trends_start
        while current_date <= end_date:
            day_start = current_date
            day_end = current_date.replace(hour=23, minute=59, second=59)
            
            day_turnover = Payment.objects.filter(
                status='completed',
                paid_at__gte=day_start,
                paid_at__lte=day_end
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            day_shop = Decimal('0.00')
            
            day_total = day_turnover + day_shop
            day_profit = day_total * Decimal('0.36')
            
            day_orders = Order.objects.filter(
                created_at__gte=day_start,
                created_at__lte=day_end
            ).count()
            
            trends['turnover'].append({
                'date': current_date.strftime('%Y-%m-%d'),
                'value': float(day_total)
            })
            trends['profit'].append({
                'date': current_date.strftime('%Y-%m-%d'),
                'value': float(day_profit)
            })
            trends['orders'].append({
                'date': current_date.strftime('%Y-%m-%d'),
                'value': day_orders
            })
            
            current_date += timedelta(days=1)
        
        data = {
            'period': {
                'start': start_date.strftime('%Y-%m-%d'),
                'end': end_date.strftime('%Y-%m-%d')
            },
            'kpi': kpi_data,
            'previous_period': {
                'total_turnover': float(prev_total_turnover),
                'net_profit': float(prev_net_profit),
                'active_orders': prev_orders_count,
                'average_check': float(prev_average_check)
            },
            'turnover_change': round(turnover_change, 2),
            'profit_change': round(profit_change, 2),
            'orders_change': 0.0,  # Сложно вычислить без исторических данных
            'average_check_change': round(average_check_change, 2),
            'trends': trends
        }
        
        return Response(data)
        
        return Response(data)

