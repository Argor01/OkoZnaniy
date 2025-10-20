from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'pages', views.StaticPageViewSet)
router.register(r'faq/categories', views.FAQCategoryViewSet)
router.register(r'faq/questions', views.FAQViewSet)
router.register(r'contacts', views.ContactViewSet)

urlpatterns = [
    path('', include(router.urls)),
] 