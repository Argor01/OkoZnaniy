from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PaymentViewSet, tbank_callback, uralsib_callback, yookassa_callback,
)

router = DefaultRouter()
router.register('payments', PaymentViewSet, basename='payment')

urlpatterns = [
    path('payments/tbank/callback/', tbank_callback, name='tbank-callback'),
    path('payments/yookassa/callback/', yookassa_callback, name='yookassa-callback'),
    path('payments/uralsib/callback/', uralsib_callback, name='uralsib-callback'),
    # Обработчик общий для всех банков на шлюзе RBS (Уралсиб, Сбербанк).
    # Прежний адрес оставлен: он уже прописан на стороне Уралсиба.
    path('payments/rbs/callback/', uralsib_callback, name='rbs-callback'),
    path('', include(router.urls)),
]
