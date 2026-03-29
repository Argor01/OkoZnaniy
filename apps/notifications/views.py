from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from .models import Notification
from .serializers import NotificationSerializer
from .services import EmailService


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    def perform_create(self, serializer):
        serializer.save(recipient=self.request.user)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        return Response(status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(NotificationSerializer(notification).data)

    def create(self, request, *args, **kwargs):
        # Запрещаем создание уведомлений через API
        return Response(
            {"detail": "Метод не разрешен"},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    def update(self, request, *args, **kwargs):
        # Разрешаем только обновление поля is_read
        instance = self.get_object()
        is_read = request.data.get('is_read')
        if is_read is not None:
            instance.is_read = is_read
            instance.save()
            return Response(NotificationSerializer(instance).data)
        return Response(
            {"detail": "Можно обновлять только поле is_read"},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def send_registration_email(request):
    """Отправляет инструкцию по регистрации на указанный email"""
    email = request.data.get('email')
    
    if not email:
        return Response(
            {"error": "Email обязателен"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Простая валидация email
    if '@' not in email or '.' not in email:
        return Response(
            {"error": "Некорректный email"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Отправляем email
    success = EmailService.send_registration_instructions(email)
    
    if success:
        return Response(
            {"message": "Инструкция отправлена на ваш email"},
            status=status.HTTP_200_OK
        )
    else:
        return Response(
            {"error": "Ошибка отправки email. Попробуйте позже"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def send_partner_email(request):
    """Отправляет информацию о партнерской программе на указанный email"""
    email = request.data.get('email')
    
    if not email:
        return Response(
            {"error": "Email обязателен"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Простая валидация email
    if '@' not in email or '.' not in email:
        return Response(
            {"error": "Некорректный email"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Отправляем email
    success = EmailService.send_partner_instructions(email)
    
    if success:
        return Response(
            {"message": "Информация о партнерской программе отправлена на ваш email"},
            status=status.HTTP_200_OK
        )
    else:
        return Response(
            {"error": "Ошибка отправки email. Попробуйте позже"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
