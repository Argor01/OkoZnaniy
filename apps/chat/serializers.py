from rest_framework import serializers
from .models import Chat, Message, SupportChat, SupportMessage, ContactViolationLog
from apps.users.serializers import UserSerializer


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    is_mine = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = ['id', 'text', 'file', 'file_name', 'message_type', 'offer_data', 
                  'sender', 'created_at', 'is_read', 'is_mine']
    
    def get_is_mine(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.sender == request.user
        return False


class ChatListSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Chat
        fields = ['id', 'order', 'participants', 'context_title', 'is_frozen', 
                  'frozen_reason', 'last_message', 'unread_count']
    
    def get_last_message(self, obj):
        last_message = obj.messages.order_by('-created_at').first()
        if last_message:
            return {
                'text': last_message.text,
                'sender': last_message.sender.username,
                'created_at': last_message.created_at
            }
        return None
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0


class ChatDetailSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True, read_only=True)
    messages = MessageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Chat
        fields = ['id', 'order', 'participants', 'context_title', 'is_frozen', 
                  'frozen_reason', 'frozen_at', 'messages']


class SupportMessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    is_mine = serializers.SerializerMethodField()
    
    class Meta:
        model = SupportMessage
        fields = ['id', 'text', 'file', 'message_type', 'sender', 'created_at', 
                  'is_read', 'is_mine']
    
    def get_is_mine(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.sender == request.user
        return False


class SupportChatSerializer(serializers.ModelSerializer):
    client = UserSerializer(read_only=True)
    admin = UserSerializer(read_only=True)
    support_messages = SupportMessageSerializer(many=True, read_only=True)
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = SupportChat
        fields = ['id', 'client', 'admin', 'status', 'priority', 'subject', 
                  'created_at', 'updated_at', 'support_messages', 'unread_count']
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user:
            if request.user.role == 'admin':
                return obj.support_messages.filter(
                    is_read=False, 
                    sender=obj.client
                ).count()
            else:
                return obj.support_messages.filter(
                    is_read=False, 
                    sender__role='admin'
                ).count()
        return 0


class ContactViolationSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    chat = ChatListSerializer(read_only=True)
    message = MessageSerializer(read_only=True)
    reviewed_by = UserSerializer(read_only=True)
    detected_contacts_summary = serializers.CharField(
        source='get_detected_contacts_summary', 
        read_only=True
    )
    
    class Meta:
        model = ContactViolationLog
        fields = [
            'id', 'chat', 'user', 'message', 'violation_type', 'detected_data',
            'risk_level', 'status', 'reviewed_by', 'reviewed_at', 'admin_decision',
            'created_at', 'updated_at', 'detected_contacts_summary'
        ]
        read_only_fields = [
            'detected_data', 'risk_level', 'reviewed_by', 'reviewed_at', 'created_at', 'updated_at'
        ]