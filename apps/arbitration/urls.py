from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'cases', views.ArbitrationCaseViewSet, basename='arbitration-case')

urlpatterns = [
    path('', include(router.urls)),
    path('stats/', views.arbitration_stats, name='arbitration-stats'),
]
