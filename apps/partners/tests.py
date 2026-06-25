from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.partners.models import PartnerChatMessage, PartnerChatRoom

User = get_user_model()


class PartnerChatRoomViewSetTests(TestCase):
    @staticmethod
    def _items(payload):
        return payload.get('results', payload) if isinstance(payload, dict) else payload

    @classmethod
    def setUpTestData(cls):
        cls.partner_user = User.objects.create_user(
            username='partner_chat_user',
            email='partner_chat@example.com',
            password='testpass123',
            role='partner',
        )
        cls.director_one = User.objects.create_user(
            username='director_one',
            email='director_one@example.com',
            password='testpass123',
            role='director',
        )
        cls.director_two = User.objects.create_user(
            username='director_two',
            email='director_two@example.com',
            password='testpass123',
            role='director',
        )
        cls.client_user = User.objects.create_user(
            username='plain_client_user',
            email='plain_client@example.com',
            password='testpass123',
            role='client',
        )

    def setUp(self):
        self.api_client = APIClient()

    def test_partner_listing_auto_creates_private_dialogs_with_all_directors(self):
        self.api_client.force_authenticate(user=self.partner_user)

        response = self.api_client.get('/api/partners/chat-rooms/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        items = self._items(response.json())
        self.assertGreaterEqual(len(items), 2)

        rooms = PartnerChatRoom.objects.filter(members=self.partner_user, room_type='private', is_active=True)
        room_ids = {room['id'] for room in items}
        matching_rooms = rooms.filter(id__in=room_ids).distinct()
        self.assertGreaterEqual(matching_rooms.count(), 2)
        for room in matching_rooms:
            members = list(room.members.order_by('id'))
            self.assertEqual(len(members), 2)
            self.assertIn(self.partner_user, members)
            self.assertTrue(any(member.role == 'director' for member in members))

    def test_partner_listing_reuses_existing_private_dialogs_without_duplicates(self):
        room = PartnerChatRoom.objects.create(
            name='Existing director room',
            description='Директор',
            room_type='private',
            created_by=self.partner_user,
        )
        room.members.add(self.partner_user, self.director_one)

        self.api_client.force_authenticate(user=self.partner_user)
        first = self.api_client.get('/api/partners/chat-rooms/')
        second = self.api_client.get('/api/partners/chat-rooms/')

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)

        rooms_with_first_director = (
            PartnerChatRoom.objects.filter(room_type='private', is_active=True, members=self.partner_user)
            .filter(members=self.director_one)
        )
        unique_room_ids = set(rooms_with_first_director.values_list('id', flat=True))
        self.assertEqual(len(unique_room_ids), 1)

    def test_non_partner_gets_empty_chat_room_list(self):
        self.api_client.force_authenticate(user=self.client_user)

        response = self.api_client.get('/api/partners/chat-rooms/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._items(response.json()), [])

    def test_partner_can_send_message_to_own_dialog(self):
        room = PartnerChatRoom.objects.create(
            name='Director dialog',
            description='Директор',
            room_type='private',
            created_by=self.partner_user,
        )
        room.members.add(self.partner_user, self.director_one)
        self.api_client.force_authenticate(user=self.partner_user)

        response = self.api_client.post(
            f'/api/partners/chat-rooms/{room.id}/send_message/',
            {'message': 'Здравствуйте, директор'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            PartnerChatMessage.objects.filter(
                room=room,
                sender=self.partner_user,
                message='Здравствуйте, директор',
                is_system=False,
            ).exists()
        )

    def test_send_message_requires_non_empty_text(self):
        room = PartnerChatRoom.objects.create(
            name='Director dialog',
            description='Директор',
            room_type='private',
            created_by=self.partner_user,
        )
        room.members.add(self.partner_user, self.director_one)
        self.api_client.force_authenticate(user=self.partner_user)

        response = self.api_client.post(
            f'/api/partners/chat-rooms/{room.id}/send_message/',
            {'message': ''},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_partner_can_read_dialog_messages(self):
        room = PartnerChatRoom.objects.create(
            name='Director dialog',
            description='Директор',
            room_type='private',
            created_by=self.partner_user,
        )
        room.members.add(self.partner_user, self.director_one)
        message = PartnerChatMessage.objects.create(
            room=room,
            sender=self.director_one,
            message='Добрый день',
        )
        self.api_client.force_authenticate(user=self.partner_user)

        response = self.api_client.get(f'/api/partners/chat-rooms/{room.id}/messages/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]['id'], message.id)
        self.assertEqual(payload[0]['text'], 'Добрый день')

    def test_partner_can_leave_dialog_and_loses_access_to_it(self):
        room = PartnerChatRoom.objects.create(
            name='Director dialog',
            description='Директор',
            room_type='private',
            created_by=self.partner_user,
        )
        room.members.add(self.partner_user, self.director_one)
        self.api_client.force_authenticate(user=self.partner_user)

        leave_response = self.api_client.post(f'/api/partners/chat-rooms/{room.id}/leave_room/', {}, format='json')
        self.assertEqual(leave_response.status_code, status.HTTP_200_OK)
        room.refresh_from_db()
        self.assertFalse(room.members.filter(id=self.partner_user.id).exists())

        messages_response = self.api_client.get(f'/api/partners/chat-rooms/{room.id}/messages/')
        self.assertEqual(messages_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_partner_can_upload_file_to_dialog(self):
        room = PartnerChatRoom.objects.create(
            name='Director dialog',
            description='Директор',
            room_type='private',
            created_by=self.partner_user,
        )
        room.members.add(self.partner_user, self.director_one)
        self.api_client.force_authenticate(user=self.partner_user)
        upload = SimpleUploadedFile('brief.txt', b'partner file upload', content_type='text/plain')

        response = self.api_client.post(
            f'/api/partners/chat-rooms/{room.id}/upload_file/',
            {'file': upload},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['filename'], 'brief.txt')
        self.assertTrue(
            PartnerChatMessage.objects.filter(
                room=room,
                sender=self.partner_user,
                message__contains='brief.txt',
            ).exists()
        )
