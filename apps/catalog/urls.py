from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SubjectViewSet, TopicViewSet,
    WorkTypeViewSet, ComplexityViewSet,
    SubjectCategoryViewSet, DiscountRuleViewSet,
    DiscountViewSet
)

router = DefaultRouter()
router.register(r'subjects', SubjectViewSet)
router.register(r'topics', TopicViewSet)
router.register(r'work-types', WorkTypeViewSet)
router.register(r'complexity-levels', ComplexityViewSet)
router.register(r'categories', SubjectCategoryViewSet)
router.register(r'discounts', DiscountViewSet)

app_name = 'catalog'

urlpatterns = [
    path('', include(router.urls)),
] 