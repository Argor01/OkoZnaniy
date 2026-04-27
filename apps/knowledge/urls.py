from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import QuestionViewSet, AnswerViewSet, UserKnowledgeStatsView, ArticleViewSet

router = DefaultRouter()
router.register(r'questions', QuestionViewSet, basename='question')
router.register(r'answers', AnswerViewSet, basename='answer')
router.register(r'articles', ArticleViewSet, basename='article')

user_stats_view = UserKnowledgeStatsView.as_view({'get': 'user_stats'})

urlpatterns = [
    path('user-stats/<int:user_id>/', user_stats_view, name='user-knowledge-stats'),
    path('', include(router.urls)),
]
