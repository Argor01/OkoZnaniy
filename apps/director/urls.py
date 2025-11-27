from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DirectorExpertApplicationViewSet, DirectorPersonnelViewSet

router = DefaultRouter()
router.register(r'personnel/expert-applications', DirectorExpertApplicationViewSet, basename='director-expert-applications')
router.register(r'personnel', DirectorPersonnelViewSet, basename='director-personnel')

urlpatterns = [
    path('', include(router.urls)),
]
