from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from django.contrib.auth import get_user_model

from apps.experts.models import ExpertApplication
from apps.experts.serializers import ExpertApplicationSerializer


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

