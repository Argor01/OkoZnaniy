from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PaymentViewSet, payment_methods, tbank_callback, uralsib_callback,
    yookassa_callback,
)

router = DefaultRouter()
router.register('payments', PaymentViewSet, basename='payment')

urlpatterns = [
    path('methods/', payment_methods, name='payment-methods'),
    path('payments/tbank/callback/', tbank_callback, name='tbank-callback'),
    # Короткий адрес: /api/payments/yookassa/callback/. Именно он
    # прописан в кабинете ЮKassa.
    path('yookassa/callback/', yookassa_callback, name='yookassa-callback'),
    # Длинный вариант с префиксом роутера оставлен рабочим, чтобы
    # уже настроенное уведомление не отвалилось при смене адреса.
    path('payments/yookassa/callback/', yookassa_callback, name='yookassa-callback-legacy'),
    path('payments/uralsib/callback/', uralsib_callback, name='uralsib-callback'),
    # Обработчик общий для всех банков на шлюзе RBS (Уралсиб, Сбербанк).
    # Прежний адрес оставлен: он уже прописан на стороне Уралсиба.
    path('payments/rbs/callback/', uralsib_callback, name='rbs-callback'),
    path('', include(router.urls)),
]
