from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DirectorExpertApplicationViewSet

router = DefaultRouter()
router.register(r'personnel/expert-applications', DirectorExpertApplicationViewSet, basename='director-expert-applications')

urlpatterns = [
    path('', include(router.urls)),
]

