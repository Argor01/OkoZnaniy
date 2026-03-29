from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('notifications', views.NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
    path('send-registration-email/', views.send_registration_email, name='send-registration-email'),
    path('send-partner-email/', views.send_partner_email, name='send-partner-email'),
] 