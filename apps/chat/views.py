from django.conf import settings
from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q, Max, Count, Prefetch
from .models import Chat, Message
from .serializers import ChatListSerializer, ChatDetailSerializer, MessageSerializer
from apps.orders.models import Order

class ChatViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return ChatListSerializer
        return ChatDetailSerializer

    def get_queryset(self):
        user = self.request.user
        return Chat.objects.filter(
            participants=user
        ).prefetch_related(
            'participants',
            'messages__sender'
        ).annotate(
            last_message_time=Max('messages__created_at')
        ).order_by('-last_message_time')

    def perform_create(self, serializer):
        chat = serializer.save()
        order = chat.order
        if order and order.client:
            chat.participants.add(order.client)
        if order and order.expert:
            chat.participants.add(order.expert)

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Отправка сообщения в чат (текст и/или файл). Для файла — multipart/form-data: text, file."""
        chat = self.get_object()
        if request.user not in chat.participants.all():
            return Response(
                {'detail': 'Вы не являетесь участником этого чата'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Поддержка JSON (только текст) и multipart (текст + файл)
        if request.content_type and 'multipart/form-data' in request.content_type:
            text = (request.POST.get('text') or '').strip()
            uploaded_file = request.FILES.get('file')
            message_type = request.POST.get('message_type', 'text')
            import json
            try:
                offer_data = json.loads(request.POST.get('offer_data', '{}')) if request.POST.get('offer_data') else None
            except json.JSONDecodeError:
                offer_data = None
        else:
            text = (request.data.get('text') or '').strip()
            uploaded_file = None
            message_type = request.data.get('message_type', 'text')
            offer_data = request.data.get('offer_data')

        if not text and not uploaded_file and not (message_type == 'offer' and offer_data):
            return Response(
                {'detail': 'Укажите текст сообщения, прикрепите файл или создайте предложение.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if message_type == 'offer':
            if getattr(request.user, 'role', None) != 'expert' and not getattr(request.user, 'is_staff', False):
                return Response(
                    {'detail': 'Только эксперт может отправлять индивидуальные предложения.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            first_sender_id = chat.messages.order_by('created_at').values_list('sender_id', flat=True).first()
            if first_sender_id is None:
                return Response(
                    {'detail': 'Создатель чата не может отправлять индивидуальное предложение.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            if int(first_sender_id) == int(request.user.id):
                return Response(
                    {'detail': 'Создатель чата не может отправлять индивидуальное предложение.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        file_name = ''
        if uploaded_file:
            allowed_extensions = getattr(settings, 'ALLOWED_EXTENSIONS', [
                'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt',
                'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg',
                'zip', 'rar', '7z', 'ppt', 'pptx', 'xls', 'xlsx', 'csv',
                'dwg', 'dxf', 'cdr',
            ])
            max_size = getattr(settings, 'MAX_UPLOAD_SIZE', 50 * 1024 * 1024)
            ext = (uploaded_file.name.split('.')[-1].lower() if '.' in uploaded_file.name else '') or ''
            if ext not in allowed_extensions:
                return Response(
                    {'detail': f'Недопустимый тип файла. Разрешены: {", ".join(allowed_extensions)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if uploaded_file.size > max_size:
                return Response(
                    {'detail': f'Размер файла не должен превышать {max_size // (1024*1024)} МБ.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            file_name = uploaded_file.name[:255] if len(uploaded_file.name) > 255 else uploaded_file.name

        try:
            message = Message(
                chat=chat,
                sender=request.user,
                text=text or '',
                file=uploaded_file or None,
                file_name=file_name,
                message_type=message_type,
                offer_data=offer_data
            )
            message.full_clean()
            message.save()
        except Exception as e:
            return Response(
                {'detail': getattr(e, 'message', None) or str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.notifications.services import NotificationService
        other_user = chat.participants.exclude(id=request.user.id).first()
        if other_user:
            notification_text = (message.text or f'Файл: {message.file_name}')[:100]
            if message_type == 'offer':
                notification_text = 'Вам поступило индивидуальное предложение'
            
            NotificationService.create_notification(
                recipient=other_user,
                type='new_comment',
                title=f'Новое сообщение от {request.user.get_full_name() or request.user.username}',
                message=notification_text,
                related_object_id=chat.id,
                related_object_type='chat'
            )

        return Response(MessageSerializer(message, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def accept_offer(self, request, pk=None):
        """Принять индивидуальное предложение"""
        chat = self.get_object()
        message_id = request.data.get('message_id')
        
        if not message_id:
            return Response({'detail': 'message_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)
            
        message = get_object_or_404(Message, id=message_id, chat=chat)
        
        if message.message_type != 'offer' or not message.offer_data:
            return Response({'detail': 'Это сообщение не является предложением'}, status=status.HTTP_400_BAD_REQUEST)
            
        if request.user == message.sender:
            return Response({'detail': 'Нельзя принять свое собственное предложение'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user not in chat.participants.all():
            return Response(
                {'detail': 'Вы не являетесь участником этого чата'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Проверка срока действия (2 дня)
        from django.utils import timezone
        import datetime
        if timezone.now() > message.created_at + datetime.timedelta(days=2):
            return Response({'detail': 'Срок действия предложения истек'}, status=status.HTTP_400_BAD_REQUEST)
            
        offer_data = message.offer_data
        if offer_data.get('status') == 'accepted':
             return Response({'detail': 'Предложение уже принято'}, status=status.HTTP_400_BAD_REQUEST)

        # Создаем заказ
        try:
            # Парсим дедлайн. Предполагаем, что фронт шлет ISO строку или что-то понятное.
            deadline_str = offer_data.get('deadline')
            deadline = None
            if deadline_str:
                # Если приходит timestamp (число)
                if isinstance(deadline_str, (int, float)):
                    deadline = timezone.datetime.fromtimestamp(deadline_str / 1000.0, tz=timezone.utc)
                else:
                    # Попытка распарсить строку
                    try:
                        deadline = timezone.datetime.fromisoformat(deadline_str.replace('Z', '+00:00'))
                    except ValueError:
                        pass
            
            if not deadline:
                 # Дефолт - через 3 дня, если не удалось распарсить (или вернуть ошибку)
                 deadline = timezone.now() + datetime.timedelta(days=3)

            subject_id = offer_data.get('subject_id')
            work_type_id = offer_data.get('work_type_id')

            client_user = chat.client or request.user
            expert_user = chat.expert or message.sender

            if chat.client_id and request.user.id != chat.client_id:
                return Response({'detail': 'Только заказчик может принять предложение'}, status=status.HTTP_403_FORBIDDEN)

            if not chat.client_id:
                chat.client = client_user
            if not chat.expert_id:
                chat.expert = expert_user
            if not chat.client_id or not chat.expert_id:
                chat.save(update_fields=['client', 'expert'])

            order = Order.objects.create(
                client=client_user,
                expert=expert_user,
                subject_id=subject_id if subject_id else None,
                work_type_id=work_type_id if work_type_id else None,
                custom_subject=offer_data.get('subject') if not subject_id else None,
                custom_work_type=offer_data.get('work_type') if not work_type_id else None,
                title=offer_data.get('title') or None,
                description=offer_data.get('description'),
                budget=offer_data.get('cost', 0),
                deadline=deadline,
                status='in_progress'
            )
            
            # Обновляем статус предложения
            offer_data['status'] = 'accepted'
            offer_data['order_id'] = order.id
            message.offer_data = offer_data
            message.save()
            
            if chat.order_id != order.id:
                chat.order = order
                chat.save(update_fields=['order'])
                
            return Response({'status': 'success', 'order_id': order.id})
            
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def reject_offer(self, request, pk=None):
        """Отклонить индивидуальное предложение"""
        chat = self.get_object()
        message_id = request.data.get('message_id')
        
        if not message_id:
            return Response({'detail': 'message_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)
            
        message = get_object_or_404(Message, id=message_id, chat=chat)
        
        if message.message_type != 'offer':
            return Response({'detail': 'Это сообщение не является предложением'}, status=status.HTTP_400_BAD_REQUEST)
            
        offer_data = message.offer_data or {}
        offer_data['status'] = 'rejected'
        message.offer_data = offer_data
        message.save()
        
        return Response({'status': 'success'})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Отметить все сообщения в чате как прочитанные"""
        chat = self.get_object()
        if request.user not in chat.participants.all():
            return Response(
                {'detail': 'Вы не являетесь участником этого чата'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Отмечаем как прочитанные все сообщения, которые не от текущего пользователя
        chat.messages.exclude(sender=request.user).update(is_read=True)
        
        return Response({'status': 'success'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Получить общее количество непрочитанных сообщений"""
        user = request.user
        count = Message.objects.filter(
            chat__participants=user
        ).exclude(
            sender=user
        ).filter(
            is_read=False
        ).count()
        
        return Response({'unread_count': count})

    @action(detail=False, methods=['post'])
    def get_or_create_by_order(self, request):
        """Получить или создать чат по ID заказа"""
        order_id = request.data.get('order_id')
        if not order_id:
            return Response(
                {'detail': 'order_id обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response(
                {'detail': 'Заказ не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Этот endpoint поддерживает только чат между клиентом и назначенным экспертом.
        # Для чатов по откликам используйте get_or_create_by_order_and_user.
        if not order.expert_id:
            return Response(
                {'detail': 'У заказа еще нет назначенного эксперта. Используйте get_or_create_by_order_and_user.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Проверяем, что пользователь является участником заказа
        if request.user not in [order.client, order.expert]:
            return Response(
                {'detail': 'Вы не являетесь участником этого заказа'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Получаем или создаем чат
        chat, created = Chat.objects.get_or_create(
            order=order,
            client=order.client,
            expert=order.expert
        )
        if created:
            chat.participants.add(order.client, order.expert)
        
        serializer = ChatDetailSerializer(chat, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def get_or_create_by_order_and_user(self, request):
        """Получить или создать чат по ID заказа и ID пользователя (для переписки по отклику)."""
        from apps.users.models import User

        order_id = request.data.get('order_id')
        user_id = request.data.get('user_id')
        if not order_id or not user_id:
            return Response(
                {'detail': 'order_id и user_id обязательны'},
                status=status.HTTP_400_BAD_REQUEST
            )

        order = get_object_or_404(Order, id=order_id)
        other_user = get_object_or_404(User, id=user_id)

        # Инициатором переписки по отклику может быть только заказчик
        if request.user.id != order.client_id and not request.user.is_staff:
            return Response(
                {'detail': 'Только заказчик может инициировать чат по отклику'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Нельзя создать чат с самим собой
        if other_user.id == request.user.id:
            return Response(
                {'detail': 'Нельзя создать чат с самим собой'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Чат по заказу всегда между клиентом заказа и конкретным экспертом
        client = order.client
        expert = other_user

        chat, created = Chat.objects.get_or_create(
            order=order,
            client=client,
            expert=expert
        )
        if created:
            chat.participants.add(client, expert)

        serializer = ChatDetailSerializer(chat, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def get_or_create_by_user(self, request):
        """Получить или создать чат с конкретным пользователем"""
        from apps.users.models import User
        
        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'detail': 'user_id обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            other_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Пользователь не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Нельзя создать чат с самим собой
        if other_user.id == request.user.id:
            return Response(
                {'detail': 'Нельзя создать чат с самим собой'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Ищем существующий чат между этими двумя пользователями (без привязки к заказу)
        chat = Chat.objects.filter(
            participants=request.user,
            order__isnull=True
        ).filter(
            participants=other_user
        ).first()
        
        # Если чат не найден, создаем новый
        if not chat:
            chat = Chat.objects.create(order=None, client=request.user, expert=other_user)
            chat.participants.add(request.user, other_user)
        else:
            updated_fields = []
            if not chat.client_id:
                chat.client = request.user
                updated_fields.append('client')
            if not chat.expert_id:
                chat.expert = other_user
                updated_fields.append('expert')
            if updated_fields:
                chat.save(update_fields=updated_fields)
        
        serializer = ChatDetailSerializer(chat, context={'request': request})
        return Response(serializer.data)
