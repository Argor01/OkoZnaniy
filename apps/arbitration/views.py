from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import ArbitrationCase, ArbitrationMessage, ArbitrationActivity
from .serializers import (
    ArbitrationCaseSerializer,
    ArbitrationCaseListSerializer,
    ArbitrationMessageSerializer,
    ArbitrationActivitySerializer,
    ArbitrationSubmissionSerializer
)

User = get_user_model()


class IsAdminUser(IsAuthenticated):
    """Проверка прав администратора"""
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == 'admin'


def log_activity(case, actor, activity_type, description, metadata=None):
    """Записать событие в ленту активности"""
    ArbitrationActivity.objects.create(
        case=case,
        actor=actor,
        activity_type=activity_type,
        description=description,
        metadata=metadata or {}
    )


class ArbitrationCaseViewSet(viewsets.ModelViewSet):
    """ViewSet для арбитражных дел"""
    queryset = ArbitrationCase.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ArbitrationCaseListSerializer
        elif self.action == 'submit_claim':
            return ArbitrationSubmissionSerializer
        return ArbitrationCaseSerializer
    
    def get_permissions(self):
        """
        Разные права для разных действий:
        - create, submit_claim: любой авторизованный пользователь
        - list, retrieve: пользователь видит свои дела или админы видят все
        - update, partial_update, destroy, admin actions: только администраторы
        """
        if self.action in ['create', 'submit_claim']:
            return [IsAuthenticated()]
        elif self.action in ['list', 'retrieve', 'my_cases']:
            return [IsAuthenticated()]
        else:
            return [IsAdminUser()]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Администраторы видят все дела
        if user.role == 'admin':
            # Фильтры для админов
            status_filter = self.request.query_params.get('status')
            priority_filter = self.request.query_params.get('priority')
            assigned_to_me = self.request.query_params.get('assigned_to_me')
            
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            if priority_filter:
                queryset = queryset.filter(priority=priority_filter)
            if assigned_to_me == 'true':
                queryset = queryset.filter(assigned_admin=user)
            
            return queryset.select_related(
                'plaintiff', 'defendant', 'assigned_admin', 'order'
            ).prefetch_related('assigned_users', 'messages', 'activities')
        
        # Обычные пользователи видят только свои дела (как истец или ответчик)
        queryset = queryset.filter(
            Q(plaintiff=user) | Q(defendant=user)
        ).select_related(
            'plaintiff', 'defendant', 'assigned_admin', 'order'
        ).prefetch_related('messages')
        
        return queryset
    
    def perform_create(self, serializer):
        """При создании дела автоматически устанавливаем истца"""
        case = serializer.save(plaintiff=self.request.user)
        log_activity(
            case,
            self.request.user,
            'created',
            f'Дело создано пользователем {self.request.user.get_full_name() or self.request.user.username}'
        )
    
    @action(detail=False, methods=['post'], url_path='submit-claim')
    def submit_claim(self, request):
        """
        Пошаговая подача претензии
        POST /api/arbitration/cases/submit-claim/
        """
        serializer = ArbitrationSubmissionSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        case = serializer.save()
        
        # Автоматически подаем дело
        case.submit()
        
        log_activity(
            case,
            request.user,
            'submitted',
            f'Дело подано пользователем {request.user.get_full_name() or request.user.username}'
        )
        
        return Response(
            ArbitrationCaseSerializer(case).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=False, methods=['get'], url_path='my-cases')
    def my_cases(self, request):
        """Получить все дела текущего пользователя"""
        cases = self.get_queryset().filter(
            Q(plaintiff=request.user) | Q(defendant=request.user)
        )
        serializer = ArbitrationCaseListSerializer(cases, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='take-in-work')
    def take_in_work(self, request, pk=None):
        """Взять дело в работу (только для админов)"""
        case = self.get_object()
        
        if case.status == 'submitted':
            case.status = 'under_review'
        elif case.status in ['draft', 'awaiting_response']:
            case.status = 'in_arbitration'
        
        case.assigned_admin = request.user
        case.save()
        
        log_activity(
            case,
            request.user,
            'admin_assigned',
            f'Администратор {request.user.get_full_name() or request.user.username} взял дело в работу',
            {'old_status': case.status, 'new_status': case.status}
        )
        
        return Response({
            'message': 'Дело взято в работу',
            'case': ArbitrationCaseSerializer(case).data
        })
    
    @action(detail=True, methods=['post'], url_path='send-message')
    def send_message(self, request, pk=None):
        """Отправить сообщение в дело"""
        case = self.get_object()
        text = request.data.get('message', '').strip()
        is_internal = request.data.get('is_internal', False)
        
        if not text:
            return Response(
                {'error': 'Сообщение не может быть пустым'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Определяем тип сообщения
        if request.user.role == 'admin':
            message_type = 'admin'
        elif request.user == case.plaintiff:
            message_type = 'plaintiff'
        elif request.user == case.defendant:
            message_type = 'defendant'
        else:
            return Response(
                {'error': 'У вас нет прав для отправки сообщений в это дело'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Создаем сообщение
        message = ArbitrationMessage.objects.create(
            case=case,
            sender=request.user,
            message_type=message_type,
            text=text,
            is_internal=is_internal and request.user.role == 'admin'
        )
        
        # Логируем активность
        if not is_internal:
            log_activity(
                case,
                request.user,
                'message_sent',
                f'Сообщение от {request.user.get_full_name() or request.user.username}'
            )
        
        return Response(
            ArbitrationMessageSerializer(message).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'], url_path='update-status')
    def update_status(self, request, pk=None):
        """Обновить статус дела (только для админов)"""
        case = self.get_object()
        new_status = request.data.get('status')
        
        if not new_status:
            return Response(
                {'error': 'Статус обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_status = case.status
        case.status = new_status
        
        if new_status == 'closed':
            case.closed_at = timezone.now()
        
        case.save()
        
        status_labels = dict(ArbitrationCase.STATUS_CHOICES)
        log_activity(
            case,
            request.user,
            'status_changed',
            f'Статус изменен: {status_labels.get(old_status, old_status)} → {status_labels.get(new_status, new_status)}',
            {'old_status': old_status, 'new_status': new_status}
        )
        
        return Response({
            'message': 'Статус обновлен',
            'case': ArbitrationCaseSerializer(case).data
        })
    
    @action(detail=True, methods=['post'], url_path='make-decision')
    def make_decision(self, request, pk=None):
        """Принять решение по делу (только для админов)"""
        case = self.get_object()
        decision_text = request.data.get('decision', '').strip()
        approved_refund_percentage = request.data.get('approved_refund_percentage')
        approved_refund_amount = request.data.get('approved_refund_amount')
        
        if not decision_text:
            return Response(
                {'error': 'Текст решения обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        case.decision = decision_text
        case.decision_made_by = request.user
        case.decision_date = timezone.now()
        case.status = 'decision_made'
        
        if approved_refund_percentage is not None:
            case.approved_refund_percentage = approved_refund_percentage
        if approved_refund_amount is not None:
            case.approved_refund_amount = approved_refund_amount
        
        case.save()
        
        log_activity(
            case,
            request.user,
            'decision_made',
            f'Решение принято администратором {request.user.get_full_name() or request.user.username}',
            {
                'approved_refund_percentage': str(approved_refund_percentage) if approved_refund_percentage else None,
                'approved_refund_amount': str(approved_refund_amount) if approved_refund_amount else None
            }
        )
        
        return Response({
            'message': 'Решение принято',
            'case': ArbitrationCaseSerializer(case).data
        })
    
    @action(detail=True, methods=['post'], url_path='process-refund')
    def process_refund(self, request, pk=None):
        """Оформить возврат средств (только для админов)"""
        case = self.get_object()
        refund_percentage = request.data.get('refund_percentage', 0)
        refund_amount = request.data.get('refund_amount')
        
        case.approved_refund_percentage = refund_percentage
        if refund_amount:
            case.approved_refund_amount = refund_amount
        
        case.status = 'decision_made'
        case.save()
        
        log_activity(
            case,
            request.user,
            'refund_processed',
            f'Оформлен возврат: {refund_percentage}%',
            {
                'refund_percentage': str(refund_percentage),
                'refund_amount': str(refund_amount) if refund_amount else None
            }
        )
        
        return Response({
            'message': f'Возврат {refund_percentage}% оформлен',
            'case': ArbitrationCaseSerializer(case).data
        })
    
    @action(detail=True, methods=['post'], url_path='close-case')
    def close_case(self, request, pk=None):
        """Закрыть дело (только для админов)"""
        case = self.get_object()
        final_message = request.data.get('message', '').strip()
        
        if final_message:
            # Отправляем финальное сообщение
            ArbitrationMessage.objects.create(
                case=case,
                sender=request.user,
                message_type='admin',
                text=final_message,
                is_internal=False
            )
        
        case.status = 'closed'
        case.closed_at = timezone.now()
        case.save()
        
        log_activity(
            case,
            request.user,
            'closed',
            f'Дело закрыто администратором {request.user.get_full_name() or request.user.username}'
        )
        
        return Response({
            'message': 'Дело закрыто',
            'case': ArbitrationCaseSerializer(case).data
        })
    
    @action(detail=True, methods=['post'], url_path='assign-users')
    def assign_users(self, request, pk=None):
        """Назначить наблюдателей на дело (только для админов)"""
        case = self.get_object()
        user_ids = request.data.get('user_ids', [])
        
        if not isinstance(user_ids, list):
            return Response(
                {'error': 'user_ids должен быть списком'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        users = User.objects.filter(id__in=user_ids)
        if len(users) != len(user_ids):
            return Response(
                {'error': 'Некоторые пользователи не найдены'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        case.assigned_users.set(users)
        
        names = ', '.join(
            f'{u.first_name} {u.last_name}'.strip() or u.username
            for u in users
        )
        log_activity(
            case,
            request.user,
            'observer_added',
            f'Назначены наблюдатели: {names}' if names else 'Наблюдатели обновлены',
            {'user_ids': user_ids}
        )
        
        return Response({
            'message': f'Назначено {len(users)} наблюдателей',
            'case': ArbitrationCaseSerializer(case).data
        })
    
    @action(detail=True, methods=['get'], url_path='activity-feed')
    def activity_feed(self, request, pk=None):
        """Получить объединенную ленту сообщений и активностей"""
        case = self.get_object()
        
        # Сообщения
        messages = [
            {
                'kind': 'message',
                'id': f'msg_{m.id}',
                'sender': {
                    'id': m.sender.id,
                    'first_name': m.sender.first_name,
                    'last_name': m.sender.last_name,
                    'role': getattr(m.sender, 'role', ''),
                },
                'text': m.text,
                'message_type': m.message_type,
                'is_internal': m.is_internal,
                'created_at': m.created_at.isoformat(),
            }
            for m in case.messages.select_related('sender').all()
            if not m.is_internal or request.user.role == 'admin'
        ]
        
        # Активности
        activities = [
            {
                'kind': 'activity',
                'id': f'act_{a.id}',
                'activity_type': a.activity_type,
                'description': a.description,
                'metadata': a.metadata,
                'actor': {
                    'id': a.actor.id if a.actor else None,
                    'first_name': a.actor.first_name if a.actor else '',
                    'last_name': a.actor.last_name if a.actor else '',
                } if a.actor else None,
                'created_at': a.created_at.isoformat(),
            }
            for a in case.activities.select_related('actor').all()
        ]
        
        # Объединяем и сортируем
        feed = messages + activities
        feed.sort(key=lambda x: x['created_at'])
        
        return Response({
            'messages': messages,
            'activities': activities,
            'feed': feed
        })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def arbitration_stats(request):
    """Статистика по арбитражу для админ-панели"""
    stats = {
        'total_cases': ArbitrationCase.objects.count(),
        'new_cases': ArbitrationCase.objects.filter(status='submitted').count(),
        'in_progress': ArbitrationCase.objects.filter(
            status__in=['under_review', 'in_arbitration']
        ).count(),
        'awaiting_decision': ArbitrationCase.objects.filter(
            status='awaiting_response'
        ).count(),
        'closed_cases': ArbitrationCase.objects.filter(status='closed').count(),
        'urgent_cases': ArbitrationCase.objects.filter(
            priority='urgent',
            status__in=['submitted', 'under_review', 'in_arbitration']
        ).count(),
    }
    return Response(stats)
