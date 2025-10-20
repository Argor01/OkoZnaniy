from django.contrib import admin
from django.urls import path, include
from rest_framework_nested import routers
from . import views

router = routers.DefaultRouter()
router.register('orders', views.OrderViewSet, basename='order')
router.register('disputes', views.DisputeViewSet, basename='dispute')

# Вложенные маршруты для файлов и комментариев
orders_router = routers.NestedDefaultRouter(router, 'orders', lookup='order')
orders_router.register('files', views.OrderFileViewSet, basename='order-files')
orders_router.register('comments', views.OrderCommentViewSet, basename='order-comments')
orders_router.register('bids', views.BidViewSet, basename='order-bids')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(orders_router.urls)),
]