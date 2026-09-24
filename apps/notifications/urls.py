from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views, lead_views

router = DefaultRouter()
router.register('notifications', views.NotificationViewSet, basename='notification')

urlpatterns = [
    path('landing-inquiry/', lead_views.submit_inquiry, name='landing-inquiry'),
    path('landing-inquiries/', lead_views.list_landing_inquiries, name='landing-inquiries'),
    path('', include(router.urls)),
    path('send-registration-email/', views.send_registration_email, name='send-registration-email'),
    path('send-partner-email/', views.send_partner_email, name='send-partner-email'),
] 