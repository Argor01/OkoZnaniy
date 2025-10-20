from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Chat, Message
from .serializers import ChatSerializer, MessageSerializer
from apps.orders.models import Order
from apps.notifications.services import NotificationService

class ChatViewSet(viewsets.ModelViewSet):
    serializer_class = ChatSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Chat.objects.filter(
            participants=self.request.user
        ).prefetch_related('participants', 'messages', 'messages__sender')

    def perform_create(self, serializer):
        chat = serializer.save()
        # Добавляем участников чата
        order = chat.order
        chat.participants.add(order.client, order.expert)

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        chat = self.get_object()
        if request.user not in chat.participants.all():
            return Response(
                {'detail': 'Вы не являетесь участником этого чата'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = MessageSerializer(data=request.data)
        if serializer.is_valid():
            message = serializer.save(
                chat=chat,
                sender=request.user
            )
            NotificationService.notify_new_message(message)
            return Response(MessageSerializer(message).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        chat = self.get_object()
        if request.user not in chat.participants.all():
            return Response(
                {'detail': 'Вы не являетесь участником этого чата'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        messages = chat.messages.select_related('sender').order_by('-created_at')
        page = self.paginate_queryset(messages)
        
        if page is not None:
            serializer = MessageSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)
