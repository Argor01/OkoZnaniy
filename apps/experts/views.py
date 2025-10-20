from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Avg, Count, Q
from .models import Specialization, ExpertDocument, ExpertReview, ExpertStatistics, ExpertRating
from .serializers import (
    SpecializationSerializer, ExpertDocumentSerializer,
    ExpertReviewSerializer, ExpertStatisticsSerializer,
    ExpertRatingSerializer, ExpertMatchSerializer
)
from apps.notifications.services import NotificationService
from rest_framework.parsers import MultiPartParser, FormParser
from .services import ExpertMatchingService
from apps.orders.models import Order, Transaction
from apps.users.models import User
from django.db import models
from django.utils import timezone

# Create your views here.

class IsExpertOrReadOnly(permissions.BasePermission):
    """
    Разрешает чтение всем, но изменение только экспертам
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated and request.user.role == 'expert'

class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Разрешает доступ только владельцу объекта или администратору
    """
    def has_object_permission(self, request, view, obj):
        return request.user.is_staff or obj.expert == request.user

class SpecializationViewSet(viewsets.ModelViewSet):
    """API для работы со специализациями экспертов"""
    serializer_class = SpecializationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Specialization.objects.all()
        if self.request.user.role == 'expert':
            return Specialization.objects.filter(expert=self.request.user)
        return Specialization.objects.filter(is_verified=True)

    def perform_create(self, serializer):
        if self.request.user.role != 'expert':
            raise permissions.PermissionDenied(
                'Только эксперты могут создавать специализации'
            )
        serializer.save(expert=self.request.user)

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        if not request.user.is_staff:
            return Response(
                {'detail': 'Только администраторы могут проверять специализации'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        specialization = self.get_object()
        specialization.is_verified = True
        specialization.verified_by = request.user
        specialization.save()
        
        NotificationService.notify_specialization_verified(specialization)
        
        return Response(SpecializationSerializer(specialization).data)

class ExpertDocumentViewSet(viewsets.ModelViewSet):
    """API для работы с документами экспертов"""
    serializer_class = ExpertDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        if self.request.user.is_staff:
            return ExpertDocument.objects.all()
        if self.request.user.role == 'expert':
            return ExpertDocument.objects.filter(expert=self.request.user)
        return ExpertDocument.objects.filter(is_verified=True)

    def perform_create(self, serializer):
        if self.request.user.role != 'expert':
            raise permissions.PermissionDenied(
                'Только эксперты могут загружать документы'
            )
        document = serializer.save(expert=self.request.user)
        NotificationService.notify_document_uploaded(document)

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        if not request.user.is_staff:
            return Response(
                {'detail': 'Только администраторы могут проверять документы'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        document = self.get_object()
        document.is_verified = True
        document.verified_by = request.user
        document.save()
        
        NotificationService.notify_document_verified(document)
        
        return Response(ExpertDocumentSerializer(document).data)

class ExpertReviewViewSet(viewsets.ModelViewSet):
    """API для работы с отзывами о экспертах"""
    serializer_class = ExpertReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return ExpertReview.objects.all()
        if self.request.user.role == 'expert':
            return ExpertReview.objects.filter(expert=self.request.user)
        return ExpertReview.objects.filter(client=self.request.user)

    def perform_create(self, serializer):
        order = serializer.validated_data['order']
        review = serializer.save(
            expert=order.expert,
            client=self.request.user
        )
        NotificationService.notify_review_created(review)

class ExpertRatingViewSet(viewsets.ModelViewSet):
    serializer_class = ExpertRatingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ExpertRating.objects.select_related(
            'expert', 'client', 'order'
        ).all()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        # Логируем ошибки валидации для дебага
        print("[Expert Rating] validation errors:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def perform_create(self, serializer):
        rating = serializer.save(
            client=self.request.user,
            expert=serializer.validated_data['order'].expert
        )
        # Обновляем статистику эксперта
        stats, _ = ExpertStatistics.objects.get_or_create(expert=rating.expert)
        stats.update_statistics()
        # Отправляем уведомление эксперту
        NotificationService.notify_new_rating(rating)

class ExpertStatisticsViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ExpertStatisticsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = ExpertStatistics.objects.all()
        
        # Фильтрация по эксперту
        expert_id = self.request.query_params.get('expert')
        if expert_id:
            queryset = queryset.filter(expert_id=expert_id)
            # Создаем статистику если её нет
            if not queryset.exists():
                from apps.users.models import User
                try:
                    expert = User.objects.get(id=expert_id, role='expert')
                    stats, created = ExpertStatistics.objects.get_or_create(expert=expert)
                    if created:
                        stats.update_statistics()
                    queryset = ExpertStatistics.objects.filter(expert_id=expert_id)
                except User.DoesNotExist:
                    pass
        
        if self.request.user.is_staff:
            return queryset
        if self.request.user.role == 'expert':
            return queryset.filter(expert=self.request.user)
        
        # Для обычных пользователей показываем только статистику, если она есть
        return queryset

    @action(detail=False, methods=['get'])
    def my_statistics(self, request):
        if request.user.role != 'expert':
            return Response(
                {'detail': 'Только эксперты могут просматривать свою статистику'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        statistics, created = ExpertStatistics.objects.get_or_create(
            expert=request.user
        )
        
        return Response(ExpertStatisticsSerializer(statistics).data)

    @action(detail=True, methods=['post'])
    def update_stats(self, request, pk=None):
        stats = self.get_object()
        stats.update_statistics()
        return Response(
            self.get_serializer(stats).data,
            status=status.HTTP_200_OK
        )

class ExpertMatchingViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        """
        Возвращает список подходящих экспертов для заказа
        """
        order_id = request.query_params.get('order_id')
        if not order_id:
            return Response(
                {'detail': 'Необходимо указать order_id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.orders.models import Order
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response(
                {'detail': 'Заказ не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверяем права доступа
        if order.client != request.user and not request.user.is_staff:
            return Response(
                {'detail': 'У вас нет прав для просмотра экспертов этого заказа'},
                status=status.HTTP_403_FORBIDDEN
            )

        matching_experts = ExpertMatchingService.find_matching_experts(order)
        serializer = ExpertMatchSerializer(matching_experts, many=True)
        
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def invite_expert(self, request):
        """
        Приглашает эксперта для выполнения заказа
        """
        order_id = request.data.get('order_id')
        expert_id = request.data.get('expert_id')

        if not order_id or not expert_id:
            return Response(
                {'detail': 'Необходимо указать order_id и expert_id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.orders.models import Order
        from django.contrib.auth import get_user_model
        User = get_user_model()

        try:
            order = Order.objects.get(id=order_id)
            expert = User.objects.get(id=expert_id, role='expert')
        except (Order.DoesNotExist, User.DoesNotExist):
            return Response(
                {'detail': 'Заказ или эксперт не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверяем права доступа
        if order.client != request.user and not request.user.is_staff:
            return Response(
                {'detail': 'У вас нет прав для приглашения экспертов'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Проверяем доступность эксперта
        availability = ExpertMatchingService.get_expert_availability(expert)
        if not availability['is_available']:
            return Response(
                {'detail': 'Эксперт сейчас недоступен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Отправляем уведомление эксперту
        NotificationService.notify_expert_invitation(order, expert)

        return Response({
            'detail': 'Приглашение отправлено',
            'estimated_start_time': availability['estimated_start_time']
        })

class ExpertDashboardViewSet(viewsets.ViewSet):
    """API для личного кабинета специалиста"""
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Получение статистики специалиста"""
        if request.user.role != 'expert':
            return Response(
                {'detail': 'Только специалисты могут просматривать статистику'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Получаем или создаем статистику
        stats, created = ExpertStatistics.objects.get_or_create(expert=request.user)
        if created:
            stats.update_statistics()
        
        # Дополнительная статистика
        total_earnings = Transaction.objects.filter(
            user=request.user,
            type='payout'
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        
        monthly_earnings = Transaction.objects.filter(
            user=request.user,
            type='payout',
            timestamp__month=timezone.now().month,
            timestamp__year=timezone.now().year
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        
        active_orders_count = Order.objects.filter(
            expert=request.user,
            status__in=['in_progress', 'review', 'revision']
        ).count()
        
        completed_orders_count = Order.objects.filter(
            expert=request.user,
            status='completed'
        ).count()
        
        # Рейтинг
        avg_rating = ExpertReview.objects.filter(
            expert=request.user,
            is_published=True
        ).aggregate(avg=models.Avg('rating'))['avg'] or 0
        
        # Специализации
        specializations_count = Specialization.objects.filter(
            expert=request.user,
            is_verified=True
        ).count()
        
        return Response({
            'total_earnings': float(total_earnings),
            'monthly_earnings': float(monthly_earnings),
            'active_orders': active_orders_count,
            'completed_orders': completed_orders_count,
            'average_rating': float(avg_rating),
            'verified_specializations': specializations_count,
            'success_rate': float(stats.success_rate),
            'total_orders': stats.total_orders,
            'response_time_avg': stats.response_time_avg.total_seconds() if stats.response_time_avg else None
        })

    @action(detail=False, methods=['get'])
    def active_orders(self, request):
        """Получение активных заказов специалиста"""
        if request.user.role != 'expert':
            return Response(
                {'detail': 'Только специалисты могут просматривать свои заказы'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        orders = Order.objects.filter(
            expert=request.user,
            status__in=['in_progress', 'review', 'revision']
        ).select_related(
            'client', 'subject', 'work_type', 'complexity'
        ).order_by('-created_at')
        
        orders_data = []
        for order in orders:
            orders_data.append({
                'id': order.id,
                'title': order.title,
                'description': order.description,
                'status': order.status,
                'budget': float(order.budget),
                'deadline': order.deadline,
                'created_at': order.created_at,
                'client': {
                    'id': order.client.id,
                    'username': order.client.username,
                    'email': order.client.email
                },
                'subject': {
                    'id': order.subject.id,
                    'name': order.subject.name
                } if order.subject else None,
                'work_type': {
                    'id': order.work_type.id,
                    'name': order.work_type.name
                } if order.work_type else None,
                'complexity': {
                    'id': order.complexity.id,
                    'name': order.complexity.name
                } if order.complexity else None
            })
        
        return Response(orders_data)

    @action(detail=False, methods=['get'])
    def available_orders(self, request):
        """Получение доступных заказов для специалиста"""
        if request.user.role != 'expert':
            return Response(
                {'detail': 'Только специалисты могут просматривать доступные заказы'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Получаем специализации эксперта
        expert_subjects = Specialization.objects.filter(
            expert=request.user,
            is_verified=True
        ).values_list('subject_id', flat=True)
        
        # Ищем заказы по специализациям эксперта
        orders = Order.objects.filter(
            status='new',
            subject_id__in=expert_subjects,
            expert__isnull=True
        ).select_related(
            'client', 'subject', 'work_type', 'complexity'
        ).order_by('-created_at')
        
        orders_data = []
        for order in orders:
            orders_data.append({
                'id': order.id,
                'title': order.title,
                'description': order.description,
                'budget': float(order.budget),
                'deadline': order.deadline,
                'created_at': order.created_at,
                'client': {
                    'id': order.client.id,
                    'username': order.client.username
                },
                'subject': {
                    'id': order.subject.id,
                    'name': order.subject.name
                } if order.subject else None,
                'work_type': {
                    'id': order.work_type.id,
                    'name': order.work_type.name
                } if order.work_type else None,
                'complexity': {
                    'id': order.complexity.id,
                    'name': order.complexity.name
                } if order.complexity else None
            })
        
        return Response(orders_data)

    @action(detail=False, methods=['get'])
    def recent_orders(self, request):
        """Получение последних заказов специалиста"""
        if request.user.role != 'expert':
            return Response(
                {'detail': 'Только специалисты могут просматривать свои заказы'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        orders = Order.objects.filter(
            expert=request.user
        ).select_related(
            'client', 'subject', 'work_type', 'complexity'
        ).order_by('-created_at')[:10]
        
        orders_data = []
        for order in orders:
            orders_data.append({
                'id': order.id,
                'title': order.title,
                'status': order.status,
                'budget': float(order.budget),
                'created_at': order.created_at,
                'client': {
                    'id': order.client.id,
                    'username': order.client.username
                },
                'subject': {
                    'id': order.subject.id,
                    'name': order.subject.name
                } if order.subject else None
            })
        
        return Response(orders_data)

    @action(detail=False, methods=['get'])
    def profile(self, request):
        """Получение профиля специалиста"""
        if request.user.role != 'expert':
            return Response(
                {'detail': 'Только специалисты могут просматривать свой профиль'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Специализации
        specializations = Specialization.objects.filter(
            expert=request.user
        ).select_related('subject').order_by('-is_verified', '-experience_years')
        
        specializations_data = []
        for spec in specializations:
            specializations_data.append({
                'id': spec.id,
                'subject': {
                    'id': spec.subject.id,
                    'name': spec.subject.name
                },
                'experience_years': spec.experience_years,
                'hourly_rate': float(spec.hourly_rate),
                'description': spec.description,
                'is_verified': spec.is_verified,
                'created_at': spec.created_at
            })
        
        # Документы
        documents = ExpertDocument.objects.filter(
            expert=request.user
        ).order_by('-created_at')
        
        documents_data = []
        for doc in documents:
            documents_data.append({
                'id': doc.id,
                'document_type': doc.document_type,
                'title': doc.title,
                'description': doc.description,
                'is_verified': doc.is_verified,
                'created_at': doc.created_at
            })
        
        # Отзывы
        reviews = ExpertReview.objects.filter(
            expert=request.user,
            is_published=True
        ).select_related('client', 'order').order_by('-created_at')[:5]
        
        reviews_data = []
        for review in reviews:
            reviews_data.append({
                'id': review.id,
                'rating': review.rating,
                'comment': review.comment,
                'created_at': review.created_at,
                'client': {
                    'id': review.client.id,
                    'username': review.client.username
                },
                'order': {
                    'id': review.order.id,
                    'title': review.order.title
                }
            })
        
        return Response({
            'user': {
                'id': request.user.id,
                'username': request.user.username,
                'email': request.user.email,
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
                'rating': float(request.user.rating) if request.user.rating else 0
            },
            'specializations': specializations_data,
            'documents': documents_data,
            'reviews': reviews_data
        })

    @action(detail=False, methods=['post'])
    def take_order(self, request):
        """Взять заказ в работу"""
        if request.user.role != 'expert':
            return Response(
                {'detail': 'Только специалисты могут брать заказы'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        order_id = request.data.get('order_id')
        if not order_id:
            return Response(
                {'detail': 'Необходимо указать order_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            order = Order.objects.get(id=order_id, status='new', expert__isnull=True)
        except Order.DoesNotExist:
            return Response(
                {'detail': 'Заказ не найден или недоступен'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Проверяем, есть ли у эксперта специализация по предмету заказа
        if order.subject:
            has_specialization = Specialization.objects.filter(
                expert=request.user,
                subject=order.subject,
                is_verified=True
            ).exists()
            
            if not has_specialization:
                return Response(
                    {'detail': 'У вас нет специализации по данному предмету'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Назначаем эксперта на заказ
        order.expert = request.user
        order.status = 'in_progress'
        order.save()
        
        # Отправляем уведомление клиенту
        NotificationService.notify_expert_assigned(order)
        
        return Response({
            'detail': 'Заказ успешно взят в работу',
            'order_id': order.id
        })
