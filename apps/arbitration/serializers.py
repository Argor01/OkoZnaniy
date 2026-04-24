from decimal import Decimal
from rest_framework import serializers
from .models import ArbitrationCase, ArbitrationMessage, ArbitrationActivity, Complaint
from apps.users.serializers import UserSerializer
from apps.orders.serializers import OrderSerializer
from apps.orders.models import Order, OrderFile
from django.contrib.auth import get_user_model


class ArbitrationMessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    
    class Meta:
        model = ArbitrationMessage
        fields = [
            'id', 'sender', 'message_type', 'text', 'is_internal',
            'attachments', 'created_at'
        ]
        read_only_fields = ['created_at']


class ArbitrationActivitySerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)
    activity_type_display = serializers.CharField(source='get_activity_type_display', read_only=True)
    
    class Meta:
        model = ArbitrationActivity
        fields = [
            'id', 'actor', 'activity_type', 'activity_type_display',
            'description', 'metadata', 'created_at'
        ]
        read_only_fields = ['created_at']


class ArbitrationCaseSerializer(serializers.ModelSerializer):
    plaintiff = UserSerializer(read_only=True)
    defendant = UserSerializer(read_only=True)
    assigned_admin = UserSerializer(read_only=True)
    assigned_users = UserSerializer(many=True, read_only=True)
    decision_made_by = UserSerializer(read_only=True)
    order = OrderSerializer(read_only=True)
    
    messages = ArbitrationMessageSerializer(many=True, read_only=True)
    activities = ArbitrationActivitySerializer(many=True, read_only=True)
    
    # Write-only поля для связей
    plaintiff_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    order_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    defendant_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    assigned_user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    
    # Дополнительные поля
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    refund_type_display = serializers.CharField(source='get_refund_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    tags_list = serializers.ListField(source='get_tags_list', read_only=True)
    
    class Meta:
        model = ArbitrationCase
        fields = [
            'id', 'case_number', 'plaintiff', 'plaintiff_id', 'defendant', 'defendant_id',
            'order', 'order_id', 'reason', 'reason_display', 'subject',
            'description', 'refund_type', 'refund_type_display',
            'requested_refund_percentage', 'requested_refund_amount',
            'approved_refund_percentage', 'approved_refund_amount',
            'status', 'status_display', 'priority', 'priority_display',
            'assigned_admin', 'assigned_users', 'assigned_user_ids',
            'decision', 'decision_made_by', 'decision_date',
            'created_at', 'updated_at', 'submitted_at', 'closed_at',
            'deadline_relevant', 'evidence_files', 'tags', 'tags_list',
            'messages', 'activities'
        ]
        read_only_fields = [
            'case_number', 'created_at', 'updated_at', 'submitted_at',
            'closed_at', 'decision_date'
        ]
    
    def create(self, validated_data):
        # Удаляем write-only поля
        assigned_user_ids = validated_data.pop('assigned_user_ids', None)
        plaintiff_id = validated_data.pop('plaintiff_id', None)
        
        # Получаем plaintiff из user_id если передан
        if plaintiff_id:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            validated_data['plaintiff'] = User.objects.get(id=plaintiff_id)
        
        # Создаем дело
        case = ArbitrationCase.objects.create(**validated_data)
        
        # Назначаем наблюдателей
        if assigned_user_ids:
            case.assigned_users.set(assigned_user_ids)
        
        return case
    
    def update(self, instance, validated_data):
        # Обрабатываем назначенных пользователей
        assigned_user_ids = validated_data.pop('assigned_user_ids', None)
        
        # Обновляем основные поля
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Обновляем назначенных пользователей
        if assigned_user_ids is not None:
            instance.assigned_users.set(assigned_user_ids)
        
        return instance


class ArbitrationCaseListSerializer(serializers.ModelSerializer):
    """Упрощенный сериализатор для списка дел"""
    plaintiff = UserSerializer(read_only=True)
    defendant = UserSerializer(read_only=True)
    assigned_admin = UserSerializer(read_only=True)
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    
    messages_count = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ArbitrationCase
        fields = [
            'id', 'case_number', 'plaintiff', 'defendant', 'subject',
            'status', 'status_display', 'priority', 'priority_display',
            'reason', 'reason_display', 'assigned_admin',
            'created_at', 'updated_at', 'messages_count', 'unread_count'
        ]
    
    def get_messages_count(self, obj):
        return obj.messages.count()
    
    def get_unread_count(self, obj):
        # Можно добавить логику подсчета непрочитанных сообщений
        return 0


class ArbitrationSubmissionSerializer(serializers.Serializer):
    """Сериализатор для пошаговой подачи претензии"""
    
    # Шаг 1: Основная информация
    order_id = serializers.IntegerField(required=False, allow_null=True)
    defendant_id = serializers.IntegerField(required=False, allow_null=True)
    subject = serializers.CharField(max_length=255)
    
    # Шаг 2: Причина и описание
    reason = serializers.ChoiceField(choices=ArbitrationCase.REASON_CHOICES)
    description = serializers.CharField(allow_blank=True)
    deadline_relevant = serializers.BooleanField(default=False)
    
    # Шаг 3: Финансовые требования
    refund_type = serializers.ChoiceField(
        choices=ArbitrationCase.REFUND_TYPE_CHOICES,
        default='none'
    )
    requested_refund_percentage = serializers.FloatField(
        default=0,
        min_value=0,
        max_value=100
    )
    requested_refund_amount = serializers.FloatField(
        required=False,
        allow_null=True
    )
    
    # Дополнительно
    evidence_files = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list
    )
    
    def validate(self, data):
        request = self.context['request']
        user = request.user
        order_id = data.get('order_id')

        # Проверка: описание не может быть пустым
        if not data.get('description', '').strip():
            raise serializers.ValidationError({
                'description': 'Описание проблемы обязательно для заполнения'
            })
        
        # Проверка: если запрашивается возврат, должен быть указан процент
        if data.get('refund_type') in ['partial', 'full']:
            if data.get('requested_refund_percentage', 0) <= 0:
                raise serializers.ValidationError({
                    'requested_refund_percentage': 'Укажите процент возврата'
                })

        if order_id:
            try:
                order = Order.objects.select_related('client', 'expert').get(id=order_id)
            except Order.DoesNotExist:
                raise serializers.ValidationError({
                    'order_id': 'Заказ не найден'
                })

            client_id = getattr(order.client, 'id', None)
            expert_id = getattr(order.expert, 'id', None)
            
            if user.id not in {client_id, expert_id}:
                raise serializers.ValidationError({
                    'order_id': 'Вы не участвуете в этом заказе'
                })

            # Если по заказу ещё не назначен исполнитель (status='new'), претензию
            # подавать рано — клиенту надо сначала отозвать заказ или выбрать эксперта.
            # Если же заказ уже в работе и эксперт был отвязан (например, бан),
            # позволяем подать жалобу даже без expert_id.
            order_status = str(getattr(order, 'status', '') or '')
            if not order.expert_id and order_status in ('new', 'draft', ''):
                raise serializers.ValidationError({
                    'order_id': 'По заказу пока не назначен исполнитель'
                })

            existing = ArbitrationCase.objects.filter(
                order_id=order_id,
                plaintiff=user,
            ).exclude(status__in=['closed', 'rejected']).first()
            if existing is not None:
                raise serializers.ValidationError({
                    'order_id': (
                        f'По этому заказу у вас уже есть активная претензия '
                        f'({existing.case_number}). Подать новую можно после '
                        f'закрытия предыдущей.'
                    ),
                    'existing_case_number': existing.case_number,
                })

        return data
    
    def create(self, validated_data):
        # Получаем текущего пользователя из контекста
        user = self.context['request'].user
        order = None
        defendant = None

        order_id = validated_data.get('order_id')
        if order_id:
            order = Order.objects.select_related('client', 'expert').get(id=order_id)
            if order.client_id == user.id:
                defendant = order.expert
            elif order.expert_id == user.id:
                defendant = order.client

        if not defendant:
            defendant_id = validated_data.pop('defendant_id', None)
            if defendant_id:
                User = get_user_model()
                defendant = User.objects.get(id=defendant_id)
        
        # Конвертируем float в Decimal для модели
        validated_data['requested_refund_percentage'] = Decimal(str(validated_data.get('requested_refund_percentage', 0)))
        if validated_data.get('requested_refund_amount') is not None:
            validated_data['requested_refund_amount'] = Decimal(str(validated_data['requested_refund_amount']))
        
        # Создаем дело
        case = ArbitrationCase.objects.create(
            plaintiff=user,
            defendant=defendant,
            **validated_data
        )
        
        # Создаем активность
        ArbitrationActivity.objects.create(
            case=case,
            actor=user,
            activity_type='created',
            description=f'Дело создано пользователем {user.get_full_name() or user.username}'
        )
        
        return case


class ComplaintFileSerializer(serializers.ModelSerializer):
    """Сериализатор для файлов претензии"""
    class Meta:
        model = OrderFile
        fields = ['id', 'file_name', 'file_url', 'file_type']
        read_only_fields = ['id']


class ComplaintSerializer(serializers.ModelSerializer):
    """Сериализатор для претензии (Complaint)"""
    plaintiff = UserSerializer(read_only=True)
    defendant = UserSerializer(read_only=True)
    order = OrderSerializer(read_only=True)
    files = serializers.SerializerMethodField()
    
    # Write-only поля
    order_id = serializers.IntegerField(write_only=True)
    files_upload = serializers.ListField(
        child=serializers.FileField(),
        write_only=True,
        required=False,
        allow_empty=True,
    )
    
    class Meta:
        model = Complaint
        fields = [
            'id', 'order', 'order_id', 'plaintiff', 'defendant',
            'complaint_type',
            'is_order_relevant', 'relevant_until',
            'financial_requirement',
            'refund_percent', 'description', 'files', 'files_upload',
            'status',
            'created_at', 'updated_at', 'resolved_at', 'resolution',
            'chat_id',
        ]
        read_only_fields = ['created_at', 'updated_at', 'resolved_at', 'status']
    
    def get_files(self, obj):
        """Получаем файлы из связанных OrderFile"""
        if not obj.order:
            return []
        files = OrderFile.objects.filter(order=obj.order)
        return [
            {
                'id': f.id,
                'file_name': f.file.name.split('/')[-1] if f.file else '',
                'file_url': f.file.url if f.file else None,
                'file_type': f.file_type,
            }
            for f in files
        ]
    
    def validate_order_id(self, value):
        """Проверяем, что для заказа нет открытых претензий"""
        existing_complaint = Complaint.objects.filter(
            order_id=value,
            status__in=['open', 'in_progress']
        ).first()
        
        if existing_complaint:
            raise serializers.ValidationError(
                f'По этому заказу уже есть открытая претензия №{existing_complaint.id}'
            )
        
        return value
    
    def create(self, validated_data):
        """При создании претензии автоматически замораживаем заказ"""
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError('Пользователь не авторизован')
        
        files_upload = validated_data.pop('files_upload', [])
        order_id = validated_data.pop('order_id')
        
        # Получаем заказ
        try:
            order = Order.objects.select_related('client', 'expert').get(id=order_id)
        except Order.DoesNotExist:
            raise serializers.ValidationError({'order_id': 'Заказ не найден'})
        
        # Проверяем, что пользователь участвует в заказе
        if request.user.id not in {order.client_id, order.expert_id}:
            raise serializers.ValidationError({'order_id': 'Вы не участвуете в этом заказе'})
        
        # Определяем ответчика
        if request.user.id == order.client_id:
            defendant = order.expert
        else:
            defendant = order.client
        
        if not defendant:
            raise serializers.ValidationError({'order_id': 'Не удалось определить ответчика'})
        
        # Создаем претензию
        complaint = Complaint.objects.create(
            plaintiff=request.user,
            defendant=defendant,
            order=order,
            **validated_data
        )
        
        # Сохраняем файлы
        for uploaded_file in files_upload:
            OrderFile.objects.create(
                order=order,
                file=uploaded_file,
                uploaded_by=request.user,
                file_type='task',
            )
        
        # Замораживаем заказ
        order.freeze(f'Открыта претензия #{complaint.id}')
        
        return complaint
