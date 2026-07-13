from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from .models import (
    SupportRequest,
    SupportMessage,
    Claim,
    ClaimMessage,
    AdminChatRoom,
    AdminChatMessage,
    TicketActivity,
    AdminActionLog,
)
from apps.users.serializers import UserSerializer
from apps.orders.serializers import OrderSerializer


class SupportMessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    attachments = serializers.SerializerMethodField()
    
    class Meta:
        model = SupportMessage
        fields = [
            'id', 'sender', 'message', 'file', 'file_name', 'file_size', 'attachments',
            'is_admin', 'read_by_user', 'read_by_admin', 'created_at'
        ]

    def get_attachments(self, obj):
        if not obj.file:
            return []
        return [{
            'name': obj.file_name or obj.file.name.rsplit('/', 1)[-1],
            'url': obj.file.url,
            'size': obj.file_size,
            'type': 'file',
        }]


class SupportRequestSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    admin = UserSerializer(read_only=True)
    assigned_users = UserSerializer(many=True, read_only=True)
    assigned_user_ids = serializers.ListField(
        child=serializers.IntegerField(), 
        write_only=True, 
        required=False,
        help_text="Список ID пользователей для назначения"
    )
    messages = SupportMessageSerializer(many=True, read_only=True)
    support_chat_id = serializers.IntegerField(source='support_chat.id', read_only=True)
    tags_list = serializers.ListField(source='get_tags_list', read_only=True)
    last_message = serializers.SerializerMethodField()
    last_message_at = serializers.SerializerMethodField()
    messages_count = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    first_response_minutes = serializers.SerializerMethodField()
    resolution_minutes = serializers.SerializerMethodField()
    sla_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = SupportRequest
        fields = ['id', 'ticket_number', 'user', 'admin', 'assigned_users', 'assigned_user_ids', 
                  'support_chat_id', 'subject', 'description', 'status', 'priority', 'tags', 'tags_list',
                  'auto_created', 'created_at', 'updated_at', 'completed_at', 'first_response_at',
                  'messages', 'last_message', 'last_message_at', 'messages_count', 'unread_count',
                  'first_response_minutes', 'resolution_minutes', 'sla_overdue']

    def get_last_message(self, obj):
        message = obj.messages.order_by('-created_at').first()
        if not message:
            return None
        return {
            'text': message.message,
            'created_at': message.created_at,
            'sender_id': message.sender_id,
            'is_admin': message.is_admin,
        }

    def get_last_message_at(self, obj):
        message = obj.messages.order_by('-created_at').first()
        return message.created_at if message else None

    def get_messages_count(self, obj):
        return obj.messages.count()

    def get_unread_count(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        role = getattr(user, 'role', None)

        if role in ['admin', 'director']:
            return obj.messages.filter(is_admin=False, read_by_admin=False).count()
        if getattr(user, 'is_authenticated', False) and obj.user_id == user.id:
            return obj.messages.filter(is_admin=True, read_by_user=False).count()
        return 0

    def get_first_response_minutes(self, obj):
        if not obj.first_response_at:
            return None
        return max(0, int((obj.first_response_at - obj.created_at).total_seconds() // 60))

    def get_resolution_minutes(self, obj):
        if not obj.completed_at:
            return None
        return max(0, int((obj.completed_at - obj.created_at).total_seconds() // 60))

    def get_sla_overdue(self, obj):
        if obj.first_response_at or obj.status in ['completed', 'closed']:
            return False
        return obj.created_at <= timezone.now() - timedelta(hours=24)
    
    def update(self, instance, validated_data):
        assigned_user_ids = validated_data.pop('assigned_user_ids', None)
        
        # Обновляем основные поля
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Обновляем назначенных пользователей
        if assigned_user_ids is not None:
            instance.assigned_users.set(assigned_user_ids)
        
        return instance


class ClaimMessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    
    class Meta:
        model = ClaimMessage
        fields = ['id', 'sender', 'message', 'is_admin', 'created_at']


class ClaimSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    admin = UserSerializer(read_only=True)
    assigned_users = UserSerializer(many=True, read_only=True)
    assigned_user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="Список ID пользователей для назначения"
    )
    order = OrderSerializer(read_only=True)
    order_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    messages = ClaimMessageSerializer(many=True, read_only=True)
    tags_list = serializers.ListField(source='get_tags_list', read_only=True)
    
    # Поля для арбитража
    plaintiff = UserSerializer(read_only=True)
    defendant = UserSerializer(read_only=True)
    plaintiff_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    defendant_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = Claim
        fields = ['id', 'ticket_number', 'user', 'admin', 'assigned_users', 'assigned_user_ids',
                  'order', 'order_id', 'claim_type', 'subject', 'description', 'status', 'priority',
                  'tags', 'tags_list', 'resolution', 'progress', 'created_at', 'updated_at', 'completed_at', 'messages',
                  'plaintiff', 'defendant', 'plaintiff_id', 'defendant_id', 'reason', 'refund_type',
                  'refund_percentage', 'refund_amount']
        read_only_fields = ['created_at', 'updated_at', 'completed_at']
    
    def update(self, instance, validated_data):
        assigned_user_ids = validated_data.pop('assigned_user_ids', None)
        
        # Обновляем основные поля
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Обновляем назначенных пользователей
        if assigned_user_ids is not None:
            instance.assigned_users.set(assigned_user_ids)
        
        return instance


class AdminChatMessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    
    class Meta:
        model = AdminChatMessage
        fields = ['id', 'sender', 'message', 'created_at']


class AdminChatRoomSerializer(serializers.ModelSerializer):
    members = UserSerializer(many=True, read_only=True)
    created_by = UserSerializer(read_only=True)
    messages = AdminChatMessageSerializer(many=True, read_only=True)
    
    class Meta:
        model = AdminChatRoom
        fields = ['id', 'name', 'description', 'members', 'created_by', 'created_at', 'messages']


class TicketActivitySerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)

    class Meta:
        model = TicketActivity
        fields = ['id', 'actor', 'activity_type', 'text', 'meta', 'created_at']


class AdminActionLogSerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)
    target_user = UserSerializer(read_only=True)

    class Meta:
        model = AdminActionLog
        fields = [
            'id',
            'actor',
            'target_user',
            'action',
            'object_type',
            'object_id',
            'description',
            'meta',
            'created_at',
        ]
