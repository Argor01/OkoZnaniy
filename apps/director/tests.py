from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.director.models import DirectorChatMessage, DirectorChatRoom

User = get_user_model()


class DirectorChatRoomViewSetTests(TestCase):
    @staticmethod
    def _items(payload):
        return payload.get('results', payload) if isinstance(payload, dict) else payload

    @classmethod
    def setUpTestData(cls):
        cls.director_user = User.objects.create_user(
            username='director_chat_user',
            email='director_chat@example.com',
            password='testpass123',
            role='director',
        )
        cls.admin_user = User.objects.create_user(
            username='director_chat_admin',
            email='director_chat_admin@example.com',
            password='testpass123',
            role='admin',
        )
        cls.client_user = User.objects.create_user(
            username='director_chat_client',
            email='director_chat_client@example.com',
            password='testpass123',
            role='client',
        )

    def setUp(self):
        self.api_client = APIClient()

    def test_director_can_list_own_chat_rooms(self):
        room = DirectorChatRoom.objects.create(
            name='Director room',
            description='Internal',
            room_type='private',
            created_by=self.director_user,
        )
        room.members.add(self.director_user, self.admin_user)
        self.api_client.force_authenticate(user=self.director_user)

        response = self.api_client.get('/api/director/chat-rooms/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        items = self._items(response.json())
        self.assertTrue(any(item['id'] == room.id for item in items))

    def test_non_director_role_gets_empty_room_list(self):
        self.api_client.force_authenticate(user=self.client_user)

        response = self.api_client.get('/api/director/chat-rooms/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._items(response.json()), [])

    def test_non_director_role_cannot_create_room(self):
        self.api_client.force_authenticate(user=self.client_user)

        response = self.api_client.post(
            '/api/director/chat-rooms/',
            {'name': 'Forbidden room', 'description': 'No access', 'room_type': 'general'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(DirectorChatRoom.objects.filter(name='Forbidden room').exists())

    def test_director_can_create_room_and_is_added_as_member(self):
        self.api_client.force_authenticate(user=self.director_user)

        response = self.api_client.post(
            '/api/director/chat-rooms/',
            {'name': 'New director room', 'description': 'Ops', 'room_type': 'general'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        room = DirectorChatRoom.objects.get(pk=response.json()['id'])
        self.assertTrue(room.members.filter(id=self.director_user.id).exists())

    def test_director_can_send_and_read_messages_in_own_room(self):
        room = DirectorChatRoom.objects.create(
            name='Director room',
            description='Internal',
            room_type='private',
            created_by=self.director_user,
        )
        room.members.add(self.director_user, self.admin_user)
        self.api_client.force_authenticate(user=self.director_user)

        send_response = self.api_client.post(
            f'/api/director/chat-rooms/{room.id}/send_message/',
            {'message': 'Internal coordination'},
            format='json',
        )
        self.assertEqual(send_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            DirectorChatMessage.objects.filter(
                room=room,
                sender=self.director_user,
                message='Internal coordination',
            ).exists()
        )

        messages_response = self.api_client.get(f'/api/director/chat-rooms/{room.id}/messages/')
        self.assertEqual(messages_response.status_code, status.HTTP_200_OK)
        items = messages_response.json()
        self.assertTrue(any(item['text'] == 'Internal coordination' for item in items))

    def test_director_can_invite_user_to_room(self):
        room = DirectorChatRoom.objects.create(
            name='Director room',
            description='Internal',
            room_type='private',
            created_by=self.director_user,
        )
        room.members.add(self.director_user)
        self.api_client.force_authenticate(user=self.director_user)

        response = self.api_client.post(
            f'/api/director/chat-rooms/{room.id}/invite_user/',
            {'user_id': self.admin_user.id},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        room.refresh_from_db()
        self.assertTrue(room.members.filter(id=self.admin_user.id).exists())
