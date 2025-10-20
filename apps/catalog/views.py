from django.shortcuts import render, get_object_or_404
from django.db.models import Count, Q, Avg, F, Sum
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Subject, Topic, WorkType, Complexity, SubjectCategory, DiscountRule
from .serializers import (
    SubjectSerializer, TopicSerializer,
    SubjectDetailSerializer, TopicDetailSerializer,
    WorkTypeSerializer, ComplexitySerializer,
    SubjectCategorySerializer, DiscountRuleSerializer,
    DiscountProgressSerializer
)
from .services import PricingService
from .discount_notifications import DiscountNotificationService
from django.utils import timezone

# Create your views here.

class SubjectCategoryViewSet(viewsets.ModelViewSet):
    queryset = SubjectCategory.objects.all()
    serializer_class = SubjectCategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'order']
    ordering = ['order', 'name']

    def get_queryset(self):
        return SubjectCategory.objects.annotate(
            subjects_count=Count('subjects'),
            active_subjects_count=Count('subjects', filter=Q(subjects__is_active=True))
        )

class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'description', 'keywords']
    ordering_fields = ['name', 'created_at', 'min_price']
    ordering = ['name']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return SubjectDetailSerializer
        return SubjectSerializer

    def get_queryset(self):
        queryset = Subject.objects.select_related('category').annotate(
            topics_count=Count('topics'),
            active_topics_annotated=Count('topics', filter=Q(topics__is_active=True)),
            experts_count=Count('experts', distinct=True),
            verified_experts_annotated=Count('experts', filter=Q(experts__is_verified=True), distinct=True),
            orders_count=Count('orders'),
            completed_orders_count=Count('orders', filter=Q(orders__status='completed')),
            avg_rating=Avg('orders__expert_review__rating', filter=Q(orders__status='completed'))
        )
        
        # Фильтрация по наличию экспертов
        has_experts = self.request.query_params.get('has_experts')
        if has_experts == 'true':
            queryset = queryset.filter(verified_experts_annotated__gt=0)
        
        # Фильтрация по ценовому диапазону
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        if min_price:
            queryset = queryset.filter(min_price__gte=min_price)
        if max_price:
            queryset = queryset.filter(min_price__lte=max_price)
            
        return queryset

    @action(detail=True, methods=['get'])
    def topics(self, request, pk=None):
        subject = self.get_object()
        topics = Topic.objects.filter(subject=subject).annotate(
            orders_count=Count('orders'),
            completed_orders_count=Count('orders', filter=Q(orders__status='completed'))
        )
        
        # Фильтрация по активности
        is_active = request.query_params.get('is_active')
        if is_active:
            topics = topics.filter(is_active=is_active == 'true')
            
        # Фильтрация по сложности
        complexity = request.query_params.get('complexity')
        if complexity:
            topics = topics.filter(complexity_level=complexity)
            
        serializer = TopicSerializer(topics, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def experts(self, request, pk=None):
        subject = self.get_object()
        experts = subject.experts.filter(is_verified=True).annotate(
            orders_count=Count('expert_orders'),
            completed_orders_count=Count('expert_orders', filter=Q(expert_orders__status='completed')),
            avg_rating=Avg('reviews__rating', filter=Q(reviews__is_published=True))
        )
        
        # Сортировка по рейтингу
        ordering = request.query_params.get('ordering', '-avg_rating')
        if ordering in ['avg_rating', '-avg_rating', 'orders_count', '-orders_count']:
            experts = experts.order_by(ordering)
            
        from apps.experts.serializers import ExpertListSerializer
        serializer = ExpertListSerializer(experts, many=True)
        return Response(serializer.data)

class TopicViewSet(viewsets.ModelViewSet):
    queryset = Topic.objects.all()
    serializer_class = TopicSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['subject', 'is_active', 'complexity_level']
    search_fields = ['name', 'description', 'keywords', 'subject__name']
    ordering_fields = ['name', 'created_at', 'orders_count']
    ordering = ['subject__name', 'name']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TopicDetailSerializer
        return TopicSerializer

    def get_queryset(self):
        queryset = Topic.objects.select_related('subject').annotate(
            orders_count=Count('orders'),
            completed_orders_count=Count('orders', filter=Q(orders__status='completed')),
            avg_complexity=Avg('orders__complexity__multiplier')
        )
        
        # Фильтрация по ключевым словам
        keywords = self.request.query_params.get('keywords')
        if keywords:
            keywords_list = [k.strip() for k in keywords.split(',')]
            q_objects = Q()
            for keyword in keywords_list:
                q_objects |= Q(keywords__icontains=keyword)
            queryset = queryset.filter(q_objects)
            
        return queryset

    @action(detail=True, methods=['get'])
    def orders(self, request, pk=None):
        topic = self.get_object()
        orders = topic.orders.all().select_related(
            'client', 'expert', 'work_type', 'complexity'
        ).annotate(
            files_count=Count('files'),
            comments_count=Count('comments')
        )
        
        # Фильтрация по статусу
        status = request.query_params.get('status')
        if status:
            orders = orders.filter(status=status)
            
        from apps.orders.serializers import OrderListSerializer
        serializer = OrderListSerializer(orders, many=True)
        return Response(serializer.data)

class DiscountRuleViewSet(viewsets.ModelViewSet):
    queryset = DiscountRule.objects.all()
    serializer_class = DiscountRuleSerializer
    permission_classes = [permissions.IsAdminUser]  # Только для администраторов
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'discount_type', 'work_types']
    search_fields = ['name', 'description']
    ordering_fields = ['value', 'min_orders', 'min_total_spent', 'valid_from', 'valid_until']
    ordering = ['-value']

    def get_queryset(self):
        queryset = DiscountRule.objects.all()
        
        # Фильтрация по активности с учетом дат
        if self.request.query_params.get('active_now') == 'true':
            now = timezone.now()
            queryset = queryset.filter(
                is_active=True,
                valid_from__lte=now
            ).filter(
                Q(valid_until__isnull=True) | Q(valid_until__gt=now)
            )
            
        return queryset

    @action(detail=True, methods=['get'])
    def eligible_users(self, request, pk=None):
        """Возвращает список пользователей, подходящих под правило скидки"""
        discount = self.get_object()
        
        from apps.users.models import User
        eligible_users = User.objects.annotate(
            completed_orders_count=Count(
                'client_orders',
                filter=Q(client_orders__status='completed')
            ),
            total_spent=Sum(
                'client_orders__budget',
                filter=Q(client_orders__status='completed')
            )
        ).filter(
            completed_orders_count__gte=discount.min_orders,
            total_spent__gte=discount.min_total_spent
        )
        
        from apps.users.serializers import UserListSerializer
        serializer = UserListSerializer(eligible_users, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_discounts(self, request):
        """Возвращает доступные скидки для текущего пользователя"""
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Требуется аутентификация'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Получаем все активные скидки
        active_discounts = DiscountRule.objects.filter(
            is_active=True,
            valid_from__lte=timezone.now()
        ).filter(
            Q(valid_until__isnull=True) | Q(valid_until__gt=timezone.now())
        )

        # Фильтруем только подходящие пользователю
        available_discounts = [
            discount for discount in active_discounts
            if discount.is_valid_for_user(request.user)
        ]

        # Получаем статистику пользователя
        user_stats = request.user.client_orders.filter(
            status='completed'
        ).aggregate(
            total_orders=Count('id'),
            total_spent=Sum('budget')
        )

        # Находим скидки, которые скоро будут доступны
        nearly_available = []
        for discount in active_discounts:
            if discount not in available_discounts:
                orders_remaining = max(0, discount.min_orders - user_stats['total_orders'])
                spent_remaining = max(0, discount.min_total_spent - (user_stats['total_spent'] or 0))

                if (orders_remaining > 0 and orders_remaining <= 3) or \
                   (spent_remaining > 0 and spent_remaining <= 5000):
                    nearly_available.append({
                        'discount': discount,
                        'orders_remaining': orders_remaining,
                        'spent_remaining': spent_remaining
                    })

        serializer = DiscountRuleSerializer(available_discounts, many=True)
        return Response({
            'available_discounts': serializer.data,
            'nearly_available': [{
                'discount': DiscountRuleSerializer(item['discount']).data,
                'orders_remaining': item['orders_remaining'],
                'spent_remaining': item['spent_remaining']
            } for item in nearly_available],
            'user_stats': user_stats
        })

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Возвращает статистику по использованию скидок"""
        if not request.user.is_staff:
            return Response(
                {'error': 'Доступно только для администраторов'},
                status=status.HTTP_403_FORBIDDEN
            )

        stats = DiscountNotificationService.get_discount_statistics()
        return Response(stats)

class WorkTypeViewSet(viewsets.ModelViewSet):
    queryset = WorkType.objects.all()
    serializer_class = WorkTypeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'base_price', 'estimated_time', 'orders_count']
    ordering = ['name']

    def get_queryset(self):
        return WorkType.objects.all()

    @action(detail=True, methods=['post'])
    def calculate_price(self, request, pk=None):
        """
        Рассчитывает предварительную стоимость заказа для данного типа работы
        """
        work_type = self.get_object()
        
        # Проверяем обязательные параметры
        try:
            complexity = Complexity.objects.get(pk=request.data.get('complexity_id'))
            deadline = timezone.datetime.fromisoformat(request.data.get('deadline'))
        except (Complexity.DoesNotExist, ValueError, TypeError):
            return Response(
                {'error': 'Необходимо указать complexity_id и deadline в правильном формате'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Получаем дополнительные требования
        additional_requirements = request.data.get('additional_requirements')
        
        try:
            # Рассчитываем цену и получаем разбивку с учетом скидок пользователя
            price_breakdown = PricingService.get_price_breakdown(
                work_type,
                complexity,
                deadline,
                request.user if request.user.is_authenticated else None,
                additional_requirements
            )
            
            return Response(price_breakdown)
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class ComplexityViewSet(viewsets.ModelViewSet):
    queryset = Complexity.objects.all()
    serializer_class = ComplexitySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'multiplier', 'orders_count']
    ordering = ['multiplier']

    def get_queryset(self):
        return Complexity.objects.all()

class DiscountViewSet(viewsets.ModelViewSet):
    queryset = DiscountRule.objects.all()
    serializer_class = DiscountRuleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.action in ['list', 'retrieve']:
            return self.queryset.filter(
                is_active=True,
                valid_from__lte=timezone.now()
            ).filter(
                Q(valid_until__isnull=True) |
                Q(valid_until__gt=timezone.now())
            )
        return self.queryset

    @action(detail=False, methods=['get'])
    def available(self, request):
        """Получить доступные пользователю скидки"""
        user = request.user
        user_orders = user.orders.filter(status='completed')
        total_orders = user_orders.count()
        total_spent = user_orders.aggregate(total=Sum('final_price'))['total'] or 0

        available_discounts = []
        nearly_available = []

        for discount in self.get_queryset():
            if total_orders >= discount.min_orders and total_spent >= discount.min_total_spent:
                available_discounts.append(discount)
            else:
                progress = {
                    'orders_remaining': max(0, discount.min_orders - total_orders),
                    'spent_remaining': max(0, discount.min_total_spent - total_spent),
                    'min_orders': discount.min_orders,
                    'min_total_spent': discount.min_total_spent
                }
                nearly_available.append({
                    'discount': discount,
                    'progress': progress
                })

        return Response({
            'available_discounts': DiscountRuleSerializer(available_discounts, many=True).data,
            'nearly_available': [{
                'discount': DiscountRuleSerializer(item['discount']).data,
                'progress': DiscountProgressSerializer(item['progress']).data
            } for item in nearly_available],
            'user_stats': {
                'total_orders': total_orders,
                'total_spent': total_spent
            }
        })

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Получить статистику по использованию скидок (только для админов)"""
        if not request.user.is_staff:
            return Response(status=status.HTTP_403_FORBIDDEN)

        now = timezone.now()
        week_ago = now - timezone.timedelta(days=7)
        month_ago = now - timezone.timedelta(days=30)

        discounts_stats = []
        for discount in self.queryset:
            discount_orders = discount.orders.all()
            stats = {
                'id': discount.id,
                'name': discount.name,
                'users_count': discount_orders.values('user').distinct().count(),
                'orders_count': discount_orders.count(),
                'total_discount_amount': discount_orders.aggregate(
                    total=Sum('discount_amount'))['total'] or 0,
            }
            stats['avg_discount_amount'] = (
                stats['total_discount_amount'] / stats['orders_count']
                if stats['orders_count'] > 0 else 0
            )
            discounts_stats.append(stats)

        return Response({
            'discounts': discounts_stats,
            'periods': {
                'week': {
                    'orders_count': Order.objects.filter(
                        discount__isnull=False,
                        created_at__gte=week_ago
                    ).count(),
                    'total_discount': Order.objects.filter(
                        discount__isnull=False,
                        created_at__gte=week_ago
                    ).aggregate(total=Sum('discount_amount'))['total'] or 0,
                },
                'month': {
                    'orders_count': Order.objects.filter(
                        discount__isnull=False,
                        created_at__gte=month_ago
                    ).count(),
                    'total_discount': Order.objects.filter(
                        discount__isnull=False,
                        created_at__gte=month_ago
                    ).aggregate(total=Sum('discount_amount'))['total'] or 0,
                }
            }
        })
