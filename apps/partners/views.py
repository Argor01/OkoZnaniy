from django.contrib.auth import get_user_model
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import PartnerChatMessage, PartnerChatRoom
from .serializers import PartnerChatMessageSerializer, PartnerChatRoomSerializer

User = get_user_model()


class PartnerChatRoomViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PartnerChatRoomSerializer

    def _ensure_director_rooms(self, user):
        directors = User.objects.filter(role='director', is_active=True)
        existing_private_rooms = list(
            PartnerChatRoom.objects.filter(
                room_type='private',
                is_active=True,
                members=user,
            ).prefetch_related('members').distinct()
        )

        for director in directors:
            existing_room = next(
                (
                    room
                    for room in existing_private_rooms
                    if {member.id for member in room.members.all()} == {user.id, director.id}
                ),
                None,
            )

            if existing_room:
                continue

            room_name = (
                director.get_full_name().strip()
                or getattr(director, 'display_username', '')
                or director.username
            )
            room = PartnerChatRoom.objects.create(
                name=room_name,
                description='Р”РёСЂРµРєС‚РѕСЂ',
                room_type='private',
                created_by=user,
            )
            room.members.add(user, director)
            room.refresh_from_db()
            existing_private_rooms.append(room)

    def get_queryset(self):
        user = self.request.user

        if user.role != 'partner':
            return PartnerChatRoom.objects.none()

        self._ensure_director_rooms(user)

        return (
            PartnerChatRoom.objects.filter(members=user, is_active=True)
            .prefetch_related('members', 'messages__sender')
            .order_by('-updated_at')
        )

    def perform_create(self, serializer):
        room = serializer.save(created_by=self.request.user)
        room.members.add(self.request.user)

        PartnerChatMessage.objects.create(
            room=room,
            sender=self.request.user,
            message=f'Р§Р°С‚ "{room.name}" СЃРѕР·РґР°РЅ',
            is_system=True,
        )

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        room = self.get_object()
        message_text = request.data.get('message')

        if not message_text:
            return Response({'error': 'РџРѕР»Рµ message РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ'}, status=status.HTTP_400_BAD_REQUEST)

        message = PartnerChatMessage.objects.create(
            room=room,
            sender=request.user,
            message=message_text,
        )

        serializer = PartnerChatMessageSerializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def join_room(self, request, pk=None):
        room = self.get_object()
        room.members.add(request.user)

        PartnerChatMessage.objects.create(
            room=room,
            sender=request.user,
            message=f'{request.user.get_full_name() or request.user.username} РїСЂРёСЃРѕРµРґРёРЅРёР»СЃСЏ Рє С‡Р°С‚Сѓ',
            is_system=True,
        )

        return Response({'message': 'Р’С‹ РїСЂРёСЃРѕРµРґРёРЅРёР»РёСЃСЊ Рє С‡Р°С‚Сѓ'})

    @action(detail=True, methods=['post'])
    def leave_room(self, request, pk=None):
        room = self.get_object()
        room.members.remove(request.user)

        PartnerChatMessage.objects.create(
            room=room,
            sender=request.user,
            message=f'{request.user.get_full_name() or request.user.username} РїРѕРєРёРЅСѓР» С‡Р°С‚',
            is_system=True,
        )

        return Response({'message': 'Р’С‹ РїРѕРєРёРЅСѓР»Рё С‡Р°С‚'})

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        room = self.get_object()
        messages = room.messages.all().select_related('sender')
        serializer = PartnerChatMessageSerializer(messages, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def invite_user(self, request, pk=None):
        room = self.get_object()
        user_id = request.data.get('user_id')

        if not user_id:
            return Response({'error': 'РџРѕР»Рµ user_id РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р№РґРµРЅ'}, status=status.HTTP_404_NOT_FOUND)

        room.members.add(user)

        PartnerChatMessage.objects.create(
            room=room,
            sender=request.user,
            message=f'{user.get_full_name() or user.username} Р±С‹Р» РїСЂРёРіР»Р°С€РµРЅ РІ С‡Р°С‚',
            is_system=True,
        )

        try:
            from apps.notifications.services import NotificationService

            NotificationService.create_notification(
                recipient=user,
                type='new_contact',
                title='РџСЂРёРіР»Р°С€РµРЅРёРµ РІ С‡Р°С‚',
                message=f'{request.user.get_full_name() or request.user.username} РїСЂРёРіР»Р°СЃРёР» РІР°СЃ РІ С‡Р°С‚ "{room.name}"',
                related_object_id=room.id,
                related_object_type='partner_chat_room',
            )
        except ImportError:
            pass

        return Response({'message': 'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РїСЂРёРіР»Р°С€РµРЅ'})

    @action(detail=True, methods=['post'])
    def upload_file(self, request, pk=None):
        room = self.get_object()
        file = request.FILES.get('file')

        if not file:
            return Response({'error': 'РџРѕР»Рµ file РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ'}, status=status.HTTP_400_BAD_REQUEST)

        PartnerChatMessage.objects.create(
            room=room,
            sender=request.user,
            message=f'Р—Р°РіСЂСѓР¶РµРЅ С„Р°Р№Р»: {file.name}',
            is_system=False,
        )

        return Response({'message': 'Р¤Р°Р№Р» Р·Р°РіСЂСѓР¶РµРЅ', 'filename': file.name})
