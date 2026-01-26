from rest_framework import serializers
from .models import Chat, Message
from apps.users.serializers import UserSerializer

class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    sender_id = serializers.IntegerField(source='sender.id', read_only=True)
    is_mine = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = ['id', 'sender', 'sender_id', 'text', 'is_read', 'is_mine', 'created_at']
        read_only_fields = ['sender', 'sender_id', 'is_mine', 'created_at']

    def get_is_mine(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.sender.id == request.user.id
        return False

class ChatListSerializer(serializers.ModelSerializer):
    """Сериализатор для списка чатов (без всех сообщений)"""
    participants = UserSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    last_message_time = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    other_user = serializers.SerializerMethodField()
    order_id = serializers.SerializerMethodField()
    order_title = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = ['id', 'order', 'order_id', 'order_title', 'participants', 'other_user', 'last_message', 'last_message_time', 'unread_count']
        read_only_fields = ['participants', 'order']

    def get_order_id(self, obj):
        return obj.order.id if obj.order else None

    def get_order_title(self, obj):
        return obj.order.title if obj.order else None

    def get_last_message(self, obj):
        last_message = obj.messages.order_by('-created_at').first()
        if last_message:
            return {
                'text': last_message.text,
                'sender_id': last_message.sender.id,
                'created_at': last_message.created_at
            }
        return None

    def get_last_message_time(self, obj):
        last_message = obj.messages.order_by('-created_at').first()
        if last_message:
            return last_message.created_at
        # Если нет сообщений, возвращаем время создания заказа или None
        return obj.order.created_at if obj.order else None

    def get_unread_count(self, obj):
        user = self.context.get('request').user
        return obj.messages.exclude(sender=user).filter(is_read=False).count()

    def get_other_user(self, obj):
        """Возвращает собеседника (не текущего пользователя)"""
        request = self.context.get('request')
        if request and request.user:
            other_users = obj.participants.exclude(id=request.user.id)
            if other_users.exists():
                return UserSerializer(other_users.first()).data
        return None

class ChatDetailSerializer(serializers.ModelSerializer):
    """Сериализатор для детального просмотра чата (со всеми сообщениями)"""
    participants = UserSerializer(many=True, read_only=True)
    messages = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    other_user = serializers.SerializerMethodField()
    order_id = serializers.SerializerMethodField()
    order_title = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = ['id', 'order', 'order_id', 'order_title', 'participants', 'other_user', 'messages', 'unread_count']
        read_only_fields = ['participants', 'order']

    def get_order_id(self, obj):
        return obj.order.id if obj.order else None

    def get_order_title(self, obj):
        return obj.order.title if obj.order else None

    def get_messages(self, obj):
        messages = obj.messages.select_related('sender').order_by('created_at')
        return MessageSerializer(messages, many=True, context=self.context).data

    def get_unread_count(self, obj):
        user = self.context.get('request').user
        return obj.messages.exclude(sender=user).filter(is_read=False).count()

    def get_other_user(self, obj):
        """Возвращает собеседника (не текущего пользователя)"""
        request = self.context.get('request')
        if request and request.user:
            other_users = obj.participants.exclude(id=request.user.id)
            if other_users.exists():
                return UserSerializer(other_users.first()).data
        return None 