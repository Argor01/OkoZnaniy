from rest_framework import serializers
from .models import ArbitrationCase, ArbitrationMessage, ArbitrationActivity
from apps.users.serializers import UserSerializer
from apps.orders.serializers import OrderSerializer


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
            'id', 'case_number', 'plaintiff', 'defendant', 'defendant_id',
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
    description = serializers.CharField()
    deadline_relevant = serializers.BooleanField(default=False)
    
    # Шаг 3: Финансовые требования
    refund_type = serializers.ChoiceField(
        choices=ArbitrationCase.REFUND_TYPE_CHOICES,
        default='none'
    )
    requested_refund_percentage = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        min_value=0,
        max_value=100
    )
    requested_refund_amount = serializers.DecimalField(
        max_digits=15,
        decimal_places=2,
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
        
        return data
    
    def create(self, validated_data):
        # Получаем текущего пользователя из контекста
        user = self.context['request'].user
        
        # Создаем дело
        case = ArbitrationCase.objects.create(
            plaintiff=user,
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
