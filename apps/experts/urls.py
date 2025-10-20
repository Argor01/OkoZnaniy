from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('matching', views.ExpertMatchingViewSet, basename='expert-matching')
router.register('specializations', views.SpecializationViewSet, basename='specialization')
router.register('documents', views.ExpertDocumentViewSet, basename='expert-document')
router.register('reviews', views.ExpertReviewViewSet, basename='expert-review')
router.register('ratings', views.ExpertRatingViewSet, basename='expert-rating')
router.register('statistics', views.ExpertStatisticsViewSet, basename='expert-statistics')
router.register('dashboard', views.ExpertDashboardViewSet, basename='expert-dashboard')

urlpatterns = [
    path('', include(router.urls)),
] 