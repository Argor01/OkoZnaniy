from django.contrib.auth import get_user_model
from django.utils import timezone
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
            message=f'Чат "{room.name}" создан',
            is_system=True,
        )

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        room = self.get_object()
        message_text = request.data.get('message')

        if not message_text:
            return Response({'error': 'Поле message обязательно'}, status=status.HTTP_400_BAD_REQUEST)

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
            message=f'{request.user.get_full_name() or request.user.username} присоединился к чату',
            is_system=True,
        )

        return Response({'message': 'Вы присоединились к чату'})

    @action(detail=True, methods=['post'])
    def leave_room(self, request, pk=None):
        room = self.get_object()
        room.members.remove(request.user)

        PartnerChatMessage.objects.create(
            room=room,
            sender=request.user,
            message=f'{request.user.get_full_name() or request.user.username} покинул чат',
            is_system=True,
        )

        return Response({'message': 'Вы покинули чат'})

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
            return Response({'error': 'Поле user_id обязательно'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'Пользователь не найден'}, status=status.HTTP_404_NOT_FOUND)

        room.members.add(user)

        PartnerChatMessage.objects.create(
            room=room,
            sender=request.user,
            message=f'{user.get_full_name() or user.username} был приглашен в чат',
            is_system=True,
        )

        try:
            from apps.notifications.services import NotificationService

            NotificationService.create_notification(
                recipient=user,
                type='new_contact',
                title='Приглашение в чат',
                message=f'{request.user.get_full_name() or request.user.username} пригласил вас в чат "{room.name}"',
                related_object_id=room.id,
                related_object_type='partner_chat_room',
            )
        except ImportError:
            pass

        return Response({'message': 'Пользователь приглашен'})

    @action(detail=True, methods=['post'])
    def upload_file(self, request, pk=None):
        room = self.get_object()
        file = request.FILES.get('file')

        if not file:
            return Response({'error': 'Поле file обязательно'}, status=status.HTTP_400_BAD_REQUEST)

        msg_text = request.data.get('message', '').strip()
        message = PartnerChatMessage.objects.create(
            room=room,
            sender=request.user,
            message=msg_text or file.name,
            file=file,
            file_name=file.name,
        )
        room.members.add(request.user)
        serializer = PartnerChatMessageSerializer(message, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def pin_message(self, request, pk=None):
        """Закрепить/открепить сообщение"""
        room = self.get_object()
        msg_id = request.data.get('message_id')
        if not msg_id:
            return Response({'error': 'message_id обязателен'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            msg = PartnerChatMessage.objects.get(id=msg_id, room=room)
        except PartnerChatMessage.DoesNotExist:
            return Response({'error': 'Сообщение не найдено'}, status=status.HTTP_404_NOT_FOUND)
        msg.is_pinned = not msg.is_pinned
        msg.save(update_fields=['is_pinned'])
        action_text = 'закрепил(а)' if msg.is_pinned else 'открепил(а)'
        user_name = request.user.get_full_name() or request.user.username
        PartnerChatMessage.objects.create(
            room=room,
            sender=request.user,
            message=f'{user_name} {action_text} сообщение',
            is_system=True,
        )
        return Response({'is_pinned': msg.is_pinned})

    @action(detail=True, methods=['post'], url_path='mark_read')
    def mark_read(self, request, pk=None):
        """Отметить все сообщения в чате как прочитанные"""
        room = self.get_object()
        from .models import RoomReadStatus
        RoomReadStatus.objects.update_or_create(
            user=request.user,
            room=room,
            defaults={'last_read_at': timezone.now()}
        )
        return Response({'status': 'ok'})

    @action(detail=False, methods=['get'])
    def chat_users(self, request):
        """Получить список пользователей для приглашения в чат (только staff)"""
        User = get_user_model()
        allowed_roles = ['admin', 'director', 'partner']
        users = User.objects.filter(role__in=allowed_roles).order_by('first_name', 'last_name')
        return Response([{
            'id': u.id,
            'username': u.username,
            'first_name': u.first_name or '',
            'last_name': u.last_name or '',
            'email': u.email or '',
            'role': u.role,
        } for u in users])


from rest_framework import mixins
from .models import PartnerApplication
from .serializers import (
    PartnerApplicationCreateSerializer,
    PartnerApplicationSerializer,
)


class PartnerApplicationViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Заявки на партнёрство.

    - create: доступно всем (в т.ч. неавторизованным) — форма из футера/лендинга.
    - list/retrieve/update: только директор и админ (обработка заявок в ЛК).
    """

    queryset = PartnerApplication.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return PartnerApplicationCreateSerializer
        return PartnerApplicationSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def _is_staff(self, user):
        return getattr(user, 'role', None) in ('director', 'admin')

    def get_queryset(self):
        user = self.request.user
        if self.action in ('list', 'retrieve', 'update', 'partial_update'):
            if not (user.is_authenticated and self._is_staff(user)):
                return PartnerApplication.objects.none()
            qs = PartnerApplication.objects.all()
            status_param = self.request.query_params.get('status')
            if status_param:
                qs = qs.filter(status=status_param)
            return qs
        return super().get_queryset()

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        application = serializer.save(user=user)
        self._notify_directors(application)

    def perform_update(self, serializer):
        serializer.save(processed_by=self.request.user)

    def _notify_directors(self, application):
        try:
            from apps.notifications.services import NotificationService
            directors = User.objects.filter(role='director', is_active=True)
            for director in directors:
                NotificationService.create_notification(
                    recipient=director,
                    type='new_contact',
                    title='Новая заявка на партнёрство',
                    message=(
                        f'{application.full_name} хочет стать партнёром. '
                        f'Email: {application.email}'
                        + (f', Telegram: {application.telegram}' if application.telegram else '')
                        + (f', тел.: {application.phone}' if application.phone else '')
                    ),
                    related_object_id=application.id,
                    related_object_type='partner_application',
                )
        except Exception:
            # уведомление не должно ломать создание заявки
            pass
