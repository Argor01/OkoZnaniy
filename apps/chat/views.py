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

    def destroy(self, request, *args, **kwargs):
        chat = self.get_object()
        from django.utils import timezone
        import datetime

        now = timezone.now()
        offer_messages = chat.messages.filter(message_type='offer').only('created_at', 'offer_data')
        for msg in offer_messages:
            data = msg.offer_data or {}
            offer_status = data.get('status', 'new')
            if offer_status in ['accepted', 'rejected']:
                continue
            if msg.created_at and now <= msg.created_at + datetime.timedelta(days=2):
                return Response(
                    {'detail': 'Нельзя удалить чат: есть активные индивидуальные предложения.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        order_ids = set()
        if getattr(chat, 'order_id', None):
            order_ids.add(chat.order_id)
        for msg in offer_messages:
            data = msg.offer_data or {}
            if data.get('status') != 'accepted':
                continue
            raw_id = data.get('order_id')
            try:
                order_id = int(raw_id)
            except (TypeError, ValueError):
                order_id = None
            if order_id:
                order_ids.add(order_id)

        if order_ids:
            closed_statuses = {'completed', 'cancelled', 'canceled', 'done'}
            active_exists = Order.objects.filter(id__in=order_ids).exclude(status__in=closed_statuses).exists()
            if active_exists:
                return Response(
                    {'detail': 'Нельзя удалить чат: есть заказ в работе.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        self.perform_destroy(chat)
        return Response(status=status.HTTP_204_NO_CONTENT)

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

        if not text and not uploaded_file and not (message_type in ['offer', 'work_offer'] and offer_data):
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

            if getattr(chat, 'expert_id', None) and int(chat.expert_id) != int(request.user.id) and not getattr(request.user, 'is_staff', False):
                return Response(
                    {'detail': 'Только эксперт этого чата может отправлять индивидуальные предложения.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        if message_type == 'work_offer':
            if getattr(request.user, 'role', None) != 'expert' and not getattr(request.user, 'is_staff', False):
                return Response(
                    {'detail': 'Только эксперт может отправлять предложение готовой работы.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            if not getattr(chat, 'context_title', None):
                return Response(
                    {'detail': 'Предложение готовой работы доступно только в чате по работе.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if not isinstance(offer_data, dict):
                return Response(
                    {'detail': 'offer_data должен быть объектом.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            title = str(offer_data.get('title') or chat.context_title or '').strip()[:255]
            offer_data['title'] = title or chat.context_title or ''
            offer_data.setdefault('status', 'new')
            offer_data.setdefault('delivery_status', 'pending')

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
            elif message_type == 'work_offer':
                notification_text = 'Вам поступило предложение готовой работы'
            
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
    def accept_work_offer(self, request, pk=None):
        chat = self.get_object()
        message_id = request.data.get('message_id')
        if not message_id:
            return Response({'detail': 'message_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)

        message = get_object_or_404(Message, id=message_id, chat=chat)
        if message.message_type != 'work_offer' or not message.offer_data:
            return Response({'detail': 'Это сообщение не является предложением готовой работы'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user not in chat.participants.all():
            return Response({'detail': 'Вы не являетесь участником этого чата'}, status=status.HTTP_403_FORBIDDEN)

        if request.user == message.sender:
            return Response({'detail': 'Нельзя принять свое собственное предложение'}, status=status.HTTP_400_BAD_REQUEST)

        if getattr(request.user, 'role', None) == 'expert' and not getattr(request.user, 'is_staff', False):
            return Response({'detail': 'Только покупатель может принять предложение'}, status=status.HTTP_403_FORBIDDEN)

        offer_data = message.offer_data or {}
        if offer_data.get('status') != 'new':
            return Response({'detail': 'Предложение уже обработано'}, status=status.HTTP_400_BAD_REQUEST)

        from django.utils import timezone
        offer_data['status'] = 'accepted'
        offer_data['delivery_status'] = 'awaiting_upload'
        offer_data['accepted_at'] = timezone.now().isoformat()
        message.offer_data = offer_data
        message.save(update_fields=['offer_data'])
        return Response({'status': 'success'})

    @action(detail=True, methods=['post'])
    def reject_work_offer(self, request, pk=None):
        chat = self.get_object()
        message_id = request.data.get('message_id')
        if not message_id:
            return Response({'detail': 'message_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)

        message = get_object_or_404(Message, id=message_id, chat=chat)
        if message.message_type != 'work_offer' or not message.offer_data:
            return Response({'detail': 'Это сообщение не является предложением готовой работы'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user not in chat.participants.all():
            return Response({'detail': 'Вы не являетесь участником этого чата'}, status=status.HTTP_403_FORBIDDEN)

        if request.user == message.sender:
            return Response({'detail': 'Нельзя отклонить свое собственное предложение'}, status=status.HTTP_400_BAD_REQUEST)

        if getattr(request.user, 'role', None) == 'expert' and not getattr(request.user, 'is_staff', False):
            return Response({'detail': 'Только покупатель может отклонить предложение'}, status=status.HTTP_403_FORBIDDEN)

        offer_data = message.offer_data or {}
        if offer_data.get('status') != 'new':
            return Response({'detail': 'Предложение уже обработано'}, status=status.HTTP_400_BAD_REQUEST)

        from django.utils import timezone
        offer_data['status'] = 'rejected'
        offer_data['rejected_at'] = timezone.now().isoformat()
        message.offer_data = offer_data
        message.save(update_fields=['offer_data'])
        return Response({'status': 'success'})

    @action(detail=True, methods=['post'])
    def deliver_work_offer(self, request, pk=None):
        chat = self.get_object()
        if request.user not in chat.participants.all():
            return Response({'detail': 'Вы не являетесь участником этого чата'}, status=status.HTTP_403_FORBIDDEN)

        if request.content_type and 'multipart/form-data' in request.content_type:
            message_id = request.POST.get('message_id')
            uploaded_file = request.FILES.get('file')
            text = (request.POST.get('text') or '').strip()
        else:
            message_id = request.data.get('message_id')
            uploaded_file = None
            text = (request.data.get('text') or '').strip()

        if not message_id:
            return Response({'detail': 'message_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)
        if not uploaded_file:
            return Response({'detail': 'file обязателен'}, status=status.HTTP_400_BAD_REQUEST)

        offer_message = get_object_or_404(Message, id=message_id, chat=chat)
        if offer_message.message_type != 'work_offer' or not offer_message.offer_data:
            return Response({'detail': 'Это сообщение не является предложением готовой работы'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user != offer_message.sender and not getattr(request.user, 'is_staff', False):
            return Response({'detail': 'Только автор предложения может отправить работу'}, status=status.HTTP_403_FORBIDDEN)

        offer_data = offer_message.offer_data or {}
        if offer_data.get('status') != 'accepted' or offer_data.get('delivery_status') != 'awaiting_upload':
            return Response({'detail': 'Сейчас нельзя отправить работу по этому предложению'}, status=status.HTTP_400_BAD_REQUEST)

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
        delivery_text = text or 'Работа отправлена'

        try:
            delivery_message = Message(
                chat=chat,
                sender=request.user,
                text=delivery_text,
                file=uploaded_file,
                file_name=file_name,
                message_type='work_delivery',
                offer_data={'work_offer_message_id': int(offer_message.id)}
            )
            delivery_message.full_clean()
            delivery_message.save()
        except Exception as e:
            return Response(
                {'detail': getattr(e, 'message', None) or str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.utils import timezone
        offer_data['delivery_status'] = 'delivered'
        offer_data['delivered_message_id'] = delivery_message.id
        offer_data['delivered_at'] = timezone.now().isoformat()
        offer_message.offer_data = offer_data
        offer_message.save(update_fields=['offer_data'])

        from apps.notifications.services import NotificationService
        other_user = chat.participants.exclude(id=request.user.id).first()
        if other_user:
            NotificationService.create_notification(
                recipient=other_user,
                type='new_comment',
                title=f'Новое сообщение от {request.user.get_full_name() or request.user.username}',
                message='Эксперт отправил работу по предложению',
                related_object_id=chat.id,
                related_object_type='chat'
            )

        return Response(MessageSerializer(delivery_message, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def accept_work_delivery(self, request, pk=None):
        chat = self.get_object()
        message_id = request.data.get('message_id')
        if not message_id:
            return Response({'detail': 'message_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)

        offer_message = get_object_or_404(Message, id=message_id, chat=chat)
        if offer_message.message_type != 'work_offer' or not offer_message.offer_data:
            return Response({'detail': 'Это сообщение не является предложением готовой работы'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user not in chat.participants.all():
            return Response({'detail': 'Вы не являетесь участником этого чата'}, status=status.HTTP_403_FORBIDDEN)

        if request.user == offer_message.sender:
            return Response({'detail': 'Нельзя принять свою собственную работу'}, status=status.HTTP_400_BAD_REQUEST)

        if getattr(request.user, 'role', None) == 'expert' and not getattr(request.user, 'is_staff', False):
            return Response({'detail': 'Только покупатель может принять работу'}, status=status.HTTP_403_FORBIDDEN)

        rating = request.data.get('rating', None)
        if rating is not None and rating != '':
            try:
                rating = int(rating)
            except (TypeError, ValueError):
                return Response({'detail': 'rating должен быть числом'}, status=status.HTTP_400_BAD_REQUEST)
            if rating < 1 or rating > 5:
                return Response({'detail': 'rating должен быть в диапазоне 1..5'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            rating = None

        offer_data = offer_message.offer_data or {}
        if offer_data.get('status') != 'accepted' or offer_data.get('delivery_status') != 'delivered':
            return Response({'detail': 'Сейчас нельзя принять работу по этому предложению'}, status=status.HTTP_400_BAD_REQUEST)

        from django.utils import timezone
        offer_data['delivery_status'] = 'accepted'
        offer_data['delivery_accepted_at'] = timezone.now().isoformat()
        if rating is not None:
            offer_data['rating'] = rating
        offer_message.offer_data = offer_data
        offer_message.save(update_fields=['offer_data'])

        try:
            work_id = offer_data.get('work_id')
            if not work_id and chat.context_title:
                import re
                m = re.search(r'work:(\d+)', str(chat.context_title))
                if m:
                    work_id = int(m.group(1))

            if work_id:
                from apps.shop.models import Purchase, ReadyWork

                work = ReadyWork.objects.filter(id=work_id).first()
                if work:
                    purchase, _created = Purchase.objects.get_or_create(
                        work=work,
                        buyer=request.user,
                        defaults={'price_paid': work.price},
                    )

                    delivered_message_id = offer_data.get('delivered_message_id')
                    delivered_message = None
                    if delivered_message_id:
                        delivered_message = Message.objects.filter(id=delivered_message_id, chat=chat).first()
                    if delivered_message and delivered_message.file:
                        file_name = delivered_message.file_name or ''
                        if not file_name and getattr(delivered_message.file, 'name', None):
                            file_name = str(delivered_message.file.name).split('/')[-1]
                        ext = ''
                        if file_name and '.' in file_name:
                            ext = file_name.split('.')[-1].lower()

                        purchase.delivered_file = delivered_message.file
                        purchase.delivered_file_name = file_name or purchase.delivered_file_name
                        purchase.delivered_file_type = ext or purchase.delivered_file_type
                        try:
                            purchase.delivered_file_size = int(delivered_message.file.size or 0)
                        except Exception:
                            purchase.delivered_file_size = 0

                    if rating is not None:
                        purchase.rating = rating
                        purchase.rated_at = timezone.now()

                    update_fields = [
                        'delivered_file',
                        'delivered_file_name',
                        'delivered_file_type',
                        'delivered_file_size',
                        'rating',
                        'rated_at',
                    ]
                    purchase.save(update_fields=update_fields)
        except Exception:
            pass

        return Response({'status': 'success'})

    @action(detail=True, methods=['post'])
    def reject_work_delivery(self, request, pk=None):
        chat = self.get_object()
        message_id = request.data.get('message_id')
        if not message_id:
            return Response({'detail': 'message_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)

        offer_message = get_object_or_404(Message, id=message_id, chat=chat)
        if offer_message.message_type != 'work_offer' or not offer_message.offer_data:
            return Response({'detail': 'Это сообщение не является предложением готовой работы'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user not in chat.participants.all():
            return Response({'detail': 'Вы не являетесь участником этого чата'}, status=status.HTTP_403_FORBIDDEN)

        if request.user == offer_message.sender:
            return Response({'detail': 'Нельзя отклонить свою собственную работу'}, status=status.HTTP_400_BAD_REQUEST)

        if getattr(request.user, 'role', None) == 'expert' and not getattr(request.user, 'is_staff', False):
            return Response({'detail': 'Только покупатель может отклонить работу'}, status=status.HTTP_403_FORBIDDEN)

        offer_data = offer_message.offer_data or {}
        if offer_data.get('status') != 'accepted' or offer_data.get('delivery_status') != 'delivered':
            return Response({'detail': 'Сейчас нельзя отклонить работу по этому предложению'}, status=status.HTTP_400_BAD_REQUEST)

        from django.utils import timezone
        offer_data['delivery_status'] = 'rejected'
        offer_data['delivery_rejected_at'] = timezone.now().isoformat()
        offer_message.offer_data = offer_data
        offer_message.save(update_fields=['offer_data'])
        return Response({'status': 'success'})

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
        """Получить или создать чат по ID заказа и ID пользователя (контекст заказа из ленты)."""
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

        if getattr(other_user, 'role', None) != 'expert' and not getattr(other_user, 'is_staff', False):
            return Response(
                {'detail': 'Чат можно создать только с экспертом'},
                status=status.HTTP_400_BAD_REQUEST
            )

        client = order.client
        expert = other_user

        context_title = f"Заказ из ленты #{order.id}"
        chat = Chat.objects.filter(
            order__isnull=True,
            client=client,
            expert=expert,
            context_title=context_title
        ).first()

        created = False
        if not chat:
            created = True
            chat = Chat.objects.create(order=None, client=client, expert=expert, context_title=context_title)
            chat.participants.add(client, expert)

        serializer = ChatDetailSerializer(chat, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def get_or_create_by_user(self, request):
        """Получить или создать чат с конкретным пользователем"""
        from apps.users.models import User
        
        user_id = request.data.get('user_id')
        context_title = request.data.get('context_title')
        if context_title is not None:
            context_title = str(context_title).strip()[:255] or None
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

        request_role = getattr(request.user, 'role', None)
        other_role = getattr(other_user, 'role', None)
        if request_role == 'expert' and other_role != 'expert':
            resolved_client = other_user
            resolved_expert = request.user
        elif other_role == 'expert' and request_role != 'expert':
            resolved_client = request.user
            resolved_expert = other_user
        else:
            resolved_client = request.user
            resolved_expert = other_user
        
        # Если чат не найден, создаем новый
        if not chat:
            chat = Chat.objects.create(order=None, client=resolved_client, expert=resolved_expert, context_title=context_title)
            chat.participants.add(request.user, other_user)
        else:
            updated_fields = []
            if (not chat.client_id) or (resolved_client and chat.client_id != resolved_client.id):
                chat.client = resolved_client
                updated_fields.append('client')
            if (not chat.expert_id) or (resolved_expert and chat.expert_id != resolved_expert.id):
                chat.expert = resolved_expert
                updated_fields.append('expert')
            if context_title and chat.order_id is None and (not chat.context_title or chat.context_title != context_title):
                chat.context_title = context_title
                updated_fields.append('context_title')
            if updated_fields:
                chat.save(update_fields=updated_fields)
        
        serializer = ChatDetailSerializer(chat, context={'request': request})
        return Response(serializer.data)
