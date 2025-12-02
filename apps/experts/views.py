from django.shortcuts import render
from rest_framework import viewsets, permissions, status, serializers, exceptions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Avg, Count, Q
import logging

logger = logging.getLogger(__name__)
from .models import Specialization, ExpertDocument, ExpertReview, ExpertStatistics, ExpertRating, ExpertApplication, Education
from .serializers import (
    SpecializationSerializer, ExpertDocumentSerializer,
    ExpertReviewSerializer, ExpertStatisticsSerializer,
    ExpertRatingSerializer, ExpertMatchSerializer,
    ExpertApplicationSerializer, ExpertApplicationCreateSerializer
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
            logger.warning(f"Попытка доступа к статистике не-экспертом: user_id={request.user.id}")
            return Response(
                {'detail': 'Только специалисты могут просматривать статистику'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            logger.info(f"Запрос статистики эксперта: user_id={request.user.id}")
            from .services import ExpertStatisticsService
            stats = ExpertStatisticsService.get_dashboard_statistics(request.user)
            return Response(stats)
        except Exception as e:
            logger.error(f"Ошибка получения статистики для эксперта {request.user.id}: {str(e)}", exc_info=True)
            return Response(
                {'detail': 'Ошибка при получении статистики'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def active_orders(self, request):
        """Получение активных заказов специалиста"""
        if request.user.role != 'expert':
            return Response(
                {'detail': 'Только специалисты могут просматривать свои заказы'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from .services import ExpertOrderService
        orders = ExpertOrderService.get_active_orders(request.user)
        
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
        
        from .services import ExpertOrderService
        orders = ExpertOrderService.get_available_orders(request.user)
        
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
        
        from django.core.cache import cache
        
        # Пытаемся получить из кэша
        cache_key = f'expert_profile_{request.user.id}'
        cached_profile = cache.get(cache_key)
        if cached_profile:
            return Response(cached_profile)
        
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
        
        profile_data = {
            'user': {
                'id': request.user.id,
                'username': request.user.username,
                'email': request.user.email,
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
                'rating': float(request.user.rating) if hasattr(request.user, 'rating') and request.user.rating else 0
            },
            'specializations': specializations_data,
            'documents': documents_data,
            'reviews': reviews_data
        }
        
        # Кэшируем на 10 минут
        cache.set(cache_key, profile_data, timeout=600)
        
        return Response(profile_data)

    @action(detail=False, methods=['post'])
    def take_order(self, request):
        """Взять заказ в работу"""
        if request.user.role != 'expert':
            logger.warning(f"Попытка взять заказ не-экспертом: user_id={request.user.id}")
            return Response(
                {'detail': 'Только специалисты могут брать заказы'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from .services import ExpertOrderService
        
        order_id = request.data.get('order_id')
        if not order_id:
            logger.warning(f"Попытка взять заказ без order_id: user_id={request.user.id}")
            return Response(
                {'detail': 'Необходимо указать order_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            logger.warning(f"Попытка взять несуществующий заказ: order_id={order_id}, user_id={request.user.id}")
            return Response(
                {'detail': 'Заказ не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            # Используем сервис для взятия заказа
            success, message = ExpertOrderService.take_order(request.user, order)
            
            if not success:
                logger.info(f"Эксперт не смог взять заказ: user_id={request.user.id}, order_id={order_id}, reason={message}")
                return Response(
                    {'detail': message},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            logger.info(f"Эксперт взял заказ: user_id={request.user.id}, order_id={order_id}")
            return Response({
                'detail': message,
                'order_id': order.id
            })
        except Exception as e:
            logger.error(f"Ошибка при взятии заказа: user_id={request.user.id}, order_id={order_id}, error={str(e)}", exc_info=True)
            return Response(
                {'detail': 'Ошибка при взятии заказа'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def financial_summary(self, request):
        """Получение финансовой сводки эксперта"""
        if request.user.role != 'expert':
            logger.warning(f"Попытка доступа к финансам не-экспертом: user_id={request.user.id}")
            return Response(
                {'detail': 'Только эксперты могут просматривать финансовую информацию'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            logger.info(f"Запрос финансовой сводки: user_id={request.user.id}")
            from .services import ExpertFinanceService
            summary = ExpertFinanceService.get_financial_summary(request.user)
            return Response(summary)
        except Exception as e:
            logger.error(f"Ошибка получения финансовой сводки для эксперта {request.user.id}: {str(e)}", exc_info=True)
            return Response(
                {'detail': 'Ошибка при получении финансовой информации'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def transactions(self, request):
        """Получение списка транзакций эксперта с фильтрацией"""
        if request.user.role != 'expert':
            return Response(
                {'detail': 'Только эксперты могут просматривать транзакции'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from .services import ExpertFinanceService
        from .serializers import TransactionSerializer
        from rest_framework.pagination import PageNumberPagination
        from datetime import datetime
        
        # Получаем фильтры из query параметров
        filters = {}
        if request.query_params.get('type'):
            filters['type'] = request.query_params.get('type')
        
        if request.query_params.get('date_from'):
            try:
                filters['date_from'] = datetime.strptime(
                    request.query_params.get('date_from'), 
                    '%Y-%m-%d'
                ).date()
            except ValueError:
                return Response(
                    {'detail': 'Неверный формат date_from. Используйте YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if request.query_params.get('date_to'):
            try:
                filters['date_to'] = datetime.strptime(
                    request.query_params.get('date_to'), 
                    '%Y-%m-%d'
                ).date()
            except ValueError:
                return Response(
                    {'detail': 'Неверный формат date_to. Используйте YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Получаем транзакции
        transactions = ExpertFinanceService.get_transactions(request.user, filters)
        
        # Применяем пагинацию
        paginator = PageNumberPagination()
        paginator.page_size = int(request.query_params.get('page_size', 20))
        page = paginator.paginate_queryset(transactions, request)
        
        if page is not None:
            serializer = TransactionSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def reviews(self, request):
        """Получение отзывов о работе эксперта"""
        if request.user.role != 'expert':
            return Response(
                {'detail': 'Только эксперты могут просматривать отзывы'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from .serializers import ExpertReviewDetailSerializer
        from rest_framework.pagination import PageNumberPagination
        
        # Базовый queryset
        reviews = ExpertReview.objects.filter(
            expert=request.user,
            is_published=True
        ).select_related('client', 'order')
        
        # Фильтр по рейтингу
        rating_filter = request.query_params.get('rating')
        if rating_filter:
            try:
                rating = int(rating_filter)
                if 1 <= rating <= 5:
                    reviews = reviews.filter(rating=rating)
                else:
                    return Response(
                        {'detail': 'Рейтинг должен быть от 1 до 5'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except ValueError:
                return Response(
                    {'detail': 'Неверный формат рейтинга'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Вычисляем статистику
        all_reviews = ExpertReview.objects.filter(
            expert=request.user,
            is_published=True
        )
        
        avg_rating = all_reviews.aggregate(avg=models.Avg('rating'))['avg'] or 0
        
        # Распределение по рейтингам
        rating_distribution = {}
        for i in range(1, 6):
            rating_distribution[str(i)] = all_reviews.filter(rating=i).count()
        
        # Применяем пагинацию
        paginator = PageNumberPagination()
        paginator.page_size = int(request.query_params.get('page_size', 10))
        page = paginator.paginate_queryset(reviews.order_by('-created_at'), request)
        
        if page is not None:
            serializer = ExpertReviewDetailSerializer(page, many=True)
            response_data = paginator.get_paginated_response(serializer.data).data
            response_data['average_rating'] = float(avg_rating)
            response_data['rating_distribution'] = rating_distribution
            return Response(response_data)
        
        serializer = ExpertReviewDetailSerializer(reviews, many=True)
        return Response({
            'count': reviews.count(),
            'average_rating': float(avg_rating),
            'rating_distribution': rating_distribution,
            'results': serializer.data
        })

    @action(detail=False, methods=['get'])
    def notifications(self, request):
        """Получение уведомлений эксперта"""
        if request.user.role != 'expert':
            return Response(
                {'detail': 'Только эксперты могут просматривать уведомления'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from apps.notifications.models import Notification
        from .serializers import NotificationSerializer
        from rest_framework.pagination import PageNumberPagination
        
        # Базовый queryset
        notifications = Notification.objects.filter(recipient=request.user)
        
        # Фильтр только непрочитанные
        if request.query_params.get('unread_only') == 'true':
            notifications = notifications.filter(is_read=False)
        
        # Фильтр по типу
        notification_type = request.query_params.get('type')
        if notification_type:
            notifications = notifications.filter(type=notification_type)
        
        # Подсчет непрочитанных
        unread_count = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).count()
        
        # Применяем пагинацию
        paginator = PageNumberPagination()
        paginator.page_size = int(request.query_params.get('page_size', 20))
        page = paginator.paginate_queryset(notifications.order_by('-created_at'), request)
        
        if page is not None:
            serializer = NotificationSerializer(page, many=True)
            response_data = paginator.get_paginated_response(serializer.data).data
            response_data['unread_count'] = unread_count
            return Response(response_data)
        
        serializer = NotificationSerializer(notifications, many=True)
        return Response({
            'unread_count': unread_count,
            'results': serializer.data
        })

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_notification_read(self, request, pk=None):
        """Отметить уведомление как прочитанное"""
        if request.user.role != 'expert':
            return Response(
                {'detail': 'Только эксперты могут отмечать уведомления'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from apps.notifications.models import Notification
        
        try:
            notification = Notification.objects.get(
                id=pk,
                recipient=request.user
            )
        except Notification.DoesNotExist:
            return Response(
                {'detail': 'Уведомление не найдено'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        notification.mark_as_read()
        
        return Response({
            'success': True,
            'message': 'Уведомление отмечено как прочитанное'
        })


class ExpertApplicationViewSet(viewsets.ModelViewSet):
    """API для работы с анкетами экспертов"""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return ExpertApplication.objects.select_related('expert', 'reviewed_by').prefetch_related('educations').all()
        # Любой авторизованный пользователь может видеть свою анкету
        return ExpertApplication.objects.filter(expert=self.request.user).select_related('expert', 'reviewed_by').prefetch_related('educations')
    
    def list(self, request, *args, **kwargs):
        """Список анкет - для админов все, для пользователей только своя"""
        try:
            logger.info(f"Applications list requested by user {request.user.id} (role: {request.user.role})")
            queryset = self.filter_queryset(self.get_queryset())
            logger.info(f"Queryset count: {queryset.count()}")
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error in applications list for user {request.user.id}: {str(e)}", exc_info=True)
            return Response(
                {'detail': f'Ошибка при получении списка анкет: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get_serializer_class(self):
        if self.action == 'create':
            return ExpertApplicationCreateSerializer
        return ExpertApplicationSerializer

    @action(detail=False, methods=['get'], url_path='my_application')
    def my_application(self, request):
        """Получить анкету текущего пользователя"""
        # Любой авторизованный пользователь может проверить свою анкету
        try:
            application = ExpertApplication.objects.select_related('expert', 'reviewed_by').prefetch_related('educations').get(expert=request.user)
            serializer = self.get_serializer(application)
            return Response(serializer.data)
        except ExpertApplication.DoesNotExist:
            # Возвращаем null вместо 404, чтобы фронтенд мог обработать отсутствие анкеты
            return Response(None, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        # Проверяем, есть ли уже анкета
        if ExpertApplication.objects.filter(expert=self.request.user).exists():
            raise serializers.ValidationError(
                'У вас уже есть анкету. Вы можете изменить существующую.'
            )
        
        # Создаем анкету
        if isinstance(serializer, ExpertApplicationCreateSerializer):
            educations_data = serializer.validated_data.pop('educations', [])
            
            application = ExpertApplication.objects.create(
                expert=self.request.user,
                **serializer.validated_data
            )
            
            # Создаем записи об образовании
            for education_data in educations_data:
                Education.objects.create(application=application, **education_data)
            
            # Возвращаем созданную анкету
            return application
        else:
            serializer.save(expert=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        application = self.perform_create(serializer)
        
        # Возвращаем сериализованную анкету
        output_serializer = ExpertApplicationSerializer(application)
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Одобрить анкету (только для админов)"""
        if not request.user.is_staff:
            return Response(
                {'detail': 'Только администраторы могут одобрять анкеты'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        application = self.get_object()
        application.status = 'approved'
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.save()
        
        # Уведомляем эксперта
        from apps.notifications.services import NotificationService
        NotificationService.notify_application_approved(application)
        
        return Response(ExpertApplicationSerializer(application).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Отклонить анкету (только для админов)"""
        if not request.user.is_staff:
            return Response(
                {'detail': 'Только администраторы могут отклонять анкеты'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        application = self.get_object()
        rejection_reason = request.data.get('rejection_reason', '')
        
        application.status = 'rejected'
        application.rejection_reason = rejection_reason
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.save()
        
        # Уведомляем эксперта
        from apps.notifications.services import NotificationService
        NotificationService.notify_application_rejected(application)
        
        return Response(ExpertApplicationSerializer(application).data)


