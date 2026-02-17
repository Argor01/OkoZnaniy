from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'support-requests', views.SupportRequestViewSet, basename='support-request')
router.register(r'claims', views.ClaimViewSet, basename='claim')
router.register(r'chat-rooms', views.AdminChatRoomViewSet, basename='admin-chat-room')

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),
    
    # Управление пользователями
    path('users/', views.get_all_users, name='get-all-users'),
    path('users/blocked/', views.get_blocked_users, name='get-blocked-users'),
    path('users/<int:user_id>/block/', views.block_user, name='block-user'),
    path('users/<int:user_id>/unblock/', views.unblock_user, name='unblock-user'),
    path('users/<int:user_id>/change-role/', views.change_user_role, name='change-user-role'),
    
    # Управление заказами
    path('orders/', views.get_all_orders, name='get-all-orders'),
    path('orders/problems/', views.get_problem_orders, name='get-problem-orders'),
    path('orders/<int:order_id>/change-status/', views.change_order_status, name='change-order-status'),
    
    # Чаты с техподдержкой
    path('support-chats/', views.get_support_chats, name='get-support-chats'),
    path('support-chats/<int:chat_id>/send-message/', views.send_support_chat_message, name='send-support-chat-message'),
    
    # Статистика
    path('stats/', views.get_admin_stats, name='admin-stats'),
]
