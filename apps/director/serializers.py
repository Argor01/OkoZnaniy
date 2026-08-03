from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import InternalMessage, MeetingRequest, MessageAttachment, DirectorChatRoom, DirectorChatMessage

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Базовая информация о пользователе (без email для приватности)"""
    display_username = serializers.CharField(read_only=True)
    online = serializers.SerializerMethodField()
    last_seen = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'display_username', 'first_name', 'last_name', 'role', 'online', 'last_seen']
    
    def get_online(self, obj):
        # Можно добавить логику проверки онлайн-статуса
        return False
    
    def get_last_seen(self, obj):
        # Можно добавить логику последнего визита
        return obj.last_login


class MessageAttachmentSerializer(serializers.ModelSerializer):
    """Сериализатор для вложений"""
    
    class Meta:
        model = MessageAttachment
        fields = ['id', 'file', 'filename', 'file_size', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']


class InternalMessageSerializer(serializers.ModelSerializer):
    """Сериализатор для внутренних сообщений"""
    
    sender = UserBasicSerializer(read_only=True)
    recipient = UserBasicSerializer(read_only=True)
    attachments = MessageAttachmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = InternalMessage
        fields = [
            'id', 'sender', 'recipient', 'text', 'claim_id', 'order',
            'priority', 'is_read', 'read_at', 'created_at', 'updated_at',
            'attachments'
        ]
        read_only_fields = ['id', 'sender', 'is_read', 'read_at', 'created_at', 'updated_at']


class InternalMessageCreateSerializer(serializers.ModelSerializer):
    """Сериализатор для создания сообщений"""
    
    attachments = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        write_only=True
    )
    
    class Meta:
        model = InternalMessage
        fields = ['text', 'claim_id', 'order', 'priority', 'recipient', 'attachments']
    
    def create(self, validated_data):
        attachments_data = validated_data.pop('attachments', [])
        message = InternalMessage.objects.create(**validated_data)
        
        # Создаем вложения
        for file in attachments_data:
            MessageAttachment.objects.create(
                message=message,
                file=file,
                filename=file.name,
                file_size=file.size
            )
        
        return message



class DirectorChatMessageSerializer(serializers.ModelSerializer):
    """Сериализатор для сообщений в чатах директора"""
    
    sender = UserBasicSerializer(read_only=True)
    text = serializers.CharField(source='message', read_only=True)
    sent_at = serializers.DateTimeField(source='created_at', read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = DirectorChatMessage
        fields = ['id', 'sender', 'message', 'text', 'file', 'file_name', 'file_url', 'is_system', 'is_pinned', 'created_at', 'sent_at']
        read_only_fields = ['id', 'sender', 'is_system', 'created_at']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class DirectorChatRoomSerializer(serializers.ModelSerializer):
    """Сериализатор для чат-комнат директора"""
    
    members = UserBasicSerializer(many=True, read_only=True)
    participants = UserBasicSerializer(many=True, read_only=True, source='members')
    created_by = UserBasicSerializer(read_only=True)
    messages = DirectorChatMessageSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    type = serializers.CharField(source='room_type', required=False)
    is_muted = serializers.SerializerMethodField()
    
    class Meta:
        model = DirectorChatRoom
        fields = [
            'id', 'name', 'description', 'room_type', 'type', 'members', 'participants',
            'created_by', 'is_active', 'created_at', 'updated_at', 'messages', 
            'last_message', 'unread_count', 'is_muted'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
    
    def get_last_message(self, obj):
        last_msg = obj.messages.last()
        if last_msg:
            return DirectorChatMessageSerializer(last_msg, context=self.context).data
        return None
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        from .models import RoomReadStatus
        status = RoomReadStatus.objects.filter(user=request.user, room=obj).first()
        if status:
            return obj.messages.filter(created_at__gt=status.last_read_at, is_system=False).count()
        return obj.messages.filter(is_system=False).count()
    
    def get_is_muted(self, obj):
        return False
    def get_is_muted(self, obj):
        # Можно добавить логику для отключения уведомлений
        return False
