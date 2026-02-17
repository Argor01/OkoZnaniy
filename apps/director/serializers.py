from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import InternalMessage, MeetingRequest, MessageAttachment

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Базовая информация о пользователе"""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role']


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
