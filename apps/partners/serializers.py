from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import PartnerChatRoom, PartnerChatMessage

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


class PartnerChatMessageSerializer(serializers.ModelSerializer):
    """Сериализатор для сообщений в чатах партнеров"""
    
    sender = UserBasicSerializer(read_only=True)
    text = serializers.CharField(source='message', read_only=True)  # Алиас для фронтенда
    sent_at = serializers.DateTimeField(source='created_at', read_only=True)  # Алиас для фронтенда
    
    class Meta:
        model = PartnerChatMessage
        fields = ['id', 'sender', 'message', 'text', 'is_system', 'is_pinned', 'created_at', 'sent_at']
        read_only_fields = ['id', 'sender', 'is_system', 'created_at']


class PartnerChatRoomSerializer(serializers.ModelSerializer):
    """Сериализатор для чат-комнат партнеров"""
    
    members = UserBasicSerializer(many=True, read_only=True)
    participants = UserBasicSerializer(many=True, read_only=True, source='members')  # Алиас для фронтенда
    created_by = UserBasicSerializer(read_only=True)
    messages = PartnerChatMessageSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    type = serializers.CharField(source='room_type', required=False)  # Алиас для фронтенда
    is_muted = serializers.SerializerMethodField()  # Добавляем поле для фронтенда
    
    class Meta:
        model = PartnerChatRoom
        fields = [
            'id', 'name', 'description', 'room_type', 'type', 'members', 'participants',
            'created_by', 'is_active', 'created_at', 'updated_at', 'messages', 
            'last_message', 'unread_count', 'is_muted'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
    
    def get_last_message(self, obj):
        last_msg = obj.messages.last()
        if last_msg:
            return PartnerChatMessageSerializer(last_msg).data
        return None
    
    def get_unread_count(self, obj):
        # Можно добавить логику подсчета непрочитанных сообщений
        return 0
    
    def get_is_muted(self, obj):
        # Можно добавить логику для отключения уведомлений
        return False


from .models import PartnerApplication


class PartnerApplicationCreateSerializer(serializers.ModelSerializer):
    """Публичное создание заявки на партнёрство"""

    class Meta:
        model = PartnerApplication
        fields = ['id', 'full_name', 'email', 'telegram', 'phone', 'comment']
        read_only_fields = ['id']

    def validate_full_name(self, value):
        value = (value or '').strip()
        if len(value) < 3:
            raise serializers.ValidationError('Укажите ФИО полностью')
        return value

    def validate(self, attrs):
        if not attrs.get('telegram') and not attrs.get('phone'):
            raise serializers.ValidationError(
                'Укажите Telegram или телефон для связи'
            )
        return attrs


class PartnerApplicationSerializer(serializers.ModelSerializer):
    """Полное представление заявки для директора"""

    status_display = serializers.CharField(source='get_status_display', read_only=True)
    processed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PartnerApplication
        fields = [
            'id', 'full_name', 'email', 'telegram', 'phone', 'comment',
            'status', 'status_display', 'director_note', 'processed_by',
            'processed_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'processed_by', 'processed_by_name']

    def get_processed_by_name(self, obj):
        if obj.processed_by:
            return obj.processed_by.get_full_name() or obj.processed_by.username
        return None
