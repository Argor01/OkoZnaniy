from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PartnerChatRoomViewSet, PartnerApplicationViewSet

router = DefaultRouter()
router.register(r'chat-rooms', PartnerChatRoomViewSet, basename='partner-chat-rooms')
router.register(r'applications', PartnerApplicationViewSet, basename='partner-applications')

urlpatterns = [
    path('', include(router.urls)),
]
