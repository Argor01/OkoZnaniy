from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.db.models import Avg, Count
from django.http import FileResponse
import mimetypes
from .models import ReadyWork, Purchase
from .serializers import (
    ReadyWorkSerializer, 
    CreateReadyWorkSerializer, 
    PurchaseSerializer
)


class IsExpertOrStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        role = getattr(user, 'role', None)
        return bool(user and user.is_authenticated and (user.is_staff or role == 'expert'))


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

        queryset = queryset.annotate(
            rating_avg=Avg('purchase__rating'),
            rating_count=Count('purchase__rating'),
            purchase_count=Count('purchase', distinct=True),
        )
        
        return queryset.select_related('subject', 'work_type', 'author')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateReadyWorkSerializer
        return ReadyWorkSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsExpertOrStaff()]
        return super().get_permissions()
    
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
        ).select_related('work', 'work__subject', 'work__work_type', 'work__author')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    @action(detail=True, methods=['post'])
    def rate(self, request, pk=None):
        purchase = self.get_object()
        rating = request.data.get('rating')
        if rating is None or rating == '':
            return Response({'detail': 'rating обязателен'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            rating = int(rating)
        except (TypeError, ValueError):
            return Response({'detail': 'rating должен быть числом'}, status=status.HTTP_400_BAD_REQUEST)
        if rating < 1 or rating > 5:
            return Response({'detail': 'rating должен быть в диапазоне 1..5'}, status=status.HTTP_400_BAD_REQUEST)

        from django.utils import timezone
        purchase.rating = rating
        purchase.rated_at = timezone.now()
        purchase.save(update_fields=['rating', 'rated_at'])
        return Response(PurchaseSerializer(purchase, context={'request': request}).data)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        purchase = self.get_object()
        if not purchase.delivered_file:
            return Response({'detail': 'Файл недоступен'}, status=status.HTTP_404_NOT_FOUND)

        file_handle = purchase.delivered_file.open()
        content_type, _ = mimetypes.guess_type(purchase.delivered_file.name)
        if not content_type:
            content_type = 'application/octet-stream'

        filename = purchase.delivered_file_name or purchase.delivered_file.name.split('/')[-1]
        response = FileResponse(file_handle, content_type=content_type)
        response['Content-Length'] = purchase.delivered_file.size
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
