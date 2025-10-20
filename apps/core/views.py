from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from .models import StaticPage, FAQCategory, FAQ, Contact
from .serializers import StaticPageSerializer, FAQCategorySerializer, FAQSerializer, ContactSerializer
from apps.notifications.services import NotificationService

# Create your views here.

class StaticPageViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API для статических страниц.
    Поддерживает только чтение страниц.
    """
    queryset = StaticPage.objects.filter(is_published=True)
    serializer_class = StaticPageSerializer
    lookup_field = 'slug'

class FAQCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API для категорий FAQ.
    Поддерживает только чтение категорий.
    """
    queryset = FAQCategory.objects.all()
    serializer_class = FAQCategorySerializer
    lookup_field = 'slug'

    @action(detail=True)
    def questions(self, request, slug=None):
        """Получить все вопросы в категории"""
        category = self.get_object()
        questions = FAQ.objects.filter(category=category, is_published=True)
        serializer = FAQSerializer(questions, many=True)
        return Response(serializer.data)

class FAQViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API для вопросов FAQ.
    Поддерживает только чтение вопросов.
    """
    queryset = FAQ.objects.filter(is_published=True)
    serializer_class = FAQSerializer

class ContactViewSet(viewsets.ModelViewSet):
    """
    API для обращений через форму обратной связи.
    Поддерживает создание новых обращений и просмотр существующих (для админов).
    """
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return super().get_permissions()

    def perform_create(self, serializer):
        contact = serializer.save()
        NotificationService.notify_new_contact(contact)
