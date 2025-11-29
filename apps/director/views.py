from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from django.contrib.auth import get_user_model

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
        application.status = 'approved'
        application.reviewed_by = request.user
        application.save(update_fields=['status', 'reviewed_by', 'updated_at'])

        # Синхронизируем флаги пользователя
        User = get_user_model()
        expert = application.expert
        expert.application_approved = True
        expert.application_reviewed_at = application.updated_at
        expert.application_reviewed_by = request.user
        expert.has_submitted_application = True
        expert.save(update_fields=['application_approved', 'application_reviewed_at', 'application_reviewed_by', 'has_submitted_application'])

        serializer = self.get_serializer(application)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        reason = request.data.get('reason', '')
        application = self.get_object()
        application.status = 'rejected'
        application.rejection_reason = reason
        application.reviewed_by = request.user
        application.save(update_fields=['status', 'rejection_reason', 'reviewed_by', 'updated_at'])

        # Синхронизируем флаги пользователя
        expert = application.expert
        expert.application_approved = False
        expert.application_reviewed_at = application.updated_at
        expert.application_reviewed_by = request.user
        expert.has_submitted_application = True
        expert.save(update_fields=['application_approved', 'application_reviewed_at', 'application_reviewed_by', 'has_submitted_application'])

        serializer = self.get_serializer(application)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def rework(self, request, pk=None):
        comment = request.data.get('comment', '')
        application = self.get_object()
        # Возвращаем в рассмотрение (pending) и сохраняем комментарий в поле причины
        application.status = 'pending'
        if comment:
            application.rejection_reason = f"Требуется доработка: {comment}"
        application.reviewed_by = request.user
        application.save(update_fields=['status', 'rejection_reason', 'reviewed_by', 'updated_at'])

        # Флаги пользователя остаются как подана, но не одобрена
        expert = application.expert
        expert.application_approved = False
        expert.has_submitted_application = True
        expert.save(update_fields=['application_approved', 'has_submitted_application'])

        serializer = self.get_serializer(application)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DirectorPersonnelViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsDirector]

    def get_queryset(self):
        User = get_user_model()
        return User.objects.exclude(role='client')

    def get_serializer_class(self):
        return UserSerializer

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=['is_active'])
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=['is_active'])
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)

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

