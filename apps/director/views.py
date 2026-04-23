from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Sum, Count, Q, Avg
from django.db.models.functions import TruncMonth
from datetime import datetime, timedelta
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

from apps.experts.models import ExpertApplication
from apps.experts.serializers import ExpertApplicationSerializer
from apps.users.serializers import UserSerializer
from apps.orders.models import Order
from apps.users.models import User, PartnerEarning
from .models import (
    InternalMessage, 
    MeetingRequest, 
    MessageAttachment, 
    DirectorChatRoom, 
    DirectorChatMessage,
    ManualIncome,
    ManualExpense,
)
from .serializers import (
    InternalMessageSerializer,
    InternalMessageCreateSerializer,
    DirectorChatRoomSerializer,
    DirectorChatMessageSerializer,
)


class IsDirector(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and (user.is_superuser or getattr(user, 'role', None) == 'director')
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
        
        # Помечаем анкету как требующую доработки и сохраняем комментарий директора
        application.status = 'needs_revision'
        application.rejection_reason = comment
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
        deactivated_expert_filter = Q(role='client', expert_application__status='deactivated') | Q(
            role='client',
            application_approved=False,
            has_submitted_application=True
        )
        
        # Для действия restore разрешаем доступ к архивированным пользователям И деактивированным экспертам
        if self.action == 'restore':
            return User.objects.filter(
                Q(is_active=False) |  # Архивированные
                deactivated_expert_filter  # Деактивированные эксперты
            ).exclude(
                Q(role='client') & ~deactivated_expert_filter  # Обычные клиенты
            )
        
        # Для действия activate разрешаем доступ к деактивированным экспертам
        if self.action == 'activate':
            return User.objects.all().exclude(
                Q(role='client') & ~deactivated_expert_filter  # Обычные клиенты
            ).distinct()
        
        # Показываем всех сотрудников:
        # - Все роли кроме обычных клиентов
        # - Включаем архивированных и деактивированных экспертов для фильтров
        return User.objects.exclude(
            Q(role='client') & ~deactivated_expert_filter
        ).distinct()

    def get_serializer_class(self):
        return UserSerializer

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Активация сотрудника или восстановление эксперта"""
        user = self.get_object()
        applications_qs = ExpertApplication.objects.filter(expert=user).order_by('-updated_at', '-id')
        application = applications_qs.first()
        
        # Для бывшего/деактивированного эксперта всегда восстанавливаем expert + approved
        is_deactivated_expert = (
            (
                user.role == 'client' and (
                    application is not None or user.has_submitted_application or user.application_approved is False
                )
            ) or (
                user.role == 'expert' and application is not None and application.status != 'approved'
            )
        )
        if is_deactivated_expert:
            if application is not None:
                reviewed_at = timezone.now()
                applications_qs.update(
                    status='approved',
                    rejection_reason='',
                    reviewed_by=request.user,
                    reviewed_at=reviewed_at,
                )
                application.refresh_from_db()
            else:
                full_name = f"{(user.last_name or '').strip()} {(user.first_name or '').strip()}".strip() or user.username
                application = ExpertApplication.objects.create(
                    expert=user,
                    full_name=full_name,
                    work_experience_years=user.experience_years or 0,
                    status='approved',
                    rejection_reason='',
                    reviewed_by=request.user,
                    reviewed_at=timezone.now(),
                )

            user.role = 'expert'
            user.application_approved = True
            user.has_submitted_application = True
            user.application_reviewed_at = application.reviewed_at or timezone.now()
            user.application_reviewed_by = request.user
            user.is_active = True
            user.save(update_fields=['role', 'application_approved', 'has_submitted_application', 'application_reviewed_at', 'application_reviewed_by', 'is_active'])

            from apps.notifications.services import NotificationService
            NotificationService.notify_application_approved(application)
        else:
            # Обычная активация аккаунта
            user.is_active = True
            user.save(update_fields=['is_active'])
        
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Деактивация эксперта - убирает роль expert, но не деактивирует аккаунт"""
        user = self.get_object()
        
        logger.info(f"[DEACTIVATE] Деактивация пользователя ID={user.id}, role={user.role}, username={user.username}")
        
        # Если это эксперт, меняем роль на client и деактивируем анкету
        if user.role == 'expert':
            logger.info(f"[DEACTIVATE] Пользователь является экспертом, меняем роль на client")
            user.role = 'client'
            user.application_approved = False
            user.has_submitted_application = True
            user.application_reviewed_at = timezone.now()
            user.application_reviewed_by = request.user
            user.save(update_fields=['role', 'application_approved', 'has_submitted_application', 'application_reviewed_at', 'application_reviewed_by'])
            
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
                full_name = f"{(user.last_name or '').strip()} {(user.first_name or '').strip()}".strip() or user.username
                application = ExpertApplication.objects.create(
                    expert=user,
                    full_name=full_name,
                    work_experience_years=user.experience_years or 0,
                    status='deactivated',
                    rejection_reason='Деактивирован администратором',
                    reviewed_by=request.user,
                    reviewed_at=timezone.now(),
                )
                from apps.notifications.services import NotificationService
                NotificationService.notify_application_rejected(application, 'Ваш статус эксперта был деактивирован администратором')
        else:
            # Для других ролей просто деактивируем аккаунт
            logger.info(f"[DEACTIVATE] Пользователь не эксперт (role={user.role}), деактивируем аккаунт")
            user.is_active = False
            user.save(update_fields=['is_active'])
        
        logger.info(f"[DEACTIVATE] Деактивация завершена. is_active={user.is_active}, role={user.role}")
        
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
        
        # Если это бывший эксперт (client с application_approved=False),
        # восстанавливаем и сразу одобряем анкету
        if user.role == 'client' and user.application_approved == False and user.has_submitted_application:
            try:
                application = ExpertApplication.objects.get(expert=user)
                application.status = 'approved'
                application.rejection_reason = ''
                application.reviewed_by = request.user
                application.reviewed_at = timezone.now()
                application.save(update_fields=['status', 'rejection_reason', 'reviewed_by', 'reviewed_at', 'updated_at'])

                user.role = 'expert'
                user.application_approved = True
                user.has_submitted_application = True
                user.is_active = True
                user.application_reviewed_at = application.reviewed_at
                user.application_reviewed_by = request.user
                user.save(update_fields=['role', 'application_approved', 'has_submitted_application', 'is_active', 'application_reviewed_at', 'application_reviewed_by'])

                from apps.notifications.services import NotificationService
                NotificationService.notify_application_approved(application)
            except ExpertApplication.DoesNotExist:
                full_name = f"{(user.last_name or '').strip()} {(user.first_name or '').strip()}".strip() or user.username
                application = ExpertApplication.objects.create(
                    expert=user,
                    full_name=full_name,
                    work_experience_years=user.experience_years or 0,
                    status='approved',
                    rejection_reason='',
                    reviewed_by=request.user,
                    reviewed_at=timezone.now(),
                )

                user.role = 'expert'
                user.application_approved = True
                user.has_submitted_application = True
                user.is_active = True
                user.application_reviewed_at = application.reviewed_at
                user.application_reviewed_by = request.user
                user.save(update_fields=['role', 'application_approved', 'has_submitted_application', 'is_active', 'application_reviewed_at', 'application_reviewed_by'])

                from apps.notifications.services import NotificationService
                NotificationService.notify_application_approved(application)
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
    
    def destroy(self, request, pk=None):
        """Полное удаление сотрудника из системы (только для архивированных)"""
        user = self.get_object()
        
        # Проверяем, что пользователь архивирован
        if user.is_active:
            return Response(
                {'detail': 'Можно удалять только архивированных сотрудников'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Удаляем пользователя
        user.delete()
        
        return Response(status=status.HTTP_204_NO_CONTENT)

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
        city = data.get('city') or None  # Добавляем поле города

        if not (email or phone):
            return Response({'detail': 'Укажите email или телефон'}, status=status.HTTP_400_BAD_REQUEST)
        if not role:
            return Response({'detail': 'Укажите роль'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Проверяем обязательность города для партнеров
        if role == 'partner' and not city:
            return Response({'detail': 'Для партнеров обязательно указание города проживания'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Генерируем пароль если не указан
        if not password:
            import secrets, string
            alphabet = string.ascii_letters + string.digits + '!@#$%^&*'
            password = ''.join(secrets.choice(alphabet) for _ in range(12))

        allowed_roles = {'admin', 'arbitrator', 'partner', 'expert'}
        if role not in allowed_roles:
            return Response({'detail': 'Недопустимая роль'}, status=status.HTTP_400_BAD_REQUEST)

        # Уникальность email/телефона — проверяем только среди активных пользователей,
        # чтобы архивированные сотрудники не блокировали регистрацию с тем же контактом.
        if email and User.objects.filter(email=email, is_active=True).exists():
            return Response({'detail': 'Пользователь с таким email уже существует'}, status=status.HTTP_400_BAD_REQUEST)
        if phone and User.objects.filter(phone=phone, is_active=True).exists():
            return Response({'detail': 'Пользователь с таким телефоном уже существует'}, status=status.HTTP_400_BAD_REQUEST)

        # Генерация/проверка username — также по активным, чтобы архивированные не держали имя.
        if not username:
            base_username = (email.split('@')[0] if email else (phone or 'user'))
            candidate = base_username
            suffix = 1
            while User.objects.filter(username=candidate, is_active=True).exists():
                candidate = f"{base_username}{suffix}"
                suffix += 1
            username = candidate
        else:
            if User.objects.filter(username=username, is_active=True).exists():
                return Response({'detail': 'Имя пользователя занято'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            username=username,
            email=email,
            phone=phone,
            password=password,
            role=role,
            first_name=first_name,
            last_name=last_name,
            city=city,  # Добавляем город при создании пользователя
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
        """Чистая прибыль за период с детализацией по дням"""
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
            pass

        # Чистая прибыль
        net_profit = total_income - expert_payments - partner_payments
        total_expense = expert_payments + partner_payments

        # Данные по дням
        daily_data = []
        current_date = start_dt
        while current_date <= end_dt:
            day_start = current_date
            day_end = current_date + timedelta(days=1)
            
            day_orders = completed_orders.filter(
                updated_at__gte=day_start,
                updated_at__lt=day_end
            )
            
            day_income = day_orders.aggregate(total=Sum('budget'))['total'] or Decimal('0')
            day_expense = day_income * Decimal('0.7')
            day_profit = day_income - day_expense
            
            daily_data.append({
                'date': current_date.strftime('%d.%m'),
                'profit': float(day_profit),
                'income': float(day_income),
                'expense': float(day_expense)
            })
            
            current_date += timedelta(days=1)

        # Рассчитываем изменение к предыдущему периоду
        days_diff = (end_dt - start_dt).days + 1
        prev_start = start_dt - timedelta(days=days_diff)
        prev_end = start_dt - timedelta(days=1)
        
        prev_orders = Order.objects.filter(
            status='completed',
            updated_at__gte=prev_start,
            updated_at__lte=prev_end
        )
        
        prev_income = prev_orders.aggregate(total=Sum('budget'))['total'] or Decimal('0')
        prev_expense = prev_income * Decimal('0.7')
        prev_profit = prev_income - prev_expense
        
        if prev_profit > 0:
            change_percent = float(((net_profit - prev_profit) / prev_profit) * 100)
        else:
            change_percent = 0.0

        return Response({
            'period': f"{start_date} - {end_date}",
            'total': float(net_profit),
            'income': float(total_income),
            'expense': float(total_expense),
            'expert_payments': float(expert_payments),
            'partner_payments': float(partner_payments),
            'change_percent': round(change_percent, 2),
            'daily_data': daily_data,
            'profit_margin': float((net_profit / total_income * 100) if total_income > 0 else 0)
        })

    @action(detail=False, methods=['get', 'post'])
    def income(self, request):
        """Детализация доходов"""
        if request.method == 'POST':
            # Добавление нового дохода
            date = request.data.get('date')
            description = request.data.get('description')
            amount = request.data.get('amount')
            
            if not all([date, description, amount]):
                return Response(
                    {'error': 'Укажите date, description и amount'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                amount = Decimal(str(amount))
                if amount <= 0:
                    return Response(
                        {'error': 'Сумма должна быть больше 0'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except (ValueError, TypeError):
                return Response(
                    {'error': 'Неверный формат суммы'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                date_obj = datetime.strptime(date, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Неверный формат даты. Используйте YYYY-MM-DD'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Сохраняем доход в базу
            income = ManualIncome.objects.create(
                date=date_obj,
                description=description,
                amount=amount,
                source='manual',
                created_by=request.user
            )
            
            # Возвращаем созданный доход
            return Response({
                'id': income.id,
                'date': str(income.date),
                'description': income.description,
                'amount': float(income.amount),
                'source': income.source
            }, status=status.HTTP_201_CREATED)
        
        # GET метод
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

        income_details = []
        
        # Только ручные доходы
        manual_incomes = ManualIncome.objects.filter(
            date__gte=start_dt.date(),
            date__lte=end_dt.date()
        ).order_by('-created_at')
        
        for income in manual_incomes:
            income_details.append({
                'id': income.id,
                'date': str(income.date),
                'amount': float(income.amount),
                'source': income.source,
                'description': income.description,
                'created_at': income.created_at.isoformat(),
                'can_delete': True
            })

        return Response(income_details)

    @action(detail=False, methods=['get', 'post'])
    def expense(self, request):
        """Детализация расходов"""
        if request.method == 'POST':
            # Добавление нового расхода
            date = request.data.get('date')
            description = request.data.get('description')
            amount = request.data.get('amount')
            category = request.data.get('category', 'other')
            
            if not all([date, description, amount]):
                return Response(
                    {'error': 'Укажите date, description и amount'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                amount = Decimal(str(amount))
                if amount <= 0:
                    return Response(
                        {'error': 'Сумма должна быть больше 0'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except (ValueError, TypeError):
                return Response(
                    {'error': 'Неверный формат суммы'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                date_obj = datetime.strptime(date, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Неверный формат даты. Используйте YYYY-MM-DD'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Сохраняем расход в базу
            expense = ManualExpense.objects.create(
                date=date_obj,
                description=description,
                amount=amount,
                category=category,
                created_by=request.user
            )
            
            # Возвращаем созданный расход
            return Response({
                'id': expense.id,
                'date': str(expense.date),
                'description': expense.description,
                'amount': float(expense.amount),
                'category': expense.category
            }, status=status.HTTP_201_CREATED)
        
        # GET метод
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
        
        # Только ручные расходы
        manual_expenses = ManualExpense.objects.filter(
            date__gte=start_dt.date(),
            date__lte=end_dt.date()
        ).order_by('-created_at')
        
        for expense in manual_expenses:
            expense_details.append({
                'id': expense.id,
                'date': str(expense.date),
                'amount': float(expense.amount),
                'category': expense.category,
                'description': expense.description,
                'created_at': expense.created_at.isoformat(),
                'can_delete': True
            })

        return Response(expense_details)
    
    @action(detail=False, methods=['delete'], url_path='income/(?P<income_id>[^/.]+)')
    def delete_income(self, request, income_id=None):
        """Удаление ручного дохода"""
        try:
            income = ManualIncome.objects.get(id=income_id, created_by=request.user)
            income.delete()
            return Response({'message': 'Доход успешно удален'}, status=status.HTTP_200_OK)
        except ManualIncome.DoesNotExist:
            return Response({'error': 'Доход не найден'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['delete'], url_path='expense/(?P<expense_id>[^/.]+)')
    def delete_expense(self, request, expense_id=None):
        """Удаление ручного расхода"""
        try:
            expense = ManualExpense.objects.get(id=expense_id, created_by=request.user)
            expense.delete()
            return Response({'message': 'Расход успешно удален'}, status=status.HTTP_200_OK)
        except ManualExpense.DoesNotExist:
            return Response({'error': 'Расход не найден'}, status=status.HTTP_404_NOT_FOUND)


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

    @action(detail=False, methods=['get'], url_path='turnover')
    def all_turnover(self, request):
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

        # Получаем всех партнеров
        partners = User.objects.filter(role='partner', is_active=True)
        
        partners_data = []
        total_turnover = 0
        total_commission = 0

        for partner in partners:
            # Получаем обороты по партнеру
            try:
                partner_earnings = PartnerEarning.objects.filter(
                    partner=partner,
                    created_at__gte=start_dt,
                    created_at__lte=end_dt
                )
                
                turnover = float(partner_earnings.aggregate(
                    total=Sum('source_amount')
                )['total'] or 0)
                
                commission = float(partner_earnings.aggregate(
                    total=Sum('amount')
                )['total'] or 0)
                
                orders_count = partner_earnings.filter(order__isnull=False).values('order').distinct().count()
            except Exception:
                # Таблица может не существовать
                turnover = 0
                commission = 0
                orders_count = 0
            
            # Получаем количество рефералов
            referrals_count = User.objects.filter(
                partner=partner,
                is_active=True
            ).count()
            
            # Добавляем партнера в список, даже если оборот = 0
            partners_data.append({
                'id': partner.id,
                'firstName': partner.first_name or '',
                'lastName': partner.last_name or '',
                'first_name': partner.first_name or '',
                'last_name': partner.last_name or '',
                'email': partner.email,
                'partnerEmail': partner.email,
                'turnover': turnover,
                'commission': commission,
                'referralsCount': referrals_count,
                'referrals_count': referrals_count,
                'ordersCount': orders_count,
                'orders_count': orders_count
            })
            
            total_turnover += turnover
            total_commission += commission

        # Сортируем по обороту
        partners_data.sort(key=lambda x: x['turnover'], reverse=True)

        return Response({
            'period': f"{start_date} - {end_date}",
            'partners': partners_data,
            'totalTurnover': total_turnover,
            'total_turnover': total_turnover,
            'totalCommission': total_commission,
            'total_commission': total_commission,
            'partnersCount': len(partners_data),
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




class InternalMessagePagination(PageNumberPagination):
    """Пагинация для внутренних сообщений"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class IsDirectorOrArbitrator(permissions.BasePermission):
    """Доступ только для директоров и арбитров"""
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and 
            (user.is_superuser or getattr(user, 'role', None) in ['director', 'arbitrator'])
        )


class InternalMessageViewSet(viewsets.ModelViewSet):
    """ViewSet для внутренних сообщений между директором и арбитрами"""
    permission_classes = [permissions.IsAuthenticated, IsDirectorOrArbitrator]
    pagination_class = InternalMessagePagination
    
    def get_serializer_class(self):
        if self.action == 'create':
            return InternalMessageCreateSerializer
        return InternalMessageSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = InternalMessage.objects.select_related(
            'sender', 'recipient', 'order'
        ).prefetch_related('attachments')
        
        # Фильтрация по claim_id если указан
        claim_id = self.request.query_params.get('claim_id')
        if claim_id:
            queryset = queryset.filter(claim_id=claim_id)
        
        # Фильтрация по непрочитанным
        unread_only = self.request.query_params.get('unread_only')
        if unread_only and unread_only.lower() == 'true':
            queryset = queryset.filter(is_read=False, recipient=user)
        
        # Директор видит все сообщения
        # Арбитр видит только свои сообщения и сообщения без получателя
        if user.role == 'arbitrator':
            queryset = queryset.filter(
                Q(sender=user) | 
                Q(recipient=user) | 
                Q(recipient__isnull=True)
            )
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        # Устанавливаем отправителя
        serializer.save(sender=self.request.user)
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Пометить сообщение как прочитанное"""
        message = self.get_object()
        
        # Только получатель может пометить как прочитанное
        if message.recipient and message.recipient != request.user:
            return Response(
                {'detail': 'Вы не можете пометить это сообщение как прочитанное'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        message.is_read = True
        message.read_at = timezone.now()
        message.save(update_fields=['is_read', 'read_at'])
        
        serializer = self.get_serializer(message)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Получить количество непрочитанных сообщений"""
        count = InternalMessage.objects.filter(
            recipient=request.user,
            is_read=False
        ).count()
        return Response({'count': count})
    
    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """Пометить все сообщения как прочитанные"""
        updated = InternalMessage.objects.filter(
            recipient=request.user,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )
        return Response({'updated': updated})



# ViewSet для внутренней коммуникации

class InternalCommunicationViewSet(viewsets.ModelViewSet):
    """ViewSet для внутренней коммуникации между администраторами и директором"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Только админы и директор могут видеть сообщения
        if user.role not in ['admin', 'director']:
            return InternalMessage.objects.none()
        
        # Показываем сообщения, где пользователь - отправитель или получатель
        return InternalMessage.objects.filter(
            Q(sender=user) | Q(recipient=user)
        ).select_related('sender', 'recipient', 'parent_message').order_by('-created_at')
    
    @action(detail=False, methods=['post'])
    def send_message(self, request):
        """Отправить сообщение"""
        recipient_id = request.data.get('recipient_id')
        subject = request.data.get('subject')
        message = request.data.get('message')
        message_type = request.data.get('message_type', 'question')
        priority = request.data.get('priority', 'medium')
        parent_message_id = request.data.get('parent_message_id')
        
        if not all([recipient_id, subject, message]):
            return Response(
                {'error': 'recipient_id, subject и message обязательны'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            recipient = User.objects.get(id=recipient_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'Получатель не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Создаем сообщение
        internal_message = InternalMessage.objects.create(
            sender=request.user,
            recipient=recipient,
            subject=subject,
            message=message,
            message_type=message_type,
            priority=priority,
            parent_message_id=parent_message_id if parent_message_id else None
        )
        
        # Уведомляем получателя
        from apps.notifications.services import NotificationService
        NotificationService.create_notification(
            recipient=recipient,
            type='new_contact',
            title=f'Новое сообщение от {request.user.get_full_name() or request.user.username}',
            message=f'{subject}: {message[:100]}',
            related_object_id=internal_message.id,
            related_object_type='internal_message'
        )
        
        return Response({
            'id': internal_message.id,
            'subject': internal_message.subject,
            'message': internal_message.message,
            'created_at': internal_message.created_at
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Отметить сообщение как прочитанное"""
        message = self.get_object()
        
        if message.recipient != request.user:
            return Response(
                {'error': 'Вы не можете отметить это сообщение'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        message.is_read = True
        message.read_at = timezone.now()
        message.save()
        
        return Response({'status': 'success'})
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Архивировать сообщение"""
        message = self.get_object()
        
        if message.sender != request.user and message.recipient != request.user:
            return Response(
                {'error': 'Вы не можете архивировать это сообщение'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        message.is_archived = True
        message.save()
        
        return Response({'status': 'success'})
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Получить количество непрочитанных сообщений"""
        count = InternalMessage.objects.filter(
            recipient=request.user,
            is_read=False,
            is_archived=False
        ).count()
        
        return Response({'unread_count': count})
    
    def list(self, request, *args, **kwargs):
        """Список сообщений"""
        queryset = self.get_queryset()
        
        # Фильтрация
        is_archived = request.query_params.get('is_archived', 'false').lower() == 'true'
        queryset = queryset.filter(is_archived=is_archived)
        
        messages_data = []
        for msg in queryset:
            messages_data.append({
                'id': msg.id,
                'sender': {
                    'id': msg.sender.id,
                    'username': msg.sender.username,
                    'first_name': msg.sender.first_name,
                    'last_name': msg.sender.last_name,
                    'role': msg.sender.role,
                },
                'recipient': {
                    'id': msg.recipient.id,
                    'username': msg.recipient.username,
                    'first_name': msg.recipient.first_name,
                    'last_name': msg.recipient.last_name,
                    'role': msg.recipient.role,
                },
                'subject': msg.subject,
                'message': msg.message,
                'message_type': msg.message_type,
                'priority': msg.priority,
                'is_read': msg.is_read,
                'is_archived': msg.is_archived,
                'created_at': msg.created_at,
                'read_at': msg.read_at,
                'parent_message_id': msg.parent_message_id,
            })
        
        return Response(messages_data)


class MeetingRequestViewSet(viewsets.ModelViewSet):
    """ViewSet для запросов на встречи"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Только админы и директор могут видеть запросы
        if user.role not in ['admin', 'director']:
            return MeetingRequest.objects.none()
        
        # Директор видит все запросы, админы - только свои
        if user.role == 'director':
            return MeetingRequest.objects.all().select_related('requester', 'director')
        else:
            return MeetingRequest.objects.filter(requester=user).select_related('director')
    
    @action(detail=False, methods=['post'])
    def request_meeting(self, request):
        """Запросить встречу с директором"""
        director_id = request.data.get('director_id')
        subject = request.data.get('subject')
        description = request.data.get('description')
        proposed_date = request.data.get('proposed_date')
        
        if not all([director_id, subject, description, proposed_date]):
            return Response(
                {'error': 'Все поля обязательны'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            director = User.objects.get(id=director_id, role='admin')
        except User.DoesNotExist:
            return Response(
                {'error': 'Директор не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Создаем запрос
        meeting = MeetingRequest.objects.create(
            requester=request.user,
            director=director,
            subject=subject,
            description=description,
            proposed_date=proposed_date,
            status='pending'
        )
        
        # Уведомляем директора
        from apps.notifications.services import NotificationService
        NotificationService.create_notification(
            recipient=director,
            type='new_contact',
            title='Новый запрос на встречу',
            message=f'{request.user.get_full_name()}: {subject}',
            related_object_id=meeting.id,
            related_object_type='meeting_request'
        )
        
        return Response({
            'id': meeting.id,
            'subject': meeting.subject,
            'status': meeting.status,
            'created_at': meeting.created_at
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Одобрить встречу (только для директора)"""
        if request.user.role != 'admin':
            return Response(
                {'error': 'Доступно только для директора'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        meeting = self.get_object()
        approved_date = request.data.get('approved_date', meeting.proposed_date)
        
        meeting.status = 'approved'
        meeting.approved_date = approved_date
        meeting.save()
        
        # Уведомляем инициатора
        from apps.notifications.services import NotificationService
        NotificationService.create_notification(
            recipient=meeting.requester,
            type='new_contact',
            title='Встреча одобрена',
            message=f'Ваша встреча "{meeting.subject}" одобрена',
            related_object_id=meeting.id,
            related_object_type='meeting_request'
        )
        
        return Response({'status': 'success'})
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Отклонить встречу (только для директора)"""
        if request.user.role != 'admin':
            return Response(
                {'error': 'Доступно только для директора'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        meeting = self.get_object()
        reason = request.data.get('reason', '')
        
        meeting.status = 'rejected'
        meeting.rejection_reason = reason
        meeting.save()
        
        # Уведомляем инициатора
        from apps.notifications.services import NotificationService
        NotificationService.create_notification(
            recipient=meeting.requester,
            type='new_contact',
            title='Встреча отклонена',
            message=f'Ваша встреча "{meeting.subject}" отклонена. Причина: {reason}',
            related_object_id=meeting.id,
            related_object_type='meeting_request'
        )
        
        return Response({'status': 'success'})
    
    def list(self, request, *args, **kwargs):
        """Список запросов на встречи"""
        queryset = self.get_queryset()
        
        # Фильтрация по статусу
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        queryset = queryset.order_by('-created_at')
        
        meetings_data = []
        for meeting in queryset:
            meetings_data.append({
                'id': meeting.id,
                'requester': {
                    'id': meeting.requester.id,
                    'username': meeting.requester.username,
                    'first_name': meeting.requester.first_name,
                    'last_name': meeting.requester.last_name,
                },
                'director': {
                    'id': meeting.director.id,
                    'first_name': meeting.director.first_name,
                    'last_name': meeting.director.last_name,
                },
                'subject': meeting.subject,
                'description': meeting.description,
                'proposed_date': meeting.proposed_date,
                'approved_date': meeting.approved_date,
                'status': meeting.status,
                'rejection_reason': meeting.rejection_reason,
                'notes': meeting.notes,
                'created_at': meeting.created_at,
                'updated_at': meeting.updated_at,
            })
        
        return Response(meetings_data)



# ViewSet для чат-комнат директора

class DirectorChatRoomViewSet(viewsets.ModelViewSet):
    """ViewSet для чат-комнат директора"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DirectorChatRoomSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        # Только админы и директор могут видеть чаты
        if user.role not in ['admin', 'director']:
            return DirectorChatRoom.objects.none()
        
        # Показываем чаты, где пользователь - участник
        return DirectorChatRoom.objects.filter(
            members=user,
            is_active=True
        ).prefetch_related('members', 'messages__sender').order_by('-updated_at')
    
    def perform_create(self, serializer):
        room = serializer.save(created_by=self.request.user)
        # Автоматически добавляем создателя в участники
        room.members.add(self.request.user)
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Отправить сообщение в чат"""
        room = self.get_object()
        message_text = request.data.get('message')
        
        if not message_text:
            return Response(
                {'error': 'message обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        message = DirectorChatMessage.objects.create(
            room=room,
            sender=request.user,
            message=message_text
        )
        
        serializer = DirectorChatMessageSerializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def join_room(self, request, pk=None):
        """Присоединиться к чату"""
        room = self.get_object()
        room.members.add(request.user)
        return Response({'message': 'Вы присоединились к чату'})
    
    @action(detail=True, methods=['post'])
    def leave_room(self, request, pk=None):
        """Покинуть чат"""
        room = self.get_object()
        room.members.remove(request.user)
        return Response({'message': 'Вы покинули чат'})
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Получить сообщения чата"""
        room = self.get_object()
        messages = room.messages.all().select_related('sender')
        serializer = DirectorChatMessageSerializer(messages, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def invite_user(self, request, pk=None):
        """Пригласить пользователя в чат"""
        room = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'Пользователь не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        room.members.add(user)
        
        # Уведомляем пользователя
        from apps.notifications.services import NotificationService
        NotificationService.create_notification(
            recipient=user,
            type='new_contact',
            title='Приглашение в чат',
            message=f'{request.user.get_full_name() or request.user.username} пригласил вас в чат "{room.name}"',
            related_object_id=room.id,
            related_object_type='director_chat_room'
        )
        
        return Response({'message': 'Пользователь приглашен'})


