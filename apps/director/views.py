from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Sum, Count, Q, Avg
from django.db.models.functions import TruncMonth
from datetime import datetime, timedelta
from decimal import Decimal

from apps.experts.models import ExpertApplication
from apps.experts.serializers import ExpertApplicationSerializer
from apps.users.serializers import UserSerializer
from apps.orders.models import Order
from apps.users.models import User, PartnerEarning


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
        """Общий оборот за месяц с детализацией по дням"""
        period = request.query_params.get('period')
        
        if period:
            try:
                year, month = period.split('-')
                start_date = datetime(int(year), int(month), 1)
                if int(month) == 12:
                    end_date = datetime(int(year) + 1, 1, 1) - timedelta(days=1)
                else:
                    end_date = datetime(int(year), int(month) + 1, 1) - timedelta(days=1)
            except (ValueError, IndexError):
                return Response({'error': 'Неверный формат периода. Используйте YYYY-MM'}, 
                              status=status.HTTP_400_BAD_REQUEST)
        else:
            # Текущий месяц
            now = timezone.now()
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if now.month == 12:
                end_date = now.replace(year=now.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                end_date = now.replace(month=now.month + 1, day=1) - timedelta(days=1)

        # Получаем завершенные заказы за период
        completed_orders = Order.objects.filter(
            status='completed',
            updated_at__gte=start_date,
            updated_at__lte=end_date
        )

        total_turnover = completed_orders.aggregate(
            total=Sum('budget')
        )['total'] or Decimal('0')

        orders_count = completed_orders.count()
        
        # Получаем данные по дням
        daily_data = []
        current_date = start_date
        while current_date <= end_date:
            day_start = current_date
            day_end = current_date + timedelta(days=1)
            
            day_orders = completed_orders.filter(
                updated_at__gte=day_start,
                updated_at__lt=day_end
            )
            
            day_turnover = day_orders.aggregate(total=Sum('budget'))['total'] or Decimal('0')
            
            daily_data.append({
                'date': current_date.strftime('%d.%m'),
                'amount': float(day_turnover)
            })
            
            current_date += timedelta(days=1)
        
        # Рассчитываем изменение к предыдущему периоду
        prev_start = start_date - timedelta(days=(end_date - start_date).days + 1)
        prev_end = start_date - timedelta(days=1)
        
        prev_orders = Order.objects.filter(
            status='completed',
            updated_at__gte=prev_start,
            updated_at__lte=prev_end
        )
        
        prev_turnover = prev_orders.aggregate(total=Sum('budget'))['total'] or Decimal('0')
        
        if prev_turnover > 0:
            change_percent = float(((total_turnover - prev_turnover) / prev_turnover) * 100)
        else:
            change_percent = 0.0
        
        return Response({
            'period': period or start_date.strftime('%Y-%m'),
            'total_turnover': float(total_turnover),
            'orders_count': orders_count,
            'start_date': start_date.date(),
            'end_date': end_date.date(),
            'change_percent': round(change_percent, 2),
            'daily_data': daily_data
        })

    @action(detail=False, methods=['get'])
    def net_profit(self, request):
        """Чистая прибыль за период"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response({'error': 'Укажите start_date и end_date'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
        except ValueError:
            return Response({'error': 'Неверный формат даты. Используйте YYYY-MM-DD'}, 
                          status=status.HTTP_400_BAD_REQUEST)

        # Доходы - завершенные заказы
        completed_orders = Order.objects.filter(
            status='completed',
            updated_at__gte=start_dt,
            updated_at__lte=end_dt
        )
        
        total_income = completed_orders.aggregate(
            total=Sum('budget')
        )['total'] or Decimal('0')

        # Расходы - выплаты экспертам (примерно 70% от суммы заказа)
        expert_payments = total_income * Decimal('0.7')
        
        # Партнерские выплаты
        partner_payments = Decimal('0')
        try:
            partner_payments = PartnerEarning.objects.filter(
                created_at__gte=start_dt,
                created_at__lte=end_dt,
                is_paid=True
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        except Exception:
            # Таблица может не существовать
            pass

        # Чистая прибыль
        net_profit = total_income - expert_payments - partner_payments

        return Response({
            'period': f"{start_date} - {end_date}",
            'total_income': float(total_income),
            'expert_payments': float(expert_payments),
            'partner_payments': float(partner_payments),
            'net_profit': float(net_profit),
            'profit_margin': float((net_profit / total_income * 100) if total_income > 0 else 0)
        })

    @action(detail=False, methods=['get'])
    def income(self, request):
        """Детализация доходов"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response({'error': 'Укажите start_date и end_date'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
        except ValueError:
            return Response({'error': 'Неверный формат даты. Используйте YYYY-MM-DD'}, 
                          status=status.HTTP_400_BAD_REQUEST)

        # Группируем доходы по дням
        daily_income = Order.objects.filter(
            status='completed',
            updated_at__gte=start_dt,
            updated_at__lte=end_dt
        ).extra(
            select={'day': 'DATE(updated_at)'}
        ).values('day').annotate(
            amount=Sum('budget'),
            count=Count('id')
        ).order_by('day')

        income_details = []
        for item in daily_income:
            income_details.append({
                'date': item['day'],
                'amount': float(item['amount']),
                'orders_count': item['count'],
                'source': 'orders'
            })

        return Response(income_details)

    @action(detail=False, methods=['get'])
    def expense(self, request):
        """Детализация расходов"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response({'error': 'Укажите start_date и end_date'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
        except ValueError:
            return Response({'error': 'Неверный формат даты. Используйте YYYY-MM-DD'}, 
                          status=status.HTTP_400_BAD_REQUEST)

        expense_details = []

        # Партнерские выплаты
        partner_expenses = []
        try:
            partner_expenses = PartnerEarning.objects.filter(
                created_at__gte=start_dt,
                created_at__lte=end_dt,
                is_paid=True
            ).extra(
                select={'day': 'DATE(created_at)'}
            ).values('day').annotate(
                amount=Sum('amount'),
                count=Count('id')
            ).order_by('day')
        except Exception:
            # Таблица может не существовать
            pass

        for item in partner_expenses:
            expense_details.append({
                'date': item['day'],
                'amount': float(item['amount']),
                'count': item['count'],
                'category': 'partner_payments',
                'description': 'Партнерские выплаты'
            })

        # Выплаты экспертам (расчетные)
        expert_payments = Order.objects.filter(
            status='completed',
            updated_at__gte=start_dt,
            updated_at__lte=end_dt
        ).extra(
            select={'day': 'DATE(updated_at)'}
        ).values('day').annotate(
            total_amount=Sum('budget'),
            count=Count('id')
        ).order_by('day')

        for item in expert_payments:
            expert_payment_amount = float(item['total_amount']) * 0.7  # 70% экспертам
            expense_details.append({
                'date': item['day'],
                'amount': expert_payment_amount,
                'count': item['count'],
                'category': 'expert_payments',
                'description': 'Выплаты экспертам'
            })

        return Response(expense_details)


class DirectorPartnersViewSet(viewsets.ViewSet):
    """ViewSet для управления партнерами"""
    permission_classes = [permissions.IsAuthenticated, IsDirector]

    def list(self, request):
        """Список всех партнеров"""
        partners = User.objects.filter(role='partner').annotate(
            total_referrals_count=Count('referrals'),
            total_earnings_sum=Sum('earnings__amount')
        )
        
        partners_data = []
        for partner in partners:
            partners_data.append({
                'id': partner.id,
                'username': partner.username,
                'email': partner.email,
                'first_name': partner.first_name,
                'last_name': partner.last_name,
                'phone': partner.phone,
                'is_active': partner.is_active,
                'referral_code': partner.referral_code,
                'commission_percent': float(partner.partner_commission_rate),
                'total_referrals': partner.total_referrals_count or 0,
                'active_referrals': partner.active_referrals,
                'total_earnings': float(partner.total_earnings_sum or 0),
                'date_joined': partner.date_joined
            })
        
        return Response(partners_data)

    @action(detail=False, methods=['get'])
    def turnover(self, request):
        """Оборот по всем партнерам за период"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response({'error': 'Укажите start_date и end_date'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
        except ValueError:
            return Response({'error': 'Неверный формат даты. Используйте YYYY-MM-DD'}, 
                          status=status.HTTP_400_BAD_REQUEST)

        # Получаем обороты по партнерам (пока заглушка)
        partner_turnovers = []
        try:
            partner_turnovers = PartnerEarning.objects.filter(
                created_at__gte=start_dt,
                created_at__lte=end_dt
            ).values(
                'partner__id',
                'partner__username',
                'partner__first_name',
                'partner__last_name'
            ).annotate(
                total_turnover=Sum('source_amount'),
                total_commission=Sum('amount'),
                orders_count=Count('order', distinct=True)
            ).order_by('-total_turnover')
        except Exception:
            # Таблица может не существовать
            pass

        partners_data = []
        total_turnover = 0
        total_commission = 0

        for item in partner_turnovers:
            turnover = float(item['total_turnover'] or 0)
            commission = float(item['total_commission'] or 0)
            
            partners_data.append({
                'partner_id': item['partner__id'],
                'partner_name': f"{item['partner__first_name'] or ''} {item['partner__last_name'] or ''}".strip() or item['partner__username'],
                'turnover': turnover,
                'commission': commission,
                'orders_count': item['orders_count']
            })
            
            total_turnover += turnover
            total_commission += commission

        return Response({
            'period': f"{start_date} - {end_date}",
            'partners': partners_data,
            'total_turnover': total_turnover,
            'total_commission': total_commission,
            'partners_count': len(partners_data)
        })

    @action(detail=True, methods=['get'])
    def turnover(self, request, pk=None):
        """Оборот конкретного партнера"""
        try:
            partner = User.objects.get(id=pk, role='partner')
        except User.DoesNotExist:
            return Response({'error': 'Партнер не найден'}, status=status.HTTP_404_NOT_FOUND)

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response({'error': 'Укажите start_date и end_date'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
        except ValueError:
            return Response({'error': 'Неверный формат даты. Используйте YYYY-MM-DD'}, 
                          status=status.HTTP_400_BAD_REQUEST)

        earnings = []
        try:
            earnings = PartnerEarning.objects.filter(
                partner=partner,
                created_at__gte=start_dt,
                created_at__lte=end_dt
            )
        except Exception:
            # Таблица может не существовать
            pass

        total_turnover = Decimal('0')
        total_commission = Decimal('0')
        orders_count = 0
        
        if earnings:
            total_turnover = earnings.aggregate(
                turnover=Sum('source_amount')
            )['turnover'] or Decimal('0')

            total_commission = earnings.aggregate(
                commission=Sum('amount')
            )['commission'] or Decimal('0')

            orders_count = earnings.filter(order__isnull=False).count()

        return Response({
            'partner_id': partner.id,
            'partner_name': f"{partner.first_name or ''} {partner.last_name or ''}".strip() or partner.username,
            'period': f"{start_date} - {end_date}",
            'total_turnover': float(total_turnover),
            'total_commission': float(total_commission),
            'orders_count': orders_count,
            'commission_rate': float(partner.partner_commission_rate)
        })

    @action(detail=True, methods=['patch'])
    def commission(self, request, pk=None):
        """Обновление комиссии партнера"""
        try:
            partner = User.objects.get(id=pk, role='partner')
        except User.DoesNotExist:
            return Response({'error': 'Партнер не найден'}, status=status.HTTP_404_NOT_FOUND)

        commission_percent = request.data.get('commission_percent')
        if commission_percent is None:
            return Response({'error': 'Укажите commission_percent'}, 
                          status=status.HTTP_400_BAD_REQUEST)

        try:
            commission_percent = float(commission_percent)
            if commission_percent < 0 or commission_percent > 100:
                raise ValueError()
        except (ValueError, TypeError):
            return Response({'error': 'Комиссия должна быть числом от 0 до 100'}, 
                          status=status.HTTP_400_BAD_REQUEST)

        partner.partner_commission_rate = Decimal(str(commission_percent))
        partner.save(update_fields=['partner_commission_rate'])

        return Response({
            'id': partner.id,
            'username': partner.username,
            'commission_percent': float(partner.partner_commission_rate)
        })

    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """Переключение статуса партнера (активный/неактивный)"""
        try:
            partner = User.objects.get(id=pk, role='partner')
        except User.DoesNotExist:
            return Response({'error': 'Партнер не найден'}, status=status.HTTP_404_NOT_FOUND)

        partner.is_active = not partner.is_active
        partner.save(update_fields=['is_active'])

        return Response({
            'id': partner.id,
            'username': partner.username,
            'is_active': partner.is_active,
            'status': 'active' if partner.is_active else 'inactive'
        })


class DirectorStatisticsViewSet(viewsets.ViewSet):
    """ViewSet для общей статистики"""
    permission_classes = [permissions.IsAuthenticated, IsDirector]

    @action(detail=False, methods=['get'])
    def kpi(self, request):
        """Ключевые показатели эффективности"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response({'error': 'Укажите start_date и end_date'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
        except ValueError:
            return Response({'error': 'Неверный формат даты. Используйте YYYY-MM-DD'}, 
                          status=status.HTTP_400_BAD_REQUEST)

        # Общий оборот
        completed_orders = Order.objects.filter(
            status='completed',
            updated_at__gte=start_dt,
            updated_at__lte=end_dt
        )
        
        total_turnover = completed_orders.aggregate(
            total=Sum('budget')
        )['total'] or Decimal('0')

        # Чистая прибыль (упрощенный расчет)
        expert_payments = total_turnover * Decimal('0.7')
        # Партнерские выплаты
        partner_payments = Decimal('0')
        try:
            partner_payments = PartnerEarning.objects.filter(
                created_at__gte=start_dt,
                created_at__lte=end_dt,
                is_paid=True
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        except Exception:
            # Таблица может не существовать
            pass
        
        net_profit = total_turnover - expert_payments - partner_payments

        # Активные заказы
        active_orders = Order.objects.filter(
            status__in=['pending', 'in_progress', 'review']
        ).count()

        # Средний чек
        orders_count = completed_orders.count()
        average_check = total_turnover / orders_count if orders_count > 0 else Decimal('0')

        # Количество пользователей
        total_clients = User.objects.filter(role='client').count()
        total_experts = User.objects.filter(role='expert').count()
        total_partners = User.objects.filter(role='partner').count()

        # Конверсия (упрощенный расчет)
        total_orders = Order.objects.filter(
            created_at__gte=start_dt,
            created_at__lte=end_dt
        ).count()
        conversion_rate = (orders_count / total_orders * 100) if total_orders > 0 else 0

        return Response({
            'total_turnover': float(total_turnover),
            'net_profit': float(net_profit),
            'active_orders': active_orders,
            'average_check': float(average_check),
            'total_clients': total_clients,
            'total_experts': total_experts,
            'total_partners': total_partners,
            'conversion_rate': float(conversion_rate),
            'period': f"{start_date} - {end_date}"
        })

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Сводка по всем показателям с сравнением с предыдущим периодом"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response({'error': 'Укажите start_date и end_date'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
        except ValueError:
            return Response({'error': 'Неверный формат даты. Используйте YYYY-MM-DD'}, 
                          status=status.HTTP_400_BAD_REQUEST)

        # Вычисляем предыдущий период той же длительности
        period_length = (end_dt - start_dt).days
        prev_end_dt = start_dt - timedelta(days=1)
        prev_start_dt = prev_end_dt - timedelta(days=period_length)

        # Функция для получения KPI за период
        def get_period_kpi(start, end):
            completed_orders = Order.objects.filter(
                status='completed',
                updated_at__gte=start,
                updated_at__lte=end
            )
            
            total_turnover = completed_orders.aggregate(
                total=Sum('budget')
            )['total'] or Decimal('0')

            expert_payments = total_turnover * Decimal('0.7')
            # Партнерские выплаты
            partner_payments = Decimal('0')
            try:
                partner_payments = PartnerEarning.objects.filter(
                    created_at__gte=start,
                    created_at__lte=end,
                    is_paid=True
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            except Exception:
                # Таблица может не существовать
                pass
            
            net_profit = total_turnover - expert_payments - partner_payments
            orders_count = completed_orders.count()
            average_check = total_turnover / orders_count if orders_count > 0 else Decimal('0')

            return {
                'total_turnover': float(total_turnover),
                'net_profit': float(net_profit),
                'orders_count': orders_count,
                'average_check': float(average_check)
            }

        # Текущий и предыдущий периоды
        current_kpi = get_period_kpi(start_dt, end_dt)
        previous_kpi = get_period_kpi(prev_start_dt, prev_end_dt)

        # Вычисляем изменения в процентах
        def calculate_change(current, previous):
            if previous == 0:
                return 100.0 if current > 0 else 0.0
            return ((current - previous) / previous) * 100

        turnover_change = calculate_change(current_kpi['total_turnover'], previous_kpi['total_turnover'])
        profit_change = calculate_change(current_kpi['net_profit'], previous_kpi['net_profit'])
        orders_change = calculate_change(current_kpi['orders_count'], previous_kpi['orders_count'])
        average_check_change = calculate_change(current_kpi['average_check'], previous_kpi['average_check'])

        # Дополнительные показатели
        active_orders = Order.objects.filter(
            status__in=['pending', 'in_progress', 'review']
        ).count()

        total_clients = User.objects.filter(role='client').count()
        total_experts = User.objects.filter(role='expert').count()
        total_partners = User.objects.filter(role='partner').count()

        return Response({
            'kpi': {
                'total_turnover': current_kpi['total_turnover'],
                'net_profit': current_kpi['net_profit'],
                'active_orders': active_orders,
                'average_check': current_kpi['average_check'],
                'total_clients': total_clients,
                'total_experts': total_experts,
                'total_partners': total_partners,
                'conversion_rate': 0.0  # Заглушка
            },
            'previous_period': {
                'total_turnover': previous_kpi['total_turnover'],
                'net_profit': previous_kpi['net_profit'],
                'orders_count': previous_kpi['orders_count'],
                'average_check': previous_kpi['average_check']
            },
            'changes': {
                'turnover_change': round(turnover_change, 2),
                'profit_change': round(profit_change, 2),
                'orders_change': round(orders_change, 2),
                'average_check_change': round(average_check_change, 2)
            },
            'period': f"{start_date} - {end_date}",
            'previous_period_dates': f"{prev_start_dt.strftime('%Y-%m-%d')} - {prev_end_dt.strftime('%Y-%m-%d')}"
        })

