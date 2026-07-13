import mimetypes
from datetime import timedelta

from django.conf import settings
from django.db.models import Avg, Count, Exists, OuterRef, Q
from django.http import FileResponse
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.chat.services import ensure_order_chat_started
from apps.orders.models import Order
from .models import FavoriteWork, Purchase, ReadyWork
from .serializers import CreateReadyWorkSerializer, PurchaseSerializer, ReadyWorkSerializer


class IsExpertOrStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        role = getattr(user, 'role', None)
        return bool(user and user.is_authenticated and (user.is_staff or role == 'expert'))


class ReadyWorkViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = ReadyWork.objects.filter(
            is_active=True,
            moderation_status=ReadyWork.ModerationStatus.APPROVED,
        ).select_related('subject', 'work_type', 'author').order_by('-created_at')
        user = self.request.user

        if user.is_authenticated:
            queryset = queryset.annotate(
                is_favorite=Exists(FavoriteWork.objects.filter(user=user, work=OuterRef('pk')))
            )

        is_favorite_filter = self.request.query_params.get('is_favorite')
        if is_favorite_filter == 'true' and user.is_authenticated:
            queryset = queryset.filter(is_favorite=True)

        subject = self.request.query_params.get('subject')
        if subject:
            queryset = queryset.filter(subject_id=subject)

        work_type = self.request.query_params.get('work_type')
        if work_type:
            queryset = queryset.filter(work_type_id=work_type)

        author = self.request.query_params.get('author')
        if author:
            queryset = queryset.filter(author_id=author)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(description__icontains=search))

        queryset = queryset.annotate(
            rating_avg=Avg('purchase__rating'),
            rating_count=Count('purchase__rating'),
            purchase_count=Count('purchase', distinct=True),
        )

        return queryset.select_related('subject', 'work_type', 'author').prefetch_related('files')

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateReadyWorkSerializer
        return ReadyWorkSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        import logging

        logger = logging.getLogger(__name__)
        logger.info('[ReadyWorkViewSet.create] Data keys: %s, FILES keys: %s', list(request.data.keys()), list(request.FILES.keys()))

        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.warning('[ReadyWorkViewSet.create] Validation errors: %s', serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        work_files = request.FILES.getlist('work_files')
        if work_files:
            max_files = getattr(settings, 'MAX_READY_WORK_FILES', 5)
            if len(work_files) > max_files:
                return Response({'detail': f'Максимум файлов на работу: {max_files}'}, status=status.HTTP_400_BAD_REQUEST)

            allowed_extensions = getattr(settings, 'ALLOWED_EXTENSIONS', [])
            max_size = getattr(settings, 'MAX_UPLOAD_SIZE', 50 * 1024 * 1024)
            for uploaded_file in work_files:
                ext = (uploaded_file.name.split('.')[-1].lower() if '.' in uploaded_file.name else '') or ''
                if allowed_extensions and ext not in allowed_extensions:
                    return Response(
                        {'detail': f'Недопустимый тип файла. Разрешены: {", ".join(allowed_extensions)}'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if uploaded_file.size > max_size:
                    return Response(
                        {'detail': f'Размер файла не должен превышать {max_size // (1024 * 1024)} МБ.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        if work_files:
            serializer.validated_data['work_files'] = work_files

        work = serializer.save(author=request.user)
        response_serializer = ReadyWorkSerializer(work, context={'request': request})
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=['get'])
    def my_works(self, request):
        works = ReadyWork.objects.filter(author=request.user).select_related('subject', 'work_type')
        serializer = self.get_serializer(works, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def toggle_favorite(self, request, pk=None):
        work = self.get_object()
        favorite, created = FavoriteWork.objects.get_or_create(user=request.user, work=work)

        if not created:
            favorite.delete()
            return Response({'status': 'removed', 'is_favorite': False})

        return Response({'status': 'added', 'is_favorite': True})

    @action(detail=True, methods=['post'])
    def purchase(self, request, pk=None):
        work = self.get_object()

        if work.author == request.user:
            return Response({'error': 'Нельзя купить собственную работу'}, status=status.HTTP_400_BAD_REQUEST)

        deadline = timezone.now() + timedelta(days=max(work.execution_days, 1))
        order = Order.objects.create(
            client=request.user,
            expert=work.author,
            subject=work.subject,
            work_type=work.work_type,
            title=work.title,
            description=work.description,
            deadline=deadline,
            budget=work.price,
            original_price=work.price,
            final_price=work.price,
            status='in_progress',
        )
        ensure_order_chat_started(
            order,
            sender=request.user,
            text=f'Создан заказ по готовой работе "{work.title}"',
        )

        purchase = Purchase.objects.create(
            work=work,
            buyer=request.user,
            order=order,
            price_paid=work.price,
        )
        serializer = PurchaseSerializer(purchase, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PurchaseViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PurchaseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Purchase.objects.filter(buyer=self.request.user).select_related(
            'work',
            'work__subject',
            'work__work_type',
            'work__author',
            'order',
        )

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
