from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PartnerChatRoomViewSet

router = DefaultRouter()
router.register(r'chat-rooms', PartnerChatRoomViewSet, basename='partner-chat-rooms')

urlpatterns = [
    path('', include(router.urls)),
]