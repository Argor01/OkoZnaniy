from rest_framework import serializers
from .models import SupportRequest, SupportMessage, Claim, ClaimMessage, AdminChatRoom, AdminChatMessage
from apps.users.serializers import UserSerializer
from apps.orders.serializers import OrderSerializer


class SupportMessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    
    class Meta:
        model = SupportMessage
        fields = ['id', 'sender', 'message', 'is_admin', 'created_at']


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
    
    class Meta:
        model = SupportRequest
        fields = ['id', 'ticket_number', 'user', 'admin', 'assigned_users', 'assigned_user_ids', 
                  'support_chat_id', 'subject', 'description', 'status', 'priority', 'tags', 'tags_list',
                  'auto_created', 'created_at', 'updated_at', 'completed_at', 'messages']
    
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
    
    class Meta:
        model = Claim
        fields = ['id', 'ticket_number', 'user', 'admin', 'assigned_users', 'assigned_user_ids',
                  'order', 'order_id', 'claim_type', 'subject', 'description', 'status', 'priority', 
                  'tags', 'tags_list', 'resolution', 'created_at', 'updated_at', 'completed_at', 'messages']
        read_only_fields = ['status', 'resolution', 'created_at', 'updated_at', 'completed_at']
    
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
