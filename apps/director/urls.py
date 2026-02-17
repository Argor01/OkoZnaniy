from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DirectorExpertApplicationViewSet, 
    DirectorPersonnelViewSet,
    DirectorFinanceViewSet,
    DirectorPartnersViewSet,
    DirectorStatisticsViewSet,
    InternalMessageViewSet,
    InternalCommunicationViewSet,
    MeetingRequestViewSet,
)

router = DefaultRouter()
router.register(r'personnel/expert-applications', DirectorExpertApplicationViewSet, basename='director-expert-applications')
router.register(r'personnel', DirectorPersonnelViewSet, basename='director-personnel')
router.register(r'finance', DirectorFinanceViewSet, basename='director-finance')
router.register(r'partners', DirectorPartnersViewSet, basename='director-partners')
router.register(r'statistics', DirectorStatisticsViewSet, basename='director-statistics')
router.register(r'messages', InternalMessageViewSet, basename='director-messages')
router.register(r'internal-communication', InternalCommunicationViewSet, basename='internal-communication')
router.register(r'meeting-requests', MeetingRequestViewSet, basename='meeting-requests')

urlpatterns = [
    path('', include(router.urls)),
]
