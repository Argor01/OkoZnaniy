from rest_framework import serializers
from .models import SupportRequest, SupportMessage, Claim, AdminChatRoom, AdminChatMessage
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
    messages = SupportMessageSerializer(many=True, read_only=True)
    
    class Meta:
        model = SupportRequest
        fields = ['id', 'user', 'admin', 'subject', 'description', 'status', 
                  'priority', 'created_at', 'updated_at', 'completed_at', 'messages']


class ClaimSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    admin = UserSerializer(read_only=True)
    order = OrderSerializer(read_only=True)
    
    class Meta:
        model = Claim
        fields = ['id', 'user', 'admin', 'order', 'claim_type', 'subject', 
                  'description', 'status', 'resolution', 'created_at', 'updated_at', 'completed_at']


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
