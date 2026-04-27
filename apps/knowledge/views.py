from rest_framework import viewsets, status, parsers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from django.db.models import Count, Q
from .models import Question, Answer, AnswerLike, QuestionView, Article, ArticleFile
from .serializers import (
    QuestionListSerializer,
    QuestionDetailSerializer,
    QuestionCreateSerializer,
    AnswerSerializer,
    AnswerCreateSerializer,
    ArticleListSerializer,
    ArticleDetailSerializer,
    ArticleCreateSerializer,
)
from apps.notifications.services import NotificationService


class ArticleViewSet(viewsets.ModelViewSet):
    """ViewSet для статей Базы Знаний"""
    permission_classes = [IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_queryset(self):
        queryset = Article.objects.select_related('author').prefetch_related('files')

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(subject__icontains=search)
            )

        work_type = self.request.query_params.get('work_type')
        if work_type:
            queryset = queryset.filter(work_type__icontains=work_type)

        subject = self.request.query_params.get('subject')
        if subject:
            queryset = queryset.filter(subject__icontains=subject)

        return queryset.order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return ArticleListSerializer
        if self.action == 'create':
            return ArticleCreateSerializer
        return ArticleDetailSerializer

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in ('expert', 'admin'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Только эксперты и администраторы могут создавать статьи')
        article = serializer.save(author=user)
        files = self.request.FILES.getlist('files')
        for f in files:
            ArticleFile.objects.create(
                article=article,
                file=f,
                original_name=f.name,
                file_size=f.size,
            )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.views_count += 1
        instance.save(update_fields=['views_count'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        article = self.get_object()
        user = request.user
        if user.role == 'admin' or article.author == user:
            return super().destroy(request, *args, **kwargs)
        return Response(
            {'error': 'Нет прав для удаления этой статьи'},
            status=status.HTTP_403_FORBIDDEN,
        )


class QuestionViewSet(viewsets.ModelViewSet):
    """ViewSet для вопросов"""
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = None  # Отключаем пагинацию
    
    def get_queryset(self):
        queryset = Question.objects.select_related('author').prefetch_related('tags')
        
        # Для детального просмотра загружаем ответы
        if self.action == 'retrieve':
            queryset = queryset.prefetch_related('answers__author')
        
        queryset = queryset.annotate(answers_count=Count('answers'))
        
        # Фильтрация по категории
        category = self.request.query_params.get('category')
        if category and category != 'all':
            queryset = queryset.filter(category=category)
        
        # Фильтрация по статусу
        status_filter = self.request.query_params.get('status')
        if status_filter and status_filter != 'all':
            queryset = queryset.filter(status=status_filter)
        
        # Поиск
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )
        
        return queryset.order_by('-created_at')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return QuestionListSerializer
        elif self.action == 'create':
            return QuestionCreateSerializer
        return QuestionDetailSerializer

    
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Увеличиваем счетчик просмотров
        ip_address = self.get_client_ip(request)
        
        # Проверяем, не просматривал ли уже этот пользователь/IP
        if request.user.is_authenticated:
            view_exists = QuestionView.objects.filter(
                question=instance,
                user=request.user
            ).exists()
        else:
            view_exists = QuestionView.objects.filter(
                question=instance,
                ip_address=ip_address
            ).exists()
        
        if not view_exists:
            QuestionView.objects.create(
                question=instance,
                user=request.user if request.user.is_authenticated else None,
                ip_address=ip_address
            )
            instance.views_count += 1
            instance.save(update_fields=['views_count'])
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def add_answer(self, request, pk=None):
        """Добавить ответ на вопрос"""
        question = self.get_object()
        
        # Проверяем, что только эксперты могут отвечать
        if request.user.role != 'expert':
            return Response(
                {'error': 'Только эксперты могут отвечать на вопросы'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = AnswerCreateSerializer(data=request.data)
        if serializer.is_valid():
            answer = serializer.save(
                question=question,
                author=request.user
            )
            
            # Обновляем статус вопроса
            if question.status == 'open':
                question.status = 'answered'
                question.save(update_fields=['status'])
            
            # Уведомляем автора вопроса о новом ответе
            NotificationService.notify_new_answer(question, answer, request.user)
            
            return Response(
                AnswerSerializer(answer, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def my_questions(self, request):
        """Получить вопросы текущего пользователя"""
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Требуется авторизация'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        queryset = self.get_queryset().filter(author=request.user)
        serializer = QuestionListSerializer(queryset, many=True)
        return Response(serializer.data)



class AnswerViewSet(viewsets.ModelViewSet):
    """ViewSet для ответов"""
    permission_classes = [IsAuthenticatedOrReadOnly]
    serializer_class = AnswerSerializer
    
    def get_queryset(self):
        return Answer.objects.select_related('author', 'question').all()
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def toggle_like(self, request, pk=None):
        """Поставить/убрать лайк"""
        answer = self.get_object()
        
        like, created = AnswerLike.objects.get_or_create(
            answer=answer,
            user=request.user
        )
        
        if not created:
            # Убираем лайк
            like.delete()
            answer.likes_count = max(0, answer.likes_count - 1)
            answer.save(update_fields=['likes_count'])
            return Response({'liked': False, 'likes_count': answer.likes_count})
        else:
            # Добавляем лайк
            answer.likes_count += 1
            answer.save(update_fields=['likes_count'])
            return Response({'liked': True, 'likes_count': answer.likes_count})
    
    def destroy(self, request, *args, **kwargs):
        """Удалить ответ (только автор)"""
        answer = self.get_object()
        
        if answer.author != request.user:
            return Response(
                {'error': 'Вы можете удалять только свои ответы'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().destroy(request, *args, **kwargs)
