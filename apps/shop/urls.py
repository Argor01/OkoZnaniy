from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('works', views.ReadyWorkViewSet, basename='ready-work')
router.register('purchases', views.PurchaseViewSet, basename='purchase')

urlpatterns = [
    path('', include(router.urls)),
]