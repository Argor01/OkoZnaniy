from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('chats', views.ChatViewSet, basename='chat')
router.register('support', views.SupportChatViewSet, basename='support-chat')

app_name = 'chat'

urlpatterns = [
    path('', include(router.urls)),
] 