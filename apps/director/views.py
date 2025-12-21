from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.experts.models import ExpertApplication
from apps.experts.serializers import ExpertApplicationSerializer
from apps.users.serializers import UserSerializer


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
        expert.application_approved = True
        expert.application_reviewed_at = application.updated_at
        expert.application_reviewed_by = request.user
        expert.has_submitted_application = True
        # Меняем роль на expert, если она еще не установлена
        if expert.role != 'expert':
            expert.role = 'expert'
            expert.save(update_fields=['application_approved', 'application_reviewed_at', 'application_reviewed_by', 'has_submitted_application', 'role'])
        else:
            expert.save(update_fields=['application_approved', 'application_reviewed_at', 'application_reviewed_by', 'has_submitted_application'])

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

        # Синхронизируем флаги пользователя
        expert = application.expert
        expert.application_approved = False
        expert.application_reviewed_at = application.updated_at
        expert.application_reviewed_by = request.user
        expert.has_submitted_application = True
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
        
        # Для действия restore разрешаем доступ к архивированным пользователям
        if self.action == 'restore':
            return User.objects.filter(is_active=False).exclude(role='client')
        
        # Для действия activate разрешаем доступ к деактивированным экспертам
        if self.action == 'activate':
            return User.objects.all().exclude(
                Q(role='client', has_submitted_application=False)  # Обычные клиенты
            )
        
        # Показываем активных сотрудников (не клиентов и не архивированных)
        # Исключаем:
        # 1. Обычных клиентов (role=client без заявки эксперта)
        # 2. Архивированных (is_active=False)
        # 3. Деактивированных экспертов (role=client с деактивированной заявкой)
        return User.objects.filter(
            is_active=True
        ).exclude(
            Q(role='client', has_submitted_application=False) |  # Обычные клиенты
            Q(role='client', application_approved=False, has_submitted_application=True)  # Деактивированные эксперты
        )

    def get_serializer_class(self):
        return UserSerializer

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Активация сотрудника или восстановление эксперта"""
        user = self.get_object()
        
        # Если это деактивированный эксперт (client с application_approved=False)
        # восстанавливаем роль expert
        if user.role == 'client' and user.application_approved == False:
            try:
                application = ExpertApplication.objects.get(expert=user)
                if application.status == 'deactivated':
                    # Восстанавливаем статус анкеты и роль
                    application.status = 'approved'
                    application.save(update_fields=['status', 'updated_at'])
                    user.role = 'expert'
                    user.application_approved = True
                    user.save(update_fields=['role', 'application_approved'])
                    
                    # Отправляем уведомление о восстановлении статуса эксперта
                    from apps.notifications.services import NotificationService
                    NotificationService.notify_application_approved(application)
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
        """Восстановление сотрудника из архива"""
        user = self.get_object()
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

