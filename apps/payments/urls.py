from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PaymentViewSet, tbank_callback

router = DefaultRouter()
router.register('payments', PaymentViewSet, basename='payment')

urlpatterns = [
    path('payments/tbank/callback/', tbank_callback, name='tbank-callback'),
    path('', include(router.urls)),
]
