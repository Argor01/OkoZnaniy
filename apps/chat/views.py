from django.conf import settings
from django.shortcuts import render
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q, Max, Count, Prefetch
from django.db import transaction, IntegrityError
from .models import Chat, Message, SupportChat, SupportMessage, ChatPin
from .serializers import ChatListSerializer, ChatDetailSerializer, MessageSerializer, SupportChatSerializer, SupportMessageSerializer
from .services import ensure_order_chat_started, get_or_create_direct_chat, get_or_create_order_chat
from .websocket_utils import notify_chat_message, notify_typing
from apps.orders.models import Order, OrderFile
from apps.notifications.models import NotificationType
from apps.notifications.services import NotificationService
from apps.core.safe_notify import safe_call
from decimal import Decimal, InvalidOperation

class ChatViewSet(viewsets.ModelViewSet):
    """
    ViewSet РґР»СЏ СѓРїСЂР°РІР»РµРЅРёСЏ РѕР±С‹С‡РЅС‹РјРё С‡Р°С‚Р°РјРё РјРµР¶РґСѓ РєР»РёРµРЅС‚Р°РјРё Рё СЌРєСЃРїРµСЂС‚Р°РјРё.
    
    Р’РђР–РќРћ: Р§Р°С‚С‹ СЃ С‚РµС…РЅРёС‡РµСЃРєРѕР№ РїРѕРґРґРµСЂР¶РєРѕР№ РќР• РѕС‚РѕР±СЂР°Р¶Р°СЋС‚СЃСЏ РІ СЌС‚РѕРј СЃРїРёСЃРєРµ.
    РћРЅРё СѓРїСЂР°РІР»СЏСЋС‚СЃСЏ С‡РµСЂРµР· РѕС‚РґРµР»СЊРЅС‹Р№ SupportChatViewSet Рё РѕС‚РѕР±СЂР°Р¶Р°СЋС‚СЃСЏ
    С‚РѕР»СЊРєРѕ РІ СЂР°Р·РґРµР»Рµ "Р§Р°С‚С‹ РїРѕРґРґРµСЂР¶РєРё" РІ Р°РґРјРёРЅ-РїР°РЅРµР»Рё.
    
    Р¤РёР»СЊС‚СЂР°С†РёСЏ С‡Р°С‚РѕРІ РїРѕРґРґРµСЂР¶РєРё РїСЂРѕРёСЃС…РѕРґРёС‚ РїРѕ:
    1. SUPPORT_USER_ID - ID РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ С‚РµС…РЅРёС‡РµСЃРєРѕР№ РїРѕРґРґРµСЂР¶РєРё (РёР· РЅР°СЃС‚СЂРѕРµРє)
    2. context_title - С‡Р°С‚С‹ СЃ РјР°СЂРєРµСЂР°РјРё "РїРѕРґРґРµСЂР¶РєР°", "support", "С‚РµС…РїРѕРґРґРµСЂР¶РєР°"
    """
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
                    {'detail': 'РќРµР»СЊР·СЏ СѓРґР°Р»РёС‚СЊ С‡Р°С‚: РµСЃС‚СЊ Р°РєС‚РёРІРЅС‹Рµ РёРЅРґРёРІРёРґСѓР°Р»СЊРЅС‹Рµ РїСЂРµРґР»РѕР¶РµРЅРёСЏ.'},
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
                    {'detail': 'РќРµР»СЊР·СЏ СѓРґР°Р»РёС‚СЊ С‡Р°С‚: РµСЃС‚СЊ Р·Р°РєР°Р· РІ СЂР°Р±РѕС‚Рµ.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        chat.hidden_for_users.add(request.user)
        ChatPin.objects.filter(chat=chat, user=request.user).delete()

        participants_count = chat.participants.count()
        hidden_count = chat.hidden_for_users.count()
        if participants_count > 0 and hidden_count >= participants_count:
            self.perform_destroy(chat)

        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        user = self.request.user
        from django.db.models import Exists, OuterRef
        
            # РџРѕРґР·Р°РїСЂРѕСЃ РґР»СЏ РїСЂРѕРІРµСЂРєРё Р·Р°РєСЂРµРїР»С‘РЅРЅС‹С… С‡Р°С‚РѕРІ
        pinned_subquery = ChatPin.objects.filter(
                user=OuterRef('participants'),
                chat=OuterRef('pk')
            )
        
            # РСЃРєР»СЋС‡Р°РµРј С‡Р°С‚С‹ СЃ С‚РµС…РЅРёС‡РµСЃРєРѕР№ РїРѕРґРґРµСЂР¶РєРѕР№ РёР· СЃРїРёСЃРєР° РѕР±С‹С‡РЅС‹С… С‡Р°С‚РѕРІ
            # Р§Р°С‚С‹ РїРѕРґРґРµСЂР¶РєРё РѕС‚РѕР±СЂР°Р¶Р°СЋС‚СЃСЏ С‚РѕР»СЊРєРѕ РІ СЂР°Р·РґРµР»Рµ "Р§Р°С‚С‹ РїРѕРґРґРµСЂР¶РєРё" РІ Р°РґРјРёРЅ-РїР°РЅРµР»Рё
        queryset = Chat.objects.filter(
                participants=user
            ).prefetch_related(
                'participants',
                'messages__sender',
                'pins__user'
            ).annotate(
                last_message_time=Max('messages__created_at'),
                is_pinned=Exists(pinned_subquery)
            ).order_by('-is_pinned', '-last_message_time')
        queryset = queryset.exclude(hidden_for_users=user)
        
            # РџРѕР»СѓС‡Р°РµРј ID РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РїРѕРґРґРµСЂР¶РєРё РёР· РЅР°СЃС‚СЂРѕРµРє РёР»Рё РїРµСЂРµРјРµРЅРЅРѕР№ РѕРєСЂСѓР¶РµРЅРёСЏ
        from django.conf import settings
        support_user_id = getattr(settings, 'SUPPORT_USER_ID', None)
        
            # Р•СЃР»Рё ID РїРѕРґРґРµСЂР¶РєРё Р·Р°РґР°РЅ, РёСЃРєР»СЋС‡Р°РµРј С‡Р°С‚С‹ СЃ СЌС‚РёРј РїРѕР»СЊР·РѕРІР°С‚РµР»РµРј
        if support_user_id:
                queryset = queryset.exclude(participants__id=support_user_id)
        
            # РўР°РєР¶Рµ РёСЃРєР»СЋС‡Р°РµРј С‡Р°С‚С‹, РіРґРµ context_title СЃРѕРґРµСЂР¶РёС‚ РјР°СЂРєРµСЂС‹ РїРѕРґРґРµСЂР¶РєРё
        queryset = queryset.exclude(
                Q(context_title__icontains='РїРѕРґРґРµСЂР¶РєР°') |
                Q(context_title__icontains='support') |
                Q(context_title__icontains='С‚РµС…РїРѕРґРґРµСЂР¶РєР°')
        )
        
        return queryset

    def perform_create(self, serializer):
        chat = serializer.save()
        order = chat.order
        if order and order.client:
            chat.participants.add(order.client)
        if order and order.expert:
            chat.participants.add(order.expert)

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """РћС‚РїСЂР°РІРєР° СЃРѕРѕР±С‰РµРЅРёСЏ РІ С‡Р°С‚ (С‚РµРєСЃС‚ Рё/РёР»Рё С„Р°Р№Р»). Р”Р»СЏ С„Р°Р№Р»Р° вЂ” multipart/form-data: text, file."""
        chat = self.get_object()

        if hasattr(request.user, 'role') and request.user.role not in ['admin', 'director']:
            if hasattr(request.user, 'unban_for_contacts_if_expired'):
                request.user.unban_for_contacts_if_expired()
            if getattr(request.user, 'is_banned_for_contacts', False):
                return Response(
                    {
                        'detail': 'РћС‚РїСЂР°РІРєР° СЃРѕРѕР±С‰РµРЅРёР№ РІСЂРµРјРµРЅРЅРѕ РЅРµРґРѕСЃС‚СѓРїРЅР°. РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅР°С…РѕРґРёС‚СЃСЏ РЅР° РїСЂРѕРІРµСЂРєРµ.',
                        'frozen': True,
                        'frozen_reason': request.user.contact_ban_reason or 'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅР°С…РѕРґРёС‚СЃСЏ РЅР° РїСЂРѕРІРµСЂРєРµ'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            other_user = chat.participants.exclude(id=request.user.id).first()
            if other_user and hasattr(other_user, 'unban_for_contacts_if_expired'):
                other_user.unban_for_contacts_if_expired()
            if other_user and getattr(other_user, 'is_banned_for_contacts', False):
                return Response(
                    {
                        'detail': 'РћС‚РїСЂР°РІРєР° СЃРѕРѕР±С‰РµРЅРёР№ РІСЂРµРјРµРЅРЅРѕ РЅРµРґРѕСЃС‚СѓРїРЅР°. РЎРѕР±РµСЃРµРґРЅРёРє РЅР°С…РѕРґРёС‚СЃСЏ РЅР° РїСЂРѕРІРµСЂРєРµ.',
                        'frozen': True,
                        'frozen_reason': other_user.contact_ban_reason or 'РЎРѕР±РµСЃРµРґРЅРёРє РЅР°С…РѕРґРёС‚СЃСЏ РЅР° РїСЂРѕРІРµСЂРєРµ'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # РџСЂРѕРІРµСЂСЏРµРј, РЅРµ Р·Р°РјРѕСЂРѕР¶РµРЅ Р»Рё С‡Р°С‚
        if chat.is_frozen:
            # РђРґРјРёРЅС‹ РјРѕРіСѓС‚ РїРёСЃР°С‚СЊ РІ Р·Р°РјРѕСЂРѕР¶РµРЅРЅС‹Рµ С‡Р°С‚С‹
            if not (hasattr(request.user, 'role') and request.user.role in ['admin', 'director']):
                return Response(
                    {
                        'detail': 'Р§Р°С‚ Р·Р°РјРѕСЂРѕР¶РµРЅ РёР·-Р·Р° РЅР°СЂСѓС€РµРЅРёСЏ РїСЂР°РІРёР». РћС‚РїСЂР°РІРєР° СЃРѕРѕР±С‰РµРЅРёР№ РІСЂРµРјРµРЅРЅРѕ РЅРµРґРѕСЃС‚СѓРїРЅР°.',
                        'frozen': True,
                        'frozen_reason': chat.frozen_reason
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if request.user not in chat.participants.all():
            return Response(
                {'detail': 'Р’С‹ РЅРµ СЏРІР»СЏРµС‚РµСЃСЊ СѓС‡Р°СЃС‚РЅРёРєРѕРј СЌС‚РѕРіРѕ С‡Р°С‚Р°'},
                status=status.HTTP_403_FORBIDDEN
            )

        # РџРѕРґРґРµСЂР¶РєР° JSON (С‚РѕР»СЊРєРѕ С‚РµРєСЃС‚) Рё multipart (С‚РµРєСЃС‚ + С„Р°Р№Р»)
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
                {'detail': 'РЈРєР°Р¶РёС‚Рµ С‚РµРєСЃС‚ СЃРѕРѕР±С‰РµРЅРёСЏ, РїСЂРёРєСЂРµРїРёС‚Рµ С„Р°Р№Р» РёР»Рё СЃРѕР·РґР°Р№С‚Рµ РїСЂРµРґР»РѕР¶РµРЅРёРµ.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if message_type == 'offer':
            if getattr(request.user, 'role', None) != 'expert' and not getattr(request.user, 'is_staff', False):
                return Response(
                    {'detail': 'РўРѕР»СЊРєРѕ СЌРєСЃРїРµСЂС‚ РјРѕР¶РµС‚ РѕС‚РїСЂР°РІР»СЏС‚СЊ РёРЅРґРёРІРёРґСѓР°Р»СЊРЅС‹Рµ РїСЂРµРґР»РѕР¶РµРЅРёСЏ.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            if getattr(chat, 'expert_id', None) and int(chat.expert_id) != int(request.user.id) and not getattr(request.user, 'is_staff', False):
                return Response(
                    {'detail': 'РўРѕР»СЊРєРѕ СЌРєСЃРїРµСЂС‚ СЌС‚РѕРіРѕ С‡Р°С‚Р° РјРѕР¶РµС‚ РѕС‚РїСЂР°РІР»СЏС‚СЊ РёРЅРґРёРІРёРґСѓР°Р»СЊРЅС‹Рµ РїСЂРµРґР»РѕР¶РµРЅРёСЏ.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        if message_type == 'work_offer':
            if getattr(request.user, 'role', None) != 'expert' and not getattr(request.user, 'is_staff', False):
                return Response(
                    {'detail': 'РўРѕР»СЊРєРѕ СЌРєСЃРїРµСЂС‚ РјРѕР¶РµС‚ РѕС‚РїСЂР°РІР»СЏС‚СЊ РїСЂРµРґР»РѕР¶РµРЅРёРµ РіРѕС‚РѕРІРѕР№ СЂР°Р±РѕС‚С‹.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            if not getattr(chat, 'context_title', None):
                return Response(
                    {'detail': 'РџСЂРµРґР»РѕР¶РµРЅРёРµ РіРѕС‚РѕРІРѕР№ СЂР°Р±РѕС‚С‹ РґРѕСЃС‚СѓРїРЅРѕ С‚РѕР»СЊРєРѕ РІ С‡Р°С‚Рµ РїРѕ СЂР°Р±РѕС‚Рµ.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if not isinstance(offer_data, dict):
                return Response(
                    {'detail': 'offer_data РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РѕР±СЉРµРєС‚РѕРј.'},
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
                    {'detail': f'РќРµРґРѕРїСѓСЃС‚РёРјС‹Р№ С‚РёРї С„Р°Р№Р»Р°. Р Р°Р·СЂРµС€РµРЅС‹: {", ".join(allowed_extensions)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if uploaded_file.size > max_size:
                return Response(
                    {'detail': f'Р Р°Р·РјРµСЂ С„Р°Р№Р»Р° РЅРµ РґРѕР»Р¶РµРЅ РїСЂРµРІС‹С€Р°С‚СЊ {max_size // (1024*1024)} РњР‘.'},
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

        if (
            uploaded_file
            and chat.order_id
            and chat.order
            and message_type != 'work_delivery'
            and getattr(chat.order, 'expert_id', None) == request.user.id
        ):
            marker = f'chat_message_id:{message.id}'
            already_attached = OrderFile.objects.filter(
                order_id=chat.order_id,
                description=marker
            ).exists()
            if not already_attached:
                try:
                    OrderFile.objects.create(
                        order=chat.order,
                        file=message.file,
                        file_type='solution',
                        uploaded_by=request.user,
                        description=marker
                    )
                except Exception:
                    pass

        # WebSocket СѓРІРµРґРѕРјР»РµРЅРёРµ Рѕ РЅРѕРІРѕРј СЃРѕРѕР±С‰РµРЅРёРё
        try:
            message_serializer = MessageSerializer(message, context={'request': request})
            notify_chat_message(chat.id, message_serializer.data)

            # РЈРІРµРґРѕРјР»СЏРµРј РІСЃРµС… СѓС‡Р°СЃС‚РЅРёРєРѕРІ С‡Р°С‚Р° С‡РµСЂРµР· РїРµСЂСЃРѕРЅР°Р»СЊРЅС‹Рµ СѓРІРµРґРѕРјР»РµРЅРёСЏ
            for participant in chat.participants.exclude(id=request.user.id):
                from .websocket_utils import notify_new_notification
                notify_new_notification(
                    participant.id,
                    {
                        'id': message.id,
                        'chat_id': chat.id,
                        'sender': request.user.username,
                        'text': (message.text or '')[:100],
                        'created_at': message.created_at.isoformat(),
                    }
                )
        except Exception:
            pass

        if message_type == 'offer':
            try:
                recipient = chat.client
                if not recipient:
                    recipient = (
                        chat.participants.exclude(id=request.user.id).filter(role='client').first()
                        or chat.participants.exclude(id=request.user.id).first()
                    )

                if recipient and recipient.id != request.user.id:
                    offer_payload = offer_data if isinstance(offer_data, dict) else {}
                    offer_title = (offer_payload.get('title') or '').strip()
                    offer_cost = offer_payload.get('cost')
                    cost_suffix = f" Сумма: {offer_cost} ₽." if offer_cost not in [None, ''] else ''
                    target_label = f"по заказу №{chat.order.id}" if getattr(chat, 'order', None) else "в чате"
                    safe_call(NotificationService.create_notification,
                        recipient=recipient,
                        type=NotificationType.NEW_BID,
                        title=f"Индивидуальное предложение{f': {offer_title}' if offer_title else ''}",
                        message=f"Эксперт {request.user.get_full_name() or request.user.username} отправил вам индивидуальное предложение {target_label}.{cost_suffix}",
                        related_object_id=chat.order_id if chat.order_id else chat.id,
                        related_object_type='order' if chat.order_id else 'chat',
                        data={
                            'chat_id': chat.id,
                            'message_id': message.id
                        })
            except Exception:
                pass

        return Response(MessageSerializer(message, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def accept_work_offer(self, request, pk=None):
        chat = self.get_object()
        message_id = request.data.get('message_id')
        if not message_id:
            return Response({'detail': 'message_id РѕР±СЏР·Р°С‚РµР»РµРЅ'}, status=status.HTTP_400_BAD_REQUEST)

        message = get_object_or_404(Message, id=message_id, chat=chat)
        if message.message_type != 'work_offer' or not message.offer_data:
            return Response({'detail': 'Р­С‚Рѕ СЃРѕРѕР±С‰РµРЅРёРµ РЅРµ СЏРІР»СЏРµС‚СЃСЏ РїСЂРµРґР»РѕР¶РµРЅРёРµРј РіРѕС‚РѕРІРѕР№ СЂР°Р±РѕС‚С‹'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user not in chat.participants.all():
            return Response({'detail': 'Р’С‹ РЅРµ СЏРІР»СЏРµС‚РµСЃСЊ СѓС‡Р°СЃС‚РЅРёРєРѕРј СЌС‚РѕРіРѕ С‡Р°С‚Р°'}, status=status.HTTP_403_FORBIDDEN)

        if request.user == message.sender:
            return Response({'detail': 'РќРµР»СЊР·СЏ РїСЂРёРЅСЏС‚СЊ СЃРІРѕРµ СЃРѕР±СЃС‚РІРµРЅРЅРѕРµ РїСЂРµРґР»РѕР¶РµРЅРёРµ'}, status=status.HTTP_400_BAD_REQUEST)

        offer_data = message.offer_data or {}
        if offer_data.get('status') != 'new':
            return Response({'detail': 'РџСЂРµРґР»РѕР¶РµРЅРёРµ СѓР¶Рµ РѕР±СЂР°Р±РѕС‚Р°РЅРѕ'}, status=status.HTTP_400_BAD_REQUEST)

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
            return Response({'detail': 'message_id РѕР±СЏР·Р°С‚РµР»РµРЅ'}, status=status.HTTP_400_BAD_REQUEST)

        message = get_object_or_404(Message, id=message_id, chat=chat)
        if message.message_type != 'work_offer' or not message.offer_data:
            return Response({'detail': 'Р­С‚Рѕ СЃРѕРѕР±С‰РµРЅРёРµ РЅРµ СЏРІР»СЏРµС‚СЃСЏ РїСЂРµРґР»РѕР¶РµРЅРёРµРј РіРѕС‚РѕРІРѕР№ СЂР°Р±РѕС‚С‹'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user not in chat.participants.all():
            return Response({'detail': 'Р’С‹ РЅРµ СЏРІР»СЏРµС‚РµСЃСЊ СѓС‡Р°СЃС‚РЅРёРєРѕРј СЌС‚РѕРіРѕ С‡Р°С‚Р°'}, status=status.HTTP_403_FORBIDDEN)

        if request.user == message.sender:
            return Response({'detail': 'РќРµР»СЊР·СЏ РѕС‚РєР»РѕРЅРёС‚СЊ СЃРІРѕРµ СЃРѕР±СЃС‚РІРµРЅРЅРѕРµ РїСЂРµРґР»РѕР¶РµРЅРёРµ'}, status=status.HTTP_400_BAD_REQUEST)

        offer_data = message.offer_data or {}
        if offer_data.get('status') != 'new':
            return Response({'detail': 'РџСЂРµРґР»РѕР¶РµРЅРёРµ СѓР¶Рµ РѕР±СЂР°Р±РѕС‚Р°РЅРѕ'}, status=status.HTTP_400_BAD_REQUEST)

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
            return Response({'detail': 'Р’С‹ РЅРµ СЏРІР»СЏРµС‚РµСЃСЊ СѓС‡Р°СЃС‚РЅРёРєРѕРј СЌС‚РѕРіРѕ С‡Р°С‚Р°'}, status=status.HTTP_403_FORBIDDEN)

        if request.content_type and 'multipart/form-data' in request.content_type:
            message_id = request.POST.get('message_id')
            uploaded_file = request.FILES.get('file')
            text = (request.POST.get('text') or '').strip()
        else:
            message_id = request.data.get('message_id')
            uploaded_file = None
            text = (request.data.get('text') or '').strip()

        if not message_id:
            return Response({'detail': 'message_id РѕР±СЏР·Р°С‚РµР»РµРЅ'}, status=status.HTTP_400_BAD_REQUEST)
        if not uploaded_file:
            return Response({'detail': 'file РѕР±СЏР·Р°С‚РµР»РµРЅ'}, status=status.HTTP_400_BAD_REQUEST)

        offer_message = get_object_or_404(Message, id=message_id, chat=chat)
        if offer_message.message_type != 'work_offer' or not offer_message.offer_data:
            return Response({'detail': 'Р­С‚Рѕ СЃРѕРѕР±С‰РµРЅРёРµ РЅРµ СЏРІР»СЏРµС‚СЃСЏ РїСЂРµРґР»РѕР¶РµРЅРёРµРј РіРѕС‚РѕРІРѕР№ СЂР°Р±РѕС‚С‹'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user != offer_message.sender and not getattr(request.user, 'is_staff', False):
            return Response({'detail': 'РўРѕР»СЊРєРѕ Р°РІС‚РѕСЂ РїСЂРµРґР»РѕР¶РµРЅРёСЏ РјРѕР¶РµС‚ РѕС‚РїСЂР°РІРёС‚СЊ СЂР°Р±РѕС‚Сѓ'}, status=status.HTTP_403_FORBIDDEN)

        offer_data = offer_message.offer_data or {}
        if offer_data.get('status') != 'accepted' or offer_data.get('delivery_status') != 'awaiting_upload':
            return Response({'detail': 'РЎРµР№С‡Р°СЃ РЅРµР»СЊР·СЏ РѕС‚РїСЂР°РІРёС‚СЊ СЂР°Р±РѕС‚Сѓ РїРѕ СЌС‚РѕРјСѓ РїСЂРµРґР»РѕР¶РµРЅРёСЋ'}, status=status.HTTP_400_BAD_REQUEST)

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
                {'detail': f'РќРµРґРѕРїСѓСЃС‚РёРјС‹Р№ С‚РёРї С„Р°Р№Р»Р°. Р Р°Р·СЂРµС€РµРЅС‹: {", ".join(allowed_extensions)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if uploaded_file.size > max_size:
            return Response(
                {'detail': f'Р Р°Р·РјРµСЂ С„Р°Р№Р»Р° РЅРµ РґРѕР»Р¶РµРЅ РїСЂРµРІС‹С€Р°С‚СЊ {max_size // (1024*1024)} РњР‘.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        file_name = uploaded_file.name[:255] if len(uploaded_file.name) > 255 else uploaded_file.name
        delivery_text = text or 'Р Р°Р±РѕС‚Р° РѕС‚РїСЂР°РІР»РµРЅР°'

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

        delivery_order = chat.order if chat.order_id and chat.order else None
        if not delivery_order:
            raw_order_id = offer_data.get('order_id') or offer_data.get('work_id')
            try:
                resolved_order_id = int(raw_order_id)
            except (TypeError, ValueError):
                resolved_order_id = None
            if resolved_order_id:
                delivery_order = Order.objects.filter(id=resolved_order_id).first()
                if delivery_order and chat.order_id != delivery_order.id:
                    chat.order = delivery_order
                    chat.save(update_fields=['order'])

        if delivery_order:
            marker = f'chat_delivery_message_id:{delivery_message.id}'
            already_attached = OrderFile.objects.filter(
                order_id=delivery_order.id,
                description=marker
            ).exists()
            if not already_attached:
                try:
                    OrderFile.objects.create(
                        order=delivery_order,
                        file=delivery_message.file,
                        file_type='solution',
                        uploaded_by=request.user,
                        description=marker
                    )
                except Exception:
                    pass

        return Response(MessageSerializer(delivery_message, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def accept_work_delivery(self, request, pk=None):
        chat = self.get_object()
        message_id = request.data.get('message_id')
        if not message_id:
            return Response({'detail': 'message_id РѕР±СЏР·Р°С‚РµР»РµРЅ'}, status=status.HTTP_400_BAD_REQUEST)

        offer_message = get_object_or_404(Message, id=message_id, chat=chat)
        if offer_message.message_type != 'work_offer' or not offer_message.offer_data:
            return Response({'detail': 'Р­С‚Рѕ СЃРѕРѕР±С‰РµРЅРёРµ РЅРµ СЏРІР»СЏРµС‚СЃСЏ РїСЂРµРґР»РѕР¶РµРЅРёРµРј РіРѕС‚РѕРІРѕР№ СЂР°Р±РѕС‚С‹'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user not in chat.participants.all():
            return Response({'detail': 'Р’С‹ РЅРµ СЏРІР»СЏРµС‚РµСЃСЊ СѓС‡Р°СЃС‚РЅРёРєРѕРј СЌС‚РѕРіРѕ С‡Р°С‚Р°'}, status=status.HTTP_403_FORBIDDEN)

        if request.user == offer_message.sender:
            return Response({'detail': 'РќРµР»СЊР·СЏ РїСЂРёРЅСЏС‚СЊ СЃРІРѕСЋ СЃРѕР±СЃС‚РІРµРЅРЅСѓСЋ СЂР°Р±РѕС‚Сѓ'}, status=status.HTTP_400_BAD_REQUEST)

        rating = request.data.get('rating', None)
        if rating is not None and rating != '':
            try:
                rating = int(rating)
            except (TypeError, ValueError):
                return Response({'detail': 'rating РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ С‡РёСЃР»РѕРј'}, status=status.HTTP_400_BAD_REQUEST)
            if rating < 1 or rating > 5:
                return Response({'detail': 'rating РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РІ РґРёР°РїР°Р·РѕРЅРµ 1..5'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            rating = None

        offer_data = offer_message.offer_data or {}
        if offer_data.get('status') != 'accepted' or offer_data.get('delivery_status') != 'delivered':
            return Response({'detail': 'РЎРµР№С‡Р°СЃ РЅРµР»СЊР·СЏ РїСЂРёРЅСЏС‚СЊ СЂР°Р±РѕС‚Сѓ РїРѕ СЌС‚РѕРјСѓ РїСЂРµРґР»РѕР¶РµРЅРёСЋ'}, status=status.HTTP_400_BAD_REQUEST)

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
                    purchase = (
                        Purchase.objects.filter(work=work, buyer=request.user)
                        .order_by('-created_at', '-id')
                        .first()
                    )
                    if purchase is None:
                        purchase = Purchase.objects.create(
                            work=work,
                            buyer=request.user,
                            price_paid=work.price,
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

        try:
            delivered_message_id = offer_data.get('delivered_message_id')
            if chat.order_id and delivered_message_id:
                delivered_message = Message.objects.filter(id=delivered_message_id, chat=chat).first()
                if delivered_message and delivered_message.file:
                    marker = f'chat_delivery_message_id:{delivered_message.id}'
                    already_attached = OrderFile.objects.filter(
                        order_id=chat.order_id,
                        description=marker
                    ).exists()
                    if not already_attached:
                        OrderFile.objects.create(
                            order=chat.order,
                            file=delivered_message.file,
                            file_type='solution',
                            uploaded_by=delivered_message.sender,
                            description=marker
                        )
        except Exception:
            pass

        # РЎРѕР·РґР°РµРј СЂРµР№С‚РёРЅРі СЌРєСЃРїРµСЂС‚Р° РґР»СЏ Р·Р°РєР°Р·Р°, РµСЃР»Рё СѓРєР°Р·Р°РЅ rating Рё РµСЃС‚СЊ СЃРІСЏР·СЊ СЃ Р·Р°РєР°Р·РѕРј
        if rating is not None and chat.order and chat.order.expert:
            try:
                from apps.experts.models import ExpertReview
                ExpertReview.objects.get_or_create(
                    order=chat.order,
                    client=request.user,
                    defaults={
                        'expert': chat.order.expert,
                        'rating': rating,
                        'comment': ''
                    }
                )
            except Exception as e:
                # Р›РѕРіРёСЂСѓРµРј РѕС€РёР±РєСѓ, РЅРѕ РЅРµ Р»РѕРјР°РµРј РѕСЃРЅРѕРІРЅРѕР№ РїСЂРѕС†РµСЃСЃ
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ ExpertReview: {str(e)}")

        return Response({'status': 'success'})

    @action(detail=True, methods=['post'])
    def reject_work_delivery(self, request, pk=None):
        chat = self.get_object()
        message_id = request.data.get('message_id')
        if not message_id:
            return Response({'detail': 'message_id РѕР±СЏР·Р°С‚РµР»РµРЅ'}, status=status.HTTP_400_BAD_REQUEST)

        offer_message = get_object_or_404(Message, id=message_id, chat=chat)
        if offer_message.message_type != 'work_offer' or not offer_message.offer_data:
            return Response({'detail': 'Р­С‚Рѕ СЃРѕРѕР±С‰РµРЅРёРµ РЅРµ СЏРІР»СЏРµС‚СЃСЏ РїСЂРµРґР»РѕР¶РµРЅРёРµРј РіРѕС‚РѕРІРѕР№ СЂР°Р±РѕС‚С‹'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user not in chat.participants.all():
            return Response({'detail': 'Р’С‹ РЅРµ СЏРІР»СЏРµС‚РµСЃСЊ СѓС‡Р°СЃС‚РЅРёРєРѕРј СЌС‚РѕРіРѕ С‡Р°С‚Р°'}, status=status.HTTP_403_FORBIDDEN)

        if request.user == offer_message.sender:
            return Response({'detail': 'РќРµР»СЊР·СЏ РѕС‚РєР»РѕРЅРёС‚СЊ СЃРІРѕСЋ СЃРѕР±СЃС‚РІРµРЅРЅСѓСЋ СЂР°Р±РѕС‚Сѓ'}, status=status.HTTP_400_BAD_REQUEST)

        offer_data = offer_message.offer_data or {}
        if offer_data.get('status') != 'accepted' or offer_data.get('delivery_status') != 'delivered':
            return Response({'detail': 'РЎРµР№С‡Р°СЃ РЅРµР»СЊР·СЏ РѕС‚РєР»РѕРЅРёС‚СЊ СЂР°Р±РѕС‚Сѓ РїРѕ СЌС‚РѕРјСѓ РїСЂРµРґР»РѕР¶РµРЅРёСЋ'}, status=status.HTTP_400_BAD_REQUEST)

        from django.utils import timezone
        offer_data['delivery_status'] = 'rejected'
        offer_data['delivery_rejected_at'] = timezone.now().isoformat()
        offer_message.offer_data = offer_data
        offer_message.save(update_fields=['offer_data'])
        return Response({'status': 'success'})

    @action(detail=True, methods=['post'])
    def accept_offer(self, request, pk=None):
        """РџСЂРёРЅСЏС‚СЊ РёРЅРґРёРІРёРґСѓР°Р»СЊРЅРѕРµ РїСЂРµРґР»РѕР¶РµРЅРёРµ"""
        chat = self.get_object()
        message_id = request.data.get('message_id')
        
        if not message_id:
            return Response({'detail': 'message_id РѕР±СЏР·Р°С‚РµР»РµРЅ'}, status=status.HTTP_400_BAD_REQUEST)
            
        message = get_object_or_404(Message, id=message_id, chat=chat)
        
        if message.message_type != 'offer' or not message.offer_data:
            return Response({'detail': 'Р­С‚Рѕ СЃРѕРѕР±С‰РµРЅРёРµ РЅРµ СЏРІР»СЏРµС‚СЃСЏ РїСЂРµРґР»РѕР¶РµРЅРёРµРј'}, status=status.HTTP_400_BAD_REQUEST)
            
        if request.user == message.sender:
            return Response({'detail': 'РќРµР»СЊР·СЏ РїСЂРёРЅСЏС‚СЊ СЃРІРѕРµ СЃРѕР±СЃС‚РІРµРЅРЅРѕРµ РїСЂРµРґР»РѕР¶РµРЅРёРµ'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user not in chat.participants.all():
            return Response(
                {'detail': 'Р’С‹ РЅРµ СЏРІР»СЏРµС‚РµСЃСЊ СѓС‡Р°СЃС‚РЅРёРєРѕРј СЌС‚РѕРіРѕ С‡Р°С‚Р°'},
                status=status.HTTP_403_FORBIDDEN
            )

        # РџСЂРѕРІРµСЂРєР° СЃСЂРѕРєР° РґРµР№СЃС‚РІРёСЏ (2 РґРЅСЏ)
        from django.utils import timezone
        import datetime
        if timezone.now() > message.created_at + datetime.timedelta(days=2):
            return Response({'detail': 'РЎСЂРѕРє РґРµР№СЃС‚РІРёСЏ РїСЂРµРґР»РѕР¶РµРЅРёСЏ РёСЃС‚РµРє'}, status=status.HTTP_400_BAD_REQUEST)
            
        offer_data = message.offer_data
        if not isinstance(offer_data, dict):
            return Response({'detail': 'РќРµРєРѕСЂСЂРµРєС‚РЅС‹Рµ РґР°РЅРЅС‹Рµ РїСЂРµРґР»РѕР¶РµРЅРёСЏ'}, status=status.HTTP_400_BAD_REQUEST)
        if offer_data.get('status', 'new') != 'new':
            return Response({'detail': 'РџСЂРµРґР»РѕР¶РµРЅРёРµ СѓР¶Рµ РѕР±СЂР°Р±РѕС‚Р°РЅРѕ'}, status=status.HTTP_400_BAD_REQUEST)

        # РЎРѕР·РґР°РµРј Р·Р°РєР°Р·
        try:
            if not getattr(message.sender, 'is_staff', False) and getattr(message.sender, 'role', None) != 'expert':
                return Response({'detail': 'РџСЂРµРґР»РѕР¶РµРЅРёРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ С‚РѕР»СЊРєРѕ РѕС‚ СЌРєСЃРїРµСЂС‚Р°'}, status=status.HTTP_400_BAD_REQUEST)

            # РџР°СЂСЃРёРј РґРµРґР»Р°Р№РЅ. РџСЂРµРґРїРѕР»Р°РіР°РµРј, С‡С‚Рѕ С„СЂРѕРЅС‚ С€Р»РµС‚ ISO СЃС‚СЂРѕРєСѓ РёР»Рё С‡С‚Рѕ-С‚Рѕ РїРѕРЅСЏС‚РЅРѕРµ.
            deadline_str = offer_data.get('deadline')
            deadline = None
            if deadline_str:
                # Р•СЃР»Рё РїСЂРёС…РѕРґРёС‚ timestamp (С‡РёСЃР»Рѕ)
                if isinstance(deadline_str, (int, float)):
                    deadline = timezone.datetime.fromtimestamp(deadline_str / 1000.0, tz=timezone.utc)
                else:
                    # РџРѕРїС‹С‚РєР° СЂР°СЃРїР°СЂСЃРёС‚СЊ СЃС‚СЂРѕРєСѓ
                    try:
                        deadline = timezone.datetime.fromisoformat(deadline_str.replace('Z', '+00:00'))
                    except ValueError:
                        return Response({'detail': 'РќРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ С„РѕСЂРјР°С‚ deadline'}, status=status.HTTP_400_BAD_REQUEST)
            
            if not deadline:
                deadline = timezone.now() + datetime.timedelta(days=3)

            subject_id = offer_data.get('subject_id')
            if subject_id is not None and subject_id != '':
                try:
                    subject_id = int(subject_id)
                except (TypeError, ValueError):
                    return Response({'detail': 'subject_id РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ С‡РёСЃР»РѕРј'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                subject_id = None

            work_type_id = offer_data.get('work_type_id')
            if work_type_id is not None and work_type_id != '':
                try:
                    work_type_id = int(work_type_id)
                except (TypeError, ValueError):
                    return Response({'detail': 'work_type_id РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ С‡РёСЃР»РѕРј'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                work_type_id = None

            cost_raw = offer_data.get('cost')
            if cost_raw is None or cost_raw == '':
                return Response({'detail': 'cost РѕР±СЏР·Р°С‚РµР»РµРЅ'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                cost = Decimal(str(cost_raw))
            except (InvalidOperation, ValueError, TypeError):
                return Response({'detail': 'cost РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ С‡РёСЃР»РѕРј'}, status=status.HTTP_400_BAD_REQUEST)
            if cost < 0:
                return Response({'detail': 'cost РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ РѕС‚СЂРёС†Р°С‚РµР»СЊРЅС‹Рј'}, status=status.HTTP_400_BAD_REQUEST)

            client_user = chat.client or request.user
            expert_user = chat.expert or message.sender

            order = Order.objects.create(
                client=client_user,
                expert=expert_user,
                subject_id=subject_id if subject_id else None,
                work_type_id=work_type_id if work_type_id else None,
                custom_subject=offer_data.get('subject') if not subject_id else None,
                custom_work_type=offer_data.get('work_type') if not work_type_id else None,
                title=offer_data.get('title') or None,
                description=offer_data.get('description'),
                budget=cost,
                deadline=deadline,
                status='in_progress'
            )
            
            # РћР±РЅРѕРІР»СЏРµРј СЃС‚Р°С‚СѓСЃ РїСЂРµРґР»РѕР¶РµРЅРёСЏ
            offer_data['status'] = 'accepted'
            offer_data['order_id'] = order.id
            message.offer_data = offer_data
            message.save(update_fields=['offer_data'])

            _direct_chat, order_chat, _order_message = ensure_order_chat_started(
                order,
                sender=client_user,
                text=message.text or f'Заказ #{order.id} принят в работу',
            )

            try:
                safe_call(NotificationService.create_notification,
                    recipient=expert_user,
                    type=NotificationType.ORDER_ASSIGNED,
                    title="Индивидуальное предложение принято",
                    message=f"Клиент принял ваше индивидуальное предложение. Можно начинать работу по заказу №{order.id}.",
                    related_object_id=order.id,
                    related_object_type='order',
                    data={
                        'order_id': order.id,
                        'chat_id': order_chat.id,
                        'offer_message_id': message.id
                    })
            except Exception:
                pass
                
            return Response({'status': 'success', 'order_id': order.id, 'chat_id': order_chat.id})
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"[accept_offer] Error accepting offer in chat {pk}: {e}", exc_info=True)
            from django.db import IntegrityError
            if isinstance(e, IntegrityError):
                return Response(
                    {'detail': 'РћС€РёР±РєР° РїСЂРё СЃРѕР·РґР°РЅРёРё Р·Р°РєР°Р·Р°. РџСЂРѕРІРµСЂСЊС‚Рµ РєРѕСЂСЂРµРєС‚РЅРѕСЃС‚СЊ РґР°РЅРЅС‹С… РїСЂРµРґР»РѕР¶РµРЅРёСЏ.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            return Response(
                {'detail': f'РћС€РёР±РєР° РїСЂРё РїСЂРёРЅСЏС‚РёРё РїСЂРµРґР»РѕР¶РµРЅРёСЏ: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def reject_offer(self, request, pk=None):
        """РћС‚РєР»РѕРЅРёС‚СЊ РёРЅРґРёРІРёРґСѓР°Р»СЊРЅРѕРµ РїСЂРµРґР»РѕР¶РµРЅРёРµ"""
        chat = self.get_object()
        message_id = request.data.get('message_id')
        
        if not message_id:
            return Response({'detail': 'message_id РѕР±СЏР·Р°С‚РµР»РµРЅ'}, status=status.HTTP_400_BAD_REQUEST)
            
        message = get_object_or_404(Message, id=message_id, chat=chat)
        
        if message.message_type != 'offer':
            return Response({'detail': 'Р­С‚Рѕ СЃРѕРѕР±С‰РµРЅРёРµ РЅРµ СЏРІР»СЏРµС‚СЃСЏ РїСЂРµРґР»РѕР¶РµРЅРёРµРј'}, status=status.HTTP_400_BAD_REQUEST)
            
        offer_data = message.offer_data or {}
        offer_data['status'] = 'rejected'
        message.offer_data = offer_data
        message.save()
        
        return Response({'status': 'success'})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """РћС‚РјРµС‚РёС‚СЊ РІСЃРµ СЃРѕРѕР±С‰РµРЅРёСЏ РІ С‡Р°С‚Рµ РєР°Рє РїСЂРѕС‡РёС‚Р°РЅРЅС‹Рµ"""
        chat = self.get_object()
        if request.user not in chat.participants.all():
            return Response(
                {'detail': 'Р’С‹ РЅРµ СЏРІР»СЏРµС‚РµСЃСЊ СѓС‡Р°СЃС‚РЅРёРєРѕРј СЌС‚РѕРіРѕ С‡Р°С‚Р°'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # РћС‚РјРµС‡Р°РµРј РєР°Рє РїСЂРѕС‡РёС‚Р°РЅРЅС‹Рµ РІСЃРµ СЃРѕРѕР±С‰РµРЅРёСЏ, РєРѕС‚РѕСЂС‹Рµ РЅРµ РѕС‚ С‚РµРєСѓС‰РµРіРѕ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
        chat.messages.exclude(sender=request.user).update(is_read=True)
        
        return Response({'status': 'success'})

    @action(detail=True, methods=['post'])
    def mark_as_unread(self, request, pk=None):
        """РџРѕРјРµС‚РёС‚СЊ С‡Р°С‚ РєР°Рє РЅРµРїСЂРѕС‡РёС‚Р°РЅРЅС‹Р№"""
        chat = self.get_object()
        if request.user not in chat.participants.all():
            return Response(
                {'detail': 'Р’С‹ РЅРµ СЏРІР»СЏРµС‚РµСЃСЊ СѓС‡Р°СЃС‚РЅРёРєРѕРј СЌС‚РѕРіРѕ С‡Р°С‚Р°'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # РћС‚РјРµС‡Р°РµРј РІСЃРµ СЃРѕРѕР±С‰РµРЅРёСЏ РєР°Рє РЅРµРїСЂРѕС‡РёС‚Р°РЅРЅС‹Рµ
        chat.messages.exclude(sender=request.user).update(is_read=False)
        
        return Response({'status': 'success'})

    @action(detail=True, methods=['post'])
    def toggle_pin(self, request, pk=None):
        """Р—Р°РєСЂРµРїРёС‚СЊ/РѕС‚РєСЂРµРїРёС‚СЊ С‡Р°С‚"""
        chat = self.get_object()
        if request.user not in chat.participants.all():
            return Response(
                {'detail': 'Р’С‹ РЅРµ СЏРІР»СЏРµС‚РµСЃСЊ СѓС‡Р°СЃС‚РЅРёРєРѕРј СЌС‚РѕРіРѕ С‡Р°С‚Р°'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # РџСЂРѕРІРµСЂСЏРµРј, Р·Р°РєСЂРµРїР»С‘РЅ Р»Рё СѓР¶Рµ С‡Р°С‚
        pin = ChatPin.objects.filter(user=request.user, chat=chat).first()
        
        if pin:
            # РћС‚РєСЂРµРїР»СЏРµРј С‡Р°С‚
            pin.delete()
            return Response({'status': 'unpinned', 'message': 'Р§Р°С‚ РѕС‚РєСЂРµРїР»С‘РЅ'})
        else:
            # Р—Р°РєСЂРµРїР»СЏРµРј С‡Р°С‚
            ChatPin.objects.create(user=request.user, chat=chat)
            return Response({'status': 'pinned', 'message': 'Р§Р°С‚ Р·Р°РєСЂРµРїР»С‘РЅ'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """РџРѕР»СѓС‡РёС‚СЊ РѕР±С‰РµРµ РєРѕР»РёС‡РµСЃС‚РІРѕ РЅРµРїСЂРѕС‡РёС‚Р°РЅРЅС‹С… СЃРѕРѕР±С‰РµРЅРёР№"""
        user = request.user

        visible_chats = Chat.objects.filter(participants=user).exclude(hidden_for_users=user)

        support_user_id = getattr(settings, 'SUPPORT_USER_ID', None)
        if support_user_id:
            visible_chats = visible_chats.exclude(participants__id=support_user_id)

        visible_chats = visible_chats.exclude(
            Q(context_title__icontains='РїРѕРґРґРµСЂР¶РєР°') |
            Q(context_title__icontains='support') |
            Q(context_title__icontains='С‚РµС…РїРѕРґРґРµСЂР¶РєР°')
        )

        count = Message.objects.filter(
            chat__in=visible_chats
        ).exclude(
            sender=user
        ).filter(
            is_read=False
        ).count()
        
        return Response({'unread_count': count})

    @action(detail=False, methods=['post'])
    def get_or_create_by_order(self, request):
        """РџРѕР»СѓС‡РёС‚СЊ РёР»Рё СЃРѕР·РґР°С‚СЊ С‡Р°С‚ РїРѕ ID Р·Р°РєР°Р·Р°"""
        order_id = request.data.get('order_id')
        if not order_id:
            return Response(
                {'detail': 'order_id РѕР±СЏР·Р°С‚РµР»РµРЅ'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response(
                {'detail': 'Р—Р°РєР°Р· РЅРµ РЅР°Р№РґРµРЅ'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Р­С‚РѕС‚ endpoint РїРѕРґРґРµСЂР¶РёРІР°РµС‚ С‚РѕР»СЊРєРѕ С‡Р°С‚ РјРµР¶РґСѓ РєР»РёРµРЅС‚РѕРј Рё РЅР°Р·РЅР°С‡РµРЅРЅС‹Рј СЌРєСЃРїРµСЂС‚РѕРј.
        # Р”Р»СЏ С‡Р°С‚РѕРІ РїРѕ РѕС‚РєР»РёРєР°Рј РёСЃРїРѕР»СЊР·СѓР№С‚Рµ get_or_create_by_order_and_user.
        if not order.expert_id:
            return Response(
                {'detail': 'РЈ Р·Р°РєР°Р·Р° РµС‰Рµ РЅРµС‚ РЅР°Р·РЅР°С‡РµРЅРЅРѕРіРѕ СЌРєСЃРїРµСЂС‚Р°. РСЃРїРѕР»СЊР·СѓР№С‚Рµ get_or_create_by_order_and_user.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # РџСЂРѕРІРµСЂСЏРµРј, С‡С‚Рѕ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ СЏРІР»СЏРµС‚СЃСЏ СѓС‡Р°СЃС‚РЅРёРєРѕРј Р·Р°РєР°Р·Р°
        if request.user not in [order.client, order.expert]:
            return Response(
                {'detail': 'Р’С‹ РЅРµ СЏРІР»СЏРµС‚РµСЃСЊ СѓС‡Р°СЃС‚РЅРёРєРѕРј СЌС‚РѕРіРѕ Р·Р°РєР°Р·Р°'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # РџРѕР»СѓС‡Р°РµРј РёР»Рё СЃРѕР·РґР°РµРј С‡Р°С‚
        chat = get_or_create_order_chat(order, client_user=order.client, expert_user=order.expert)
        
        serializer = ChatDetailSerializer(chat, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def get_or_create_by_order_and_user(self, request):
        """РџРѕР»СѓС‡РёС‚СЊ РёР»Рё СЃРѕР·РґР°С‚СЊ С‡Р°С‚ РїРѕ ID Р·Р°РєР°Р·Р° Рё ID РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ (РєРѕРЅС‚РµРєСЃС‚ Р·Р°РєР°Р·Р° РёР· Р»РµРЅС‚С‹)."""
        from apps.users.models import User

        order_id = request.data.get('order_id')
        user_id = request.data.get('user_id')
        if not order_id or not user_id:
            return Response(
                {'detail': 'order_id Рё user_id РѕР±СЏР·Р°С‚РµР»СЊРЅС‹'},
                status=status.HTTP_400_BAD_REQUEST
            )

        order = get_object_or_404(Order, id=order_id)
        other_user = get_object_or_404(User, id=user_id)

        # РРЅРёС†РёР°С‚РѕСЂРѕРј РїРµСЂРµРїРёСЃРєРё РїРѕ РѕС‚РєР»РёРєСѓ РјРѕР¶РµС‚ Р±С‹С‚СЊ С‚РѕР»СЊРєРѕ Р·Р°РєР°Р·С‡РёРє
        if request.user.id != order.client_id and not request.user.is_staff:
            return Response(
                {'detail': 'РўРѕР»СЊРєРѕ Р·Р°РєР°Р·С‡РёРє РјРѕР¶РµС‚ РёРЅРёС†РёРёСЂРѕРІР°С‚СЊ С‡Р°С‚ РїРѕ РѕС‚РєР»РёРєСѓ'},
                status=status.HTTP_403_FORBIDDEN
            )

        # РќРµР»СЊР·СЏ СЃРѕР·РґР°С‚СЊ С‡Р°С‚ СЃ СЃР°РјРёРј СЃРѕР±РѕР№
        if other_user.id == request.user.id:
            return Response(
                {'detail': 'РќРµР»СЊР·СЏ СЃРѕР·РґР°С‚СЊ С‡Р°С‚ СЃ СЃР°РјРёРј СЃРѕР±РѕР№'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if getattr(other_user, 'role', None) != 'expert' and not getattr(other_user, 'is_staff', False):
            return Response(
                {'detail': 'Р§Р°С‚ РјРѕР¶РЅРѕ СЃРѕР·РґР°С‚СЊ С‚РѕР»СЊРєРѕ СЃ СЌРєСЃРїРµСЂС‚РѕРј'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if order.expert_id and {order.client_id, other_user.id} == {order.client_id, order.expert_id}:
            chat = get_or_create_order_chat(order, client_user=order.client, expert_user=order.expert)
            chat.hidden_for_users.remove(request.user)
            serializer = ChatDetailSerializer(chat, context={'request': request})
            return Response(serializer.data)

        client = order.client
        expert = other_user

        context_title = f"Р—Р°РєР°Р· РёР· Р»РµРЅС‚С‹ #{order.id}"
        chat = Chat.objects.filter(
            order__isnull=True,
            client=client,
            expert=expert,
            context_title=context_title
        ).order_by('id').first()

        if not chat:
            chat = Chat.objects.filter(
                order__isnull=True
            ).filter(
                Q(client_id=client.id, expert_id=expert.id) |
                Q(client_id=expert.id, expert_id=client.id)
            ).order_by('id').first()

        if not chat:
            try:
                with transaction.atomic():
                    chat = Chat.objects.create(order=None, client=client, expert=expert, context_title=context_title)
                    chat.participants.add(client, expert)
            except IntegrityError:
                chat = Chat.objects.filter(
                    order__isnull=True
                ).filter(
                    Q(client_id=client.id, expert_id=expert.id) |
                    Q(client_id=expert.id, expert_id=client.id)
                ).order_by('id').first()
                if not chat:
                    raise

        updated_fields = []
        if chat.client_id != client.id:
            chat.client = client
            updated_fields.append('client')
        if chat.expert_id != expert.id:
            chat.expert = expert
            updated_fields.append('expert')
        if not chat.context_title or chat.context_title != context_title:
            chat.context_title = context_title
            updated_fields.append('context_title')
        if updated_fields:
            chat.save(update_fields=updated_fields)
        chat.participants.add(client, expert)
        chat.hidden_for_users.remove(request.user)

        serializer = ChatDetailSerializer(chat, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def get_or_create_by_user(self, request):
        """РџРѕР»СѓС‡РёС‚СЊ РёР»Рё СЃРѕР·РґР°С‚СЊ С‡Р°С‚ СЃ РєРѕРЅРєСЂРµС‚РЅС‹Рј РїРѕР»СЊР·РѕРІР°С‚РµР»РµРј.
        
        Р“Р°СЂР°РЅС‚РёСЂСѓРµС‚ СѓРЅРёРєР°Р»СЊРЅРѕСЃС‚СЊ С‡Р°С‚Р° РјРµР¶РґСѓ РїР°СЂРѕР№ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№:
        СЃРЅР°С‡Р°Р»Р° РёС‰РµС‚ СЃСѓС‰РµСЃС‚РІСѓСЋС‰РёР№ С‡Р°С‚, Рё С‚РѕР»СЊРєРѕ РµСЃР»Рё РЅРµ РЅР°С…РѕРґРёС‚ вЂ” СЃРѕР·РґР°С‘С‚ РЅРѕРІС‹Р№.
        """
        from apps.users.models import User
        
        user_id = request.data.get('user_id')
        context_title = request.data.get('context_title')
        if context_title is not None:
            context_title = str(context_title).strip()[:255] or None
        if user_id in (None, '', 0, '0'):
            return Response(
                {'detail': 'user_id РѕР±СЏР·Р°С‚РµР»РµРЅ'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user_id_int = int(user_id)
        except (TypeError, ValueError):
            return Response(
                {'detail': 'user_id РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ С‡РёСЃР»РѕРј'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user_id_int == request.user.id:
            return Response(
                {'detail': 'РќРµР»СЊР·СЏ СЃРѕР·РґР°С‚СЊ С‡Р°С‚ СЃ СЃР°РјРёРј СЃРѕР±РѕР№'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            other_user = User.objects.get(id=user_id_int)
        except User.DoesNotExist:
            return Response(
                {'detail': 'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р№РґРµРЅ'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # РћРїСЂРµРґРµР»СЏРµРј client/expert РїРѕ ID (РјРµРЅСЊС€РёР№ ID = client), С‡С‚РѕР±С‹ constraint СЂР°Р±РѕС‚Р°Р» РєРѕСЂСЂРµРєС‚РЅРѕ
        chat = get_or_create_direct_chat(request.user, other_user, context_title=context_title)
        chat.hidden_for_users.remove(request.user)
        serializer = ChatDetailSerializer(chat, context={'request': request})
        return Response(serializer.data)

        user_ids = sorted([request.user.id, other_user.id])
        resolved_client_id = user_ids[0]
        resolved_expert_id = user_ids[1]

        pair_chats = list(
            Chat.objects.filter(participants=request.user)
            .filter(participants=other_user)
            .exclude(
                Q(context_title__icontains='поддержка') |
                Q(context_title__icontains='support') |
                Q(context_title__icontains='техподдержка')
            )
            .annotate(last_message_time=Max('messages__created_at'))
            .order_by('-last_message_time', '-id')
        )
        if pair_chats:
            active_statuses = {'new', 'waiting_payment', 'in_progress', 'review', 'revision'}
            pair_chats.sort(
                key=lambda item: (
                    0 if getattr(item, 'order_id', None) and getattr(getattr(item, 'order', None), 'status', None) in active_statuses else (
                        1 if getattr(item, 'order_id', None) else 2
                    ),
                    -(item.last_message_time.timestamp() if getattr(item, 'last_message_time', None) else 0),
                    -item.id,
                )
            )
            existing_pair_chat = pair_chats[0]
            if context_title and not existing_pair_chat.context_title:
                existing_pair_chat.context_title = context_title
                existing_pair_chat.save(update_fields=['context_title'])
            existing_pair_chat.participants.add(request.user, other_user)
            existing_pair_chat.hidden_for_users.remove(request.user)
            serializer = ChatDetailSerializer(existing_pair_chat, context={'request': request})
            return Response(serializer.data)


        # РЎРЅР°С‡Р°Р»Р° РёС‰РµРј СЃСѓС‰РµСЃС‚РІСѓСЋС‰РёР№ С‡Р°С‚ РјРµР¶РґСѓ СЌС‚РёРјРё РїРѕР»СЊР·РѕРІР°С‚РµР»СЏРјРё
        # РСЃРїРѕР»СЊР·СѓРµРј client_id/expert_id РґР»СЏ РЅР°РґС‘Р¶РЅРѕРіРѕ РїРѕРёСЃРєР°
        chat = Chat.objects.filter(
            order__isnull=True,
            client_id=resolved_client_id,
            expert_id=resolved_expert_id,
        ).order_by('id').first()

        if not chat:
            # РџСЂРѕР±СѓРµРј РЅР°Р№С‚Рё РІ РѕР±СЂР°С‚РЅРѕРј РїРѕСЂСЏРґРєРµ (РЅР° СЃР»СѓС‡Р°Р№ СЃС‚Р°СЂС‹С… РґР°РЅРЅС‹С…)
            chat = Chat.objects.filter(
                order__isnull=True,
                client_id=resolved_expert_id,
                expert_id=resolved_client_id,
            ).order_by('id').first()

        if not chat:
            # РС‰РµРј С‡РµСЂРµР· ManyToMany РєР°Рє Р·Р°РїР°СЃРЅРѕР№ РІР°СЂРёР°РЅС‚
            chat = Chat.objects.filter(
                participants=request.user,
                order__isnull=True,
            ).filter(
                participants=other_user,
            ).order_by('id').first()

        if chat:
            # Р§Р°С‚ РЅР°Р№РґРµРЅ вЂ” СѓРґР°Р»СЏРµРј РґСѓР±Р»РёРєР°С‚С‹ Рё РѕР±РЅРѕРІР»СЏРµРј РїРѕР»СЏ
            duplicates = Chat.objects.filter(
                order__isnull=True,
            ).filter(
                Q(client_id=resolved_client_id, expert_id=resolved_expert_id) |
                Q(client_id=resolved_expert_id, expert_id=resolved_client_id),
            ).exclude(id=chat.id)
            if duplicates.exists():
                duplicates.delete()

            # РћР±РЅРѕРІР»СЏРµРј context_title РµСЃР»Рё РїРµСЂРµРґР°РЅ Рё С‡Р°С‚ РµРіРѕ РЅРµ РёРјРµРµС‚
            if context_title and not chat.context_title:
                chat.context_title = context_title
                chat.save(update_fields=['context_title'])

            chat.participants.add(request.user, other_user)
        else:
            # Р§Р°С‚ РЅРµ РЅР°Р№РґРµРЅ вЂ” СЃРѕР·РґР°С‘Рј РЅРѕРІС‹Р№
            with transaction.atomic():
                try:
                    chat = Chat.objects.create(
                        order=None,
                        client_id=resolved_client_id,
                        expert_id=resolved_expert_id,
                        context_title=context_title,
                    )
                    chat.participants.add(request.user, other_user)
                except IntegrityError:
                    # Constraint СЃСЂР°Р±РѕС‚Р°Р» вЂ” РёС‰РµРј СЃРѕР·РґР°РЅРЅС‹Р№ С‡Р°С‚
                    chat = Chat.objects.filter(
                        order__isnull=True,
                        client_id=resolved_client_id,
                        expert_id=resolved_expert_id,
                    ).order_by('id').first()
                    if not chat:
                        chat = Chat.objects.filter(
                            order__isnull=True,
                            client_id=resolved_expert_id,
                            expert_id=resolved_client_id,
                        ).order_by('id').first()
                    if chat:
                        chat.participants.add(request.user, other_user)
                    else:
                        raise

        chat.hidden_for_users.remove(request.user)
        
        serializer = ChatDetailSerializer(chat, context={'request': request})
        return Response(serializer.data)



# ViewSet РґР»СЏ С‡Р°С‚РѕРІ С‚РµС…РЅРёС‡РµСЃРєРѕР№ РїРѕРґРґРµСЂР¶РєРё

from .models import SupportChat, SupportMessage
from rest_framework.pagination import PageNumberPagination


class SupportChatViewSet(viewsets.ModelViewSet):
    """
    ViewSet РґР»СЏ СѓРїСЂР°РІР»РµРЅРёСЏ С‡Р°С‚Р°РјРё С‚РµС…РЅРёС‡РµСЃРєРѕР№ РїРѕРґРґРµСЂР¶РєРё.
    
    Р­С‚Рё С‡Р°С‚С‹ РѕС‚РѕР±СЂР°Р¶Р°СЋС‚СЃСЏ РўРћР›Р¬РљРћ РІ СЂР°Р·РґРµР»Рµ "Р§Р°С‚С‹ РїРѕРґРґРµСЂР¶РєРё" РІ Р°РґРјРёРЅ-РїР°РЅРµР»Рё
    Рё РќР• РѕС‚РѕР±СЂР°Р¶Р°СЋС‚СЃСЏ РЅР° СЃС‚СЂР°РЅРёС†Рµ РѕР±С‹С‡РЅС‹С… С‡Р°С‚РѕРІ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№.
    
    РџСЂР°РІР° РґРѕСЃС‚СѓРїР°:
    - РђРґРјРёРЅС‹ РІРёРґСЏС‚ РІСЃРµ С‡Р°С‚С‹ РїРѕРґРґРµСЂР¶РєРё
    - РљР»РёРµРЅС‚С‹ РІРёРґСЏС‚ С‚РѕР»СЊРєРѕ СЃРІРѕРё С‡Р°С‚С‹ СЃ РїРѕРґРґРµСЂР¶РєРѕР№
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SupportChatSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        # РђРґРјРёРЅС‹ РІРёРґСЏС‚ РІСЃРµ С‡Р°С‚С‹
        if user.role == 'admin':
            return SupportChat.objects.all().select_related(
                'client', 'admin'
            ).prefetch_related('support_messages__sender')
        
        # РљР»РёРµРЅС‚С‹ РІРёРґСЏС‚ С‚РѕР»СЊРєРѕ СЃРІРѕРё С‡Р°С‚С‹
        return SupportChat.objects.filter(
            client=user
        ).select_related('admin').prefetch_related('support_messages__sender')
    
    def create(self, request, *args, **kwargs):
        """РЎРѕР·РґР°РЅРёРµ РЅРѕРІРѕРіРѕ С‡Р°С‚Р° РїРѕРґРґРµСЂР¶РєРё"""
        subject = request.data.get('subject', 'Р’РѕРїСЂРѕСЃ РїРѕ СЂР°Р±РѕС‚Рµ РїР»Р°С‚С„РѕСЂРјС‹')
        priority = request.data.get('priority', 'medium')
        initial_message = request.data.get('message', '')
        
        if not initial_message:
            return Response(
                {'detail': 'РЎРѕРѕР±С‰РµРЅРёРµ РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # РЎРѕР·РґР°РµРј С‡Р°С‚
        chat = SupportChat.objects.create(
            client=request.user,
            subject=subject,
            priority=priority,
            status='open'
        )
        
        # РЎРѕР·РґР°РµРј РїРµСЂРІРѕРµ СЃРѕРѕР±С‰РµРЅРёРµ
        SupportMessage.objects.create(
            chat=chat,
            sender=request.user,
            text=initial_message
        )
        
        return Response({
            'id': chat.id,
            'subject': chat.subject,
            'status': chat.status,
            'priority': chat.priority,
            'created_at': chat.created_at
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """РћС‚РїСЂР°РІРєР° СЃРѕРѕР±С‰РµРЅРёСЏ РІ С‡Р°С‚ РїРѕРґРґРµСЂР¶РєРё"""
        chat = self.get_object()
        text = request.data.get('text', '').strip()
        uploaded_file = request.FILES.get('file')
        
        if not text and not uploaded_file:
            return Response(
                {'detail': 'РЈРєР°Р¶РёС‚Рµ С‚РµРєСЃС‚ СЃРѕРѕР±С‰РµРЅРёСЏ РёР»Рё РїСЂРёРєСЂРµРїРёС‚Рµ С„Р°Р№Р»'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # РЎРѕР·РґР°РµРј СЃРѕРѕР±С‰РµРЅРёРµ
        message = SupportMessage.objects.create(
            chat=chat,
            sender=request.user,
            text=text or '',
            file=uploaded_file,
            message_type='file' if uploaded_file else 'text'
        )
        
        # РћР±РЅРѕРІР»СЏРµРј РІСЂРµРјСЏ РїРѕСЃР»РµРґРЅРµРіРѕ РѕР±РЅРѕРІР»РµРЅРёСЏ С‡Р°С‚Р°
        chat.save(update_fields=['updated_at'])
        
        return Response({
            'id': message.id,
            'text': message.text,
            'sender': {
                'id': message.sender.id,
                'username': message.sender.username,
                'first_name': message.sender.first_name,
                'last_name': message.sender.last_name,
                'role': message.sender.role,
            },
            'created_at': message.created_at,
            'is_read': message.is_read
        })
    
    @action(detail=True, methods=['post'])
    def take_chat(self, request, pk=None):
        """Р’Р·СЏС‚СЊ С‡Р°С‚ РІ СЂР°Р±РѕС‚Сѓ (С‚РѕР»СЊРєРѕ РґР»СЏ Р°РґРјРёРЅРѕРІ)"""
        if request.user.role != 'admin':
            return Response(
                {'detail': 'Р”РѕСЃС‚СѓРїРЅРѕ С‚РѕР»СЊРєРѕ РґР»СЏ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРІ'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        chat = self.get_object()
        chat.admin = request.user
        chat.status = 'in_progress'
        chat.save()
        
        # РЎРёСЃС‚РµРјРЅРѕРµ СЃРѕРѕР±С‰РµРЅРёРµ
        SupportMessage.objects.create(
            chat=chat,
            sender=request.user,
            text=f'РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ {request.user.get_full_name() or request.user.username} РІР·СЏР» РѕР±СЂР°С‰РµРЅРёРµ РІ СЂР°Р±РѕС‚Сѓ',
            message_type='system'
        )
        
        return Response({'status': 'success'})
    
    @action(detail=True, methods=['post'])
    def close_chat(self, request, pk=None):
        """Р—Р°РєСЂС‹С‚СЊ С‡Р°С‚"""
        chat = self.get_object()
        
        # РўРѕР»СЊРєРѕ Р°РґРјРёРЅ РёР»Рё РєР»РёРµРЅС‚ РјРѕРіСѓС‚ Р·Р°РєСЂС‹С‚СЊ С‡Р°С‚
        if request.user.role != 'admin' and request.user != chat.client:
            return Response(
                {'detail': 'РќРµРґРѕСЃС‚Р°С‚РѕС‡РЅРѕ РїСЂР°РІ'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        chat.status = 'resolved'
        chat.save()
        
        # РЎРёСЃС‚РµРјРЅРѕРµ СЃРѕРѕР±С‰РµРЅРёРµ
        SupportMessage.objects.create(
            chat=chat,
            sender=request.user,
            text=f'Р§Р°С‚ Р·Р°РєСЂС‹С‚ РїРѕР»СЊР·РѕРІР°С‚РµР»РµРј {request.user.get_full_name() or request.user.username}',
            message_type='system'
        )
        
        return Response({'status': 'success'})
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """РџРѕР»СѓС‡РёС‚СЊ СЃРѕРѕР±С‰РµРЅРёСЏ С‡Р°С‚Р°"""
        chat = self.get_object()
        messages = chat.support_messages.all().select_related('sender')
        
        # РћС‚РјРµС‡Р°РµРј СЃРѕРѕР±С‰РµРЅРёСЏ РєР°Рє РїСЂРѕС‡РёС‚Р°РЅРЅС‹Рµ
        if request.user == chat.client:
            messages.filter(sender__role='admin', is_read=False).update(is_read=True)
        elif request.user.role == 'admin':
            messages.filter(sender=chat.client, is_read=False).update(is_read=True)
        
        messages_data = []
        for msg in messages:
            messages_data.append({
                'id': msg.id,
                'text': msg.text,
                'sender': {
                    'id': msg.sender.id,
                    'username': msg.sender.username,
                    'first_name': msg.sender.first_name,
                    'last_name': msg.sender.last_name,
                    'role': msg.sender.role,
                    'is_admin': msg.sender.role == 'admin',
                },
                'message_type': msg.message_type,
                'file': request.build_absolute_uri(msg.file.url) if msg.file else None,
                'is_read': msg.is_read,
                'created_at': msg.created_at,
                'is_mine': msg.sender == request.user,
            })
        
        return Response(messages_data)
    
    @action(detail=True, methods=['post'])
    def create_ticket(self, request, pk=None):
        """РЎРѕР·РґР°С‚СЊ С‚РёРєРµС‚ РёР· С‡Р°С‚Р° РїРѕРґРґРµСЂР¶РєРё"""
        chat = self.get_object()
        
        # РџСЂРѕРІРµСЂСЏРµРј РїСЂР°РІР° РґРѕСЃС‚СѓРїР°
        if request.user.role != 'admin' and request.user != chat.client:
            return Response(
                {'detail': 'РќРµРґРѕСЃС‚Р°С‚РѕС‡РЅРѕ РїСЂР°РІ'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # РџСЂРѕРІРµСЂСЏРµРј, РЅРµ СЃРѕР·РґР°РЅ Р»Рё СѓР¶Рµ С‚РёРєРµС‚
        from apps.admin_panel.models import SupportRequest
        existing_ticket = SupportRequest.objects.filter(support_chat=chat).first()
        
        if existing_ticket:
            return Response({
                'ticket_id': existing_ticket.id,
                'created': False,
                'status': 'already_exists',
                'message': 'РўРёРєРµС‚ СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚'
            })
        
        # РџРѕР»СѓС‡Р°РµРј РїРµСЂРІРѕРµ СЃРѕРѕР±С‰РµРЅРёРµ РґР»СЏ РѕРїРёСЃР°РЅРёСЏ
        first_message = chat.support_messages.first()
        description = first_message.text if first_message else chat.subject
        
        # РЎРѕР·РґР°РµРј С‚РёРєРµС‚
        ticket = SupportRequest.objects.create(
            user=chat.client,
            support_chat=chat,
            subject=chat.subject,
            description=description,
            status='open',
            priority=chat.priority,
            auto_created=False  # РЎРѕР·РґР°РЅ РІСЂСѓС‡РЅСѓСЋ С‡РµСЂРµР· action
        )
        
        # РљРѕРїРёСЂСѓРµРј РІСЃРµ СЃРѕРѕР±С‰РµРЅРёСЏ РёР· С‡Р°С‚Р° РІ С‚РёРєРµС‚
        from apps.admin_panel.models import SupportMessage as AdminSupportMessage
        for msg in chat.support_messages.all():
            if msg.message_type == 'text':
                AdminSupportMessage.objects.create(
                    request=ticket,
                    sender=msg.sender,
                    message=msg.text,
                    is_admin=(msg.sender.role == 'admin')
                )
        
        return Response({
            'ticket_id': ticket.id,
            'created': True,
            'status': 'success',
            'message': 'РўРёРєРµС‚ СѓСЃРїРµС€РЅРѕ СЃРѕР·РґР°РЅ'
        })


class ContactViolationViewSet(viewsets.ModelViewSet):
    """ViewSet РґР»СЏ СѓРїСЂР°РІР»РµРЅРёСЏ РЅР°СЂСѓС€РµРЅРёСЏРјРё РѕР±РјРµРЅР° РєРѕРЅС‚Р°РєС‚Р°РјРё"""
    from .models import ContactViolationLog
    from .serializers import ContactViolationSerializer
    
    queryset = ContactViolationLog.objects.all()
    serializer_class = ContactViolationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # РђРґРјРёРЅС‹ РІРёРґСЏС‚ РІСЃРµ РЅР°СЂСѓС€РµРЅРёСЏ
        if user.role == 'admin':
            return self.queryset.select_related('chat', 'user', 'message', 'reviewed_by')
        
        # РћР±С‹С‡РЅС‹Рµ РїРѕР»СЊР·РѕРІР°С‚РµР»Рё РІРёРґСЏС‚ С‚РѕР»СЊРєРѕ СЃРІРѕРё РЅР°СЂСѓС€РµРЅРёСЏ
        return self.queryset.filter(user=user).select_related('chat', 'message')
    
    @action(detail=True, methods=['post'])
    def approve_violation(self, request, pk=None):
        """РћРґРѕР±СЂРёС‚СЊ РЅР°СЂСѓС€РµРЅРёРµ (СЂР°Р·РјРѕСЂРѕР·РёС‚СЊ С‡Р°С‚)"""
        if request.user.role != 'admin':
            return Response(
                {'detail': 'Р”РѕСЃС‚СѓРїРЅРѕ С‚РѕР»СЊРєРѕ РґР»СЏ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРІ'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        violation = self.get_object()
        decision = request.data.get('decision', 'РћРґРѕР±СЂРµРЅРѕ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРј')
        
        # Р Р°Р·РјРѕСЂР°Р¶РёРІР°РµРј С‡Р°С‚
        from .services import ChatModerationService
        ChatModerationService.unfreeze_chat(
            chat=violation.chat,
            admin_user=request.user,
            decision=decision
        )
        
        # РћР±РЅРѕРІР»СЏРµРј СЃС‚Р°С‚СѓСЃ РЅР°СЂСѓС€РµРЅРёСЏ
        violation.status = 'approved'
        violation.reviewed_by = request.user
        violation.reviewed_at = timezone.now()
        violation.admin_decision = decision
        violation.save()
        
        return Response({'message': 'Р§Р°С‚ СЂР°Р·РјРѕСЂРѕР¶РµРЅ, РЅР°СЂСѓС€РµРЅРёРµ РѕРґРѕР±СЂРµРЅРѕ'})
    
    @action(detail=True, methods=['post'])
    def reject_violation(self, request, pk=None):
        """РћС‚РєР»РѕРЅРёС‚СЊ РЅР°СЂСѓС€РµРЅРёРµ (РѕСЃС‚Р°РІРёС‚СЊ С‡Р°С‚ Р·Р°РјРѕСЂРѕР¶РµРЅРЅС‹Рј)"""
        if request.user.role != 'admin':
            return Response(
                {'detail': 'Р”РѕСЃС‚СѓРїРЅРѕ С‚РѕР»СЊРєРѕ РґР»СЏ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРІ'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        violation = self.get_object()
        decision = request.data.get('decision', 'РќР°СЂСѓС€РµРЅРёРµ РїРѕРґС‚РІРµСЂР¶РґРµРЅРѕ')
        
        # РћР±РЅРѕРІР»СЏРµРј СЃС‚Р°С‚СѓСЃ РЅР°СЂСѓС€РµРЅРёСЏ
        violation.status = 'rejected'
        violation.reviewed_by = request.user
        violation.reviewed_at = timezone.now()
        violation.admin_decision = decision
        violation.save()
        
        # Р§Р°С‚ РѕСЃС‚Р°РµС‚СЃСЏ Р·Р°РјРѕСЂРѕР¶РµРЅРЅС‹Рј
        return Response({'message': 'РќР°СЂСѓС€РµРЅРёРµ РїРѕРґС‚РІРµСЂР¶РґРµРЅРѕ, С‡Р°С‚ РѕСЃС‚Р°РµС‚СЃСЏ Р·Р°РјРѕСЂРѕР¶РµРЅРЅС‹Рј'})
    
    @action(detail=False, methods=['get'])
    def pending_violations(self, request):
        """РџРѕР»СѓС‡РёС‚СЊ СЃРїРёСЃРѕРє РЅР°СЂСѓС€РµРЅРёР№, РѕР¶РёРґР°СЋС‰РёС… РїСЂРѕРІРµСЂРєРё"""
        if request.user.role != 'admin':
            return Response(
                {'detail': 'Р”РѕСЃС‚СѓРїРЅРѕ С‚РѕР»СЊРєРѕ РґР»СЏ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРІ'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        violations = self.get_queryset().filter(status='pending').order_by('-created_at')
        serializer = self.get_serializer(violations, many=True)
        return Response(serializer.data)
    
    def list(self, request, *args, **kwargs):
        """РЎРїРёСЃРѕРє С‡Р°С‚РѕРІ РїРѕРґРґРµСЂР¶РєРё"""
        queryset = self.get_queryset()
        
        # Р¤РёР»СЊС‚СЂР°С†РёСЏ РїРѕ СЃС‚Р°С‚СѓСЃСѓ
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        queryset = queryset.order_by('-updated_at')
        
        chats_data = []
        for chat in queryset:
            last_message = chat.support_messages.last()
            
            chats_data.append({
                'id': chat.id,
                'client': {
                    'id': chat.client.id,
                    'username': chat.client.username,
                    'first_name': chat.client.first_name,
                    'last_name': chat.client.last_name,
                    'email': chat.client.email,
                },
                'admin': {
                    'id': chat.admin.id,
                    'first_name': chat.admin.first_name,
                    'last_name': chat.admin.last_name,
                    'role': 'РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ РїРѕРґРґРµСЂР¶РєРё',
                } if chat.admin else None,
                'status': chat.status,
                'priority': chat.priority,
                'subject': chat.subject,
                'last_message': {
                    'text': last_message.text if last_message else '',
                    'created_at': last_message.created_at if last_message else chat.created_at,
                } if last_message else None,
                'unread_count': chat.unread_count if request.user == chat.client else 0,
                'created_at': chat.created_at,
                'updated_at': chat.updated_at,
            })
        
        return Response(chats_data)
