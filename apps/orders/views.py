from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import models
from django.utils import timezone
from .models import Order, Transaction, Dispute, OrderFile, OrderComment, Bid
from .serializers import OrderSerializer, TransactionSerializer, DisputeSerializer, OrderFileSerializer, OrderCommentSerializer, BidSerializer
from apps.notifications.services import NotificationService
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import FileResponse
import mimetypes
from .services import DiscountService
from .models import DiscountRule

# Create your views here.

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = self.queryset.prefetch_related(
            'bids__expert', 'files', 'comments', 'subject', 'topic', 'work_type', 'complexity'
        ).select_related('client', 'expert')
        
        if user.is_staff:
            return queryset
        return queryset.filter(
            models.Q(client=user) | models.Q(expert=user)
        )

    def perform_create(self, serializer):
        # Дополнительная валидация дедлайна
        deadline = serializer.validated_data.get('deadline')
        if deadline and deadline <= timezone.now():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({
                'deadline': 'Дедлайн не может быть в прошлом'
            })
        
        order = serializer.save()
        # Автоматически применяем лучшую доступную скидку
        DiscountService.apply_best_discount(order)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def available(self, request):
        """Список доступных заказов для исполнителя (новые, без назначенного эксперта)."""
        user = request.user
        queryset = self.queryset.filter(status='new', expert__isnull=True).exclude(client=user).prefetch_related('bids__expert', 'files', 'comments')
        
        try:
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            # Логируем ошибку для отладки
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Ошибка при получении доступных заказов: {str(e)}")
            
            # Возвращаем пустой список вместо ошибки 500
            return Response({
                'results': [],
                'count': 0,
                'error': 'Произошла ошибка при загрузке заказов. Попробуйте позже.'
            }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def take(self, request, pk=None):
        """Взять заказ в работу (только для роли expert)."""
        # Не используем get_object(), чтобы не упереться в get_queryset с фильтрацией по пользователю
        order = get_object_or_404(self.serializer_class.Meta.model, pk=pk)
        user = request.user
        # Простейшая проверка роли для MVP
        if getattr(user, 'role', None) != 'expert':
            return Response({'detail': 'Только эксперт может взять заказ.'}, status=status.HTTP_403_FORBIDDEN)
        # Нельзя брать собственный заказ клиента
        if getattr(order, 'client_id', None) == user.id:
            return Response({'detail': 'Нельзя взять собственный заказ.'}, status=status.HTTP_400_BAD_REQUEST)
        if order.expert_id:
            return Response({'detail': 'У заказа уже есть назначенный эксперт.'}, status=status.HTTP_400_BAD_REQUEST)
        if order.status != 'new':
            return Response({'detail': 'Взять можно только заказ в статусе new.'}, status=status.HTTP_400_BAD_REQUEST)
        order.expert = user
        order.status = 'in_progress'
        order.save(update_fields=['expert', 'status', 'updated_at'])
        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def complete(self, request, pk=None):
        """Завершить заказ (эксперт переводит в done)."""
        order = self.get_object()
        user = request.user
        if getattr(user, 'role', None) != 'expert':
            return Response({'detail': 'Только эксперт может завершать заказ.'}, status=status.HTTP_403_FORBIDDEN)
        if order.expert_id != user.id:
            return Response({'detail': 'Вы не являетесь исполнителем этого заказа.'}, status=status.HTTP_403_FORBIDDEN)
        if order.status != 'in_progress':
            return Response({'detail': 'Завершить можно только заказ в работе.'}, status=status.HTTP_400_BAD_REQUEST)
        order.status = 'completed'
        order.save(update_fields=['status', 'updated_at'])
        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def submit(self, request, pk=None):
        """Эксперт отправляет работу на проверку: in_progress -> review."""
        order = self.get_object()
        user = request.user
        if getattr(user, 'role', None) != 'expert' or order.expert_id != user.id:
            return Response({'detail': 'Недостаточно прав.'}, status=status.HTTP_403_FORBIDDEN)
        if order.status not in ['in_progress', 'revision']:
            return Response({'detail': 'Отправить на проверку можно только из статусов in_progress или revision.'}, status=status.HTTP_400_BAD_REQUEST)
        order.status = 'review'
        order.save(update_fields=['status', 'updated_at'])
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def accept_bid(self, request, pk=None):
        """Клиент принимает ставку: назначает эксперта и фиксирует бюджет."""
        order = self.get_object()
        user = request.user
        if getattr(user, 'role', None) != 'client' or order.client_id != user.id:
            return Response({'detail': 'Недостаточно прав.'}, status=status.HTTP_403_FORBIDDEN)
        bid_id = request.data.get('bid_id')
        if not bid_id:
            return Response({'bid_id': 'Не указан ID ставки'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            bid = Bid.objects.select_related('expert', 'order').get(id=bid_id, order=order)
        except Bid.DoesNotExist:
            return Response({'detail': 'Ставка не найдена'}, status=status.HTTP_404_NOT_FOUND)
        # Назначаем эксперта и согласованную цену
        order.expert = bid.expert
        order.budget = bid.amount
        # Переводим заказ в in_progress, если он был в одном из допустимых статусов
        # Добавили поддержку перехода из waiting_payment, чтобы после принятия ставки
        # заказ гарантированно переходил в работу в типичных сценариях оплаты/подтверждения
        if order.status in ['new', 'revision', 'review', 'waiting_payment']:
            old_status = order.status
            order.status = 'in_progress'
            order.save(update_fields=['expert', 'budget', 'status', 'updated_at'])
            NotificationService.notify_status_changed(order, old_status)
        else:
            order.save(update_fields=['expert', 'budget', 'updated_at'])
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def approve(self, request, pk=None):
        """Клиент принимает работу: review -> completed."""
        order = self.get_object()
        user = request.user
        if getattr(user, 'role', None) != 'client' or order.client_id != user.id:
            return Response({'detail': 'Недостаточно прав.'}, status=status.HTTP_403_FORBIDDEN)
        if order.status != 'review':
            return Response({'detail': 'Принять можно только из статуса review.'}, status=status.HTTP_400_BAD_REQUEST)
        order.status = 'completed'
        order.save(update_fields=['status', 'updated_at'])
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def revision(self, request, pk=None):
        """Клиент отправляет на доработку: review -> revision."""
        order = self.get_object()
        user = request.user
        if getattr(user, 'role', None) != 'client' or order.client_id != user.id:
            return Response({'detail': 'Недостаточно прав.'}, status=status.HTTP_403_FORBIDDEN)
        if order.status != 'review':
            return Response({'detail': 'На доработку можно отправить только из статуса review.'}, status=status.HTTP_400_BAD_REQUEST)
        order.status = 'revision'
        order.save(update_fields=['status', 'updated_at'])
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'])
    def apply_discount(self, request, pk=None):
        """
        Применить конкретную скидку к заказу
        """
        order = self.get_object()
        discount_id = request.data.get('discount_id')

        if not discount_id:
            return Response(
                {'error': 'Не указан ID скидки'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            discount = DiscountRule.objects.get(id=discount_id)
        except DiscountRule.DoesNotExist:
            return Response(
                {'error': 'Скидка не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )

        if order.apply_discount(discount):
            return Response(OrderSerializer(order).data)
        return Response(
            {'error': 'Невозможно применить скидку'},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=True, methods=['post'])
    def remove_discount(self, request, pk=None):
        """
        Удалить скидку с заказа
        """
        order = self.get_object()
        order.remove_discount()
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'])
    def take_order(self, request, pk=None):
        order = self.get_object()
        if order.status != 'new':
            return Response(
                {'detail': 'Заказ уже взят в работу'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if request.user.role != 'expert':
            return Response(
                {'detail': 'Только эксперты могут брать заказы'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        old_status = order.status
        order.expert = request.user
        order.status = 'in_progress'
        order.save()
        
        NotificationService.notify_order_taken(order)
        NotificationService.notify_status_changed(order, old_status)
        
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'])
    def complete_order(self, request, pk=None):
        order = self.get_object()
        if order.expert != request.user:
            return Response(
                {'detail': 'Только назначенный эксперт может завершить заказ'},
                status=status.HTTP_403_FORBIDDEN
            )
        if order.status not in ['in_progress', 'revision']:
            return Response(
                {'detail': 'Неверный статус заказа'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_status = order.status
        order.status = 'completed'
        order.save()
        
        NotificationService.notify_status_changed(order, old_status)
        
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def create_dispute(self, request, pk=None):
        """Создание спора клиентом по заказу"""
        order = self.get_object()
        user = request.user
        
        # Проверяем права
        if user.role != 'client' or order.client != user:
            return Response(
                {'error': 'Только клиент может создать спор по своему заказу'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Проверяем, что заказ в подходящем статусе
        if order.status not in ['completed', 'review']:
            return Response(
                {'error': 'Спор можно создать только для завершенных заказов или заказов на проверке'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Проверяем, что спор еще не создан
        if hasattr(order, 'dispute'):
            return Response(
                {'error': 'Спор по этому заказу уже существует'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response(
                {'error': 'Укажите причину спора'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(reason) < 10:
            return Response(
                {'error': 'Причина спора должна содержать минимум 10 символов'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Создаем спор
        dispute = Dispute.objects.create(
            order=order,
            reason=reason
        )
        
        # Отправляем уведомление администраторам
        from apps.notifications.services import NotificationService
        NotificationService.notify_dispute_created(dispute)
        
        serializer = DisputeSerializer(dispute)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Transaction.objects.all()
        return Transaction.objects.filter(user=user)

class DisputeViewSet(viewsets.ModelViewSet):
    queryset = Dispute.objects.all()
    serializer_class = DisputeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or getattr(user, 'role', None) == 'admin':
            return Dispute.objects.all()
        return Dispute.objects.filter(order__client=user)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        dispute = self.get_object()
        user = request.user
        
        # Проверяем права: админ или назначенный арбитр
        is_admin = user.is_staff or getattr(user, 'role', None) == 'admin'
        is_assigned_arbitrator = dispute.arbitrator == user
        
        if not (is_admin or is_assigned_arbitrator):
            return Response(
                {"error": "Только администратор или назначенный арбитр может решить спор"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        dispute.resolved = True
        # Не перезаписываем арбитра, если он уже назначен
        if not dispute.arbitrator:
            dispute.arbitrator = request.user
        dispute.result = request.data.get('result', '')
        dispute.save()
        
        # Уведомляем участников о решении спора
        from apps.notifications.services import NotificationService
        NotificationService.notify_dispute_resolved(dispute)
        
        return Response(DisputeSerializer(dispute).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def assign_arbitrator(self, request, pk=None):
        """Назначение арбитра на спор (только для админов)"""
        dispute = self.get_object()
        user = request.user
        
        if user.role != 'admin':
            return Response(
                {'error': 'Только администратор может назначать арбитров'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        arbitrator_id = request.data.get('arbitrator_id')
        if not arbitrator_id:
            return Response(
                {'error': 'Укажите ID арбитра'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from apps.users.models import User
            arbitrator = User.objects.get(id=arbitrator_id, role='arbitrator')
        except User.DoesNotExist:
            return Response(
                {'error': 'Арбитр не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        dispute.arbitrator = arbitrator
        dispute.save()
        
        # Отправляем уведомление арбитру
        from apps.notifications.services import NotificationService
        NotificationService.notify_arbitrator_assigned(dispute)
        
        serializer = DisputeSerializer(dispute)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_disputes(self, request):
        """Получить споры для арбитра"""
        user = request.user
        
        if user.role == 'arbitrator':
            # Споры, назначенные на этого арбитра
            disputes = Dispute.objects.filter(arbitrator=user, resolved=False)
        elif user.role == 'admin':
            # Все нерешенные споры для админа
            disputes = Dispute.objects.filter(resolved=False)
        else:
            return Response(
                {'error': 'Доступно только для арбитров и администраторов'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Возвращаем в том же формате, что и основной list endpoint
        serializer = DisputeSerializer(disputes, many=True)
        return Response({
            'count': disputes.count(),
            'next': None,
            'previous': None,
            'results': serializer.data
        })

class OrderFileViewSet(viewsets.ModelViewSet):
    serializer_class = OrderFileSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        return OrderFile.objects.filter(
            order_id=self.kwargs['order_pk']
        ).select_related('order', 'uploaded_by')

    def perform_create(self, serializer):
        order = Order.objects.get(id=self.kwargs['order_pk'])
        if not (self.request.user == order.client or self.request.user == order.expert):
            raise permissions.PermissionDenied(
                'Только клиент и эксперт могут добавлять файлы'
            )
        order_file = serializer.save(
            order_id=self.kwargs['order_pk'],
            uploaded_by=self.request.user
        )
        NotificationService.notify_file_uploaded(order_file)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    @action(detail=True, methods=['get'])
    def download(self, request, order_pk=None, pk=None):
        order_file = self.get_object()
        file_handle = order_file.file.open()
        
        # Получаем MIME-тип файла
        content_type, _ = mimetypes.guess_type(order_file.file.name)
        if not content_type:
            content_type = 'application/octet-stream'
            
        # Создаем HTTP-ответ с файлом
        response = FileResponse(file_handle, content_type=content_type)
        response['Content-Length'] = order_file.file.size
        response['Content-Disposition'] = f'attachment; filename="{order_file.filename()}"'
        
        return response

class OrderCommentViewSet(viewsets.ModelViewSet):
    serializer_class = OrderCommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return OrderComment.objects.filter(
            order_id=self.kwargs['order_pk']
        )

    def perform_create(self, serializer):
        order = Order.objects.get(id=self.kwargs['order_pk'])
        if not (self.request.user == order.client or self.request.user == order.expert):
            raise permissions.PermissionDenied(
                'Только клиент и эксперт могут оставлять комментарии'
            )
        comment = serializer.save(
            order_id=self.kwargs['order_pk'],
            author=self.request.user
        )
        NotificationService.notify_new_comment(comment)

class BidViewSet(viewsets.ModelViewSet):
    serializer_class = BidSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        order_id = self.kwargs['order_pk']
        order = get_object_or_404(Order, id=order_id)
        user = self.request.user
        
        # Проверяем права доступа - клиент может видеть ставки по своим заказам
        if order.client_id != user.id and getattr(user, 'role', None) != 'expert' and not user.is_staff:
            return Bid.objects.none()
        
        return Bid.objects.filter(order_id=order_id).select_related('expert', 'order')

    def perform_create(self, serializer):
        order_id = self.kwargs['order_pk']
        order = get_object_or_404(Order, id=order_id)
        
        # Проверяем права
        user = self.request.user
        if getattr(user, 'role', None) != 'expert':
            raise permissions.PermissionDenied('Только эксперт может делать ставку.')
        
        if order.client_id == user.id:
            raise permissions.PermissionDenied('Нельзя ставить на свой заказ.')
        
        if order.status not in ['new', 'in_progress', 'revision', 'review']:
            raise permissions.PermissionDenied('Нельзя сделать ставку для текущего статуса заказа.')
        
        # Если эксперт уже назначен и это не он
        if order.expert_id and order.expert_id != user.id:
            raise permissions.PermissionDenied('У заказа уже есть назначенный эксперт.')
        
        # Создаем или обновляем ставку
        bid, created = Bid.objects.get_or_create(
            order=order, 
            expert=user, 
            defaults=serializer.validated_data
        )
        if not created:
            for attr, value in serializer.validated_data.items():
                setattr(bid, attr, value)
            bid.save()
        
        return bid
