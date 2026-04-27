from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views, vkid

"""config URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

router = DefaultRouter()
router.register('', views.UserViewSet)

urlpatterns = [
    path('token/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('telegram_auth_status/<str:auth_id>/', views.telegram_auth_status, name='telegram_auth_status'),
    path('google/callback/', views.google_callback, name='google_callback'),
    path('vk/callback/', views.vk_callback, name='vk_callback'),
    path('vkid/login/', vkid.vkid_login, name='vkid_login'),
    path('vkid/callback/', vkid.vkid_callback, name='vkid_callback'),
    
    # Специфичные маршруты должны идти перед общими router.urls
    path('partners_list/', views.UserViewSet.as_view({'get': 'partners_list'}), name='partners_list'),
    path('partner_dashboard/', views.UserViewSet.as_view({'get': 'partner_dashboard'}), name='partner_dashboard'),
    path('generate_referral_link/', views.UserViewSet.as_view({'post': 'generate_referral_link'}), name='generate_referral_link'),
    path('admin_partners/', views.UserViewSet.as_view({'get': 'admin_partners'}), name='admin_partners'),
    path('admin_earnings/', views.UserViewSet.as_view({'get': 'admin_earnings'}), name='admin_earnings'),
    path('admin_mark_earning_paid/', views.UserViewSet.as_view({'post': 'admin_mark_earning_paid'}), name='admin_mark_earning_paid'),
    path('recent_users/', views.UserViewSet.as_view({'get': 'recent_users'}), name='recent_users'),
    path('support_user/', views.UserViewSet.as_view({'get': 'support_user'}), name='support_user'),
    path('client_orders/', views.UserViewSet.as_view({'get': 'client_orders'}), name='client_orders'),
    path('submit_improvement_suggestion/', views.UserViewSet.as_view({'post': 'submit_improvement_suggestion'}), name='submit_improvement_suggestion'),
    path('improvement_suggestions/', views.UserViewSet.as_view({'get': 'improvement_suggestions'}), name='improvement_suggestions'),
    path('update_me/', views.UserViewSet.as_view({'put': 'update_me', 'patch': 'update_me'}), name='update_me'),
    path('submit_expert_application/', views.UserViewSet.as_view({'post': 'submit_expert_application'}), name='submit_expert_application'),
    path('admin_arbitrators/', views.UserViewSet.as_view({'get': 'admin_arbitrators'}), name='admin_arbitrators'),
    path('directors/', views.UserViewSet.as_view({'get': 'directors'}), name='directors'),
    path('contact_banned_users/', views.UserViewSet.as_view({'get': 'contact_banned_users'}), name='contact_banned_users'),
    path('me/', views.UserViewSet.as_view({'get': 'me'}), name='user_me'),
    
    # Общие маршруты router должны идти в конце
    path('', include(router.urls)),
]
