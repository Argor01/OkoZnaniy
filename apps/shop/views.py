from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import ReadyWork, Purchase
from .serializers import (
    ReadyWorkSerializer, 
    CreateReadyWorkSerializer, 
    PurchaseSerializer
)


class ReadyWorkViewSet(viewsets.ModelViewSet):
    """ViewSet для готовых работ"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = ReadyWork.objects.filter(is_active=True)
        
        # Фильтрация по предмету
        subject = self.request.query_params.get('subject')
        if subject:
            queryset = queryset.filter(subject_id=subject)
        
        # Фильтрация по типу работы
        work_type = self.request.query_params.get('work_type')
        if work_type:
            queryset = queryset.filter(work_type_id=work_type)
        
        # Поиск по названию
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | 
                Q(description__icontains=search)
            )
        
        return queryset.select_related('subject', 'work_type', 'author')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateReadyWorkSerializer
        return ReadyWorkSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            try:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning('[ReadyWorkViewSet.create] Validation errors: %s', serializer.errors)
            except Exception:
                pass
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Обрабатываем множественные файлы
        work_files = request.FILES.getlist('work_files')
        
        # Добавляем файлы в validated_data
        if work_files:
            serializer.validated_data['work_files'] = work_files
        
        work = serializer.save(author=request.user)
        
        # Возвращаем полные данные работы с файлами
        response_serializer = ReadyWorkSerializer(work, context={'request': request})
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    @action(detail=False, methods=['get'])
    def my_works(self, request):
        """Получить работы текущего пользователя"""
        works = ReadyWork.objects.filter(
            author=request.user,
            is_active=True
        ).select_related('subject', 'work_type')
        
        serializer = self.get_serializer(works, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def purchase(self, request, pk=None):
        """Купить готовую работу"""
        work = self.get_object()
        
        # Проверяем, что пользователь не покупает свою работу
        if work.author == request.user:
            return Response(
                {'error': 'Нельзя купить собственную работу'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Проверяем, что работа еще не куплена этим пользователем
        if Purchase.objects.filter(work=work, buyer=request.user).exists():
            return Response(
                {'error': 'Работа уже куплена'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Создаем покупку
        purchase = Purchase.objects.create(
            work=work,
            buyer=request.user,
            price_paid=work.price
        )
        
        serializer = PurchaseSerializer(purchase)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PurchaseViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для покупок"""
    
    serializer_class = PurchaseSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Purchase.objects.filter(
            buyer=self.request.user
        ).select_related('work', 'work__subject', 'work__work_type')