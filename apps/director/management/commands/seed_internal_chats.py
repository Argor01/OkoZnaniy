from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.director.models import DirectorChatMessage, DirectorChatRoom
from apps.partners.models import PartnerChatMessage, PartnerChatRoom


class Command(BaseCommand):
    help = 'Create demo internal chats for manual communication testing.'

    def handle(self, *args, **options):
        User = get_user_model()

        admin = self._user(User, 'demo_admin_chat', 'admin', 'Администратор', 'Тестовый')
        director = self._user(User, 'demo_director_chat', 'director', 'Директор', 'Тестовый')
        partner = self._user(User, 'demo_partner_chat', 'partner', 'Партнер', 'Тестовый')
        expert = self._user(User, 'demo_expert_chat', 'expert', 'Эксперт', 'Тестовый')
        client = self._user(User, 'demo_client_chat', 'client', 'Клиент', 'Тестовый')

        director_room, _ = DirectorChatRoom.objects.get_or_create(
            name='Тест: админ, директор и эксперт',
            defaults={
                'description': 'Комната для проверки внутренней коммуникации администратора, директора и эксперта.',
                'room_type': 'project',
                'created_by': director,
                'is_active': True,
            },
        )
        director_room.members.add(admin, director, expert)
        self._seed_director_messages(
            director_room,
            [
                (director, 'Проверяем общий рабочий чат директора и администратора.'),
                (admin, 'Сообщение администратора видно всем участникам комнаты.'),
                (expert, 'Эксперт тоже подключен к тестовой коммуникации.'),
            ],
        )

        support_room, _ = DirectorChatRoom.objects.get_or_create(
            name='Тест: клиент и поддержка',
            defaults={
                'description': 'Комната для проверки связи клиента с поддержкой и директором.',
                'room_type': 'department',
                'created_by': admin,
                'is_active': True,
            },
        )
        support_room.members.add(admin, director, client)
        self._seed_director_messages(
            support_room,
            [
                (client, 'Клиент оставил тестовое обращение во внутреннюю коммуникацию.'),
                (admin, 'Администратор отвечает клиенту.'),
                (director, 'Директор видит историю и может подключиться.'),
            ],
        )

        partner_room, _ = PartnerChatRoom.objects.get_or_create(
            name='Тест: партнерская коммуникация',
            defaults={
                'description': 'Комната для проверки общения партнера, директора и администратора.',
                'room_type': 'general',
                'created_by': partner,
                'is_active': True,
            },
        )
        partner_room.members.add(partner, director, admin)
        self._seed_partner_messages(
            partner_room,
            [
                (partner, 'Партнер проверяет чат с командой платформы.'),
                (admin, 'Администратор видит сообщение партнера.'),
                (director, 'Директор подтверждает, что коммуникация работает.'),
            ],
        )

        self.stdout.write(self.style.SUCCESS('Тестовые внутренние чаты созданы или уже существовали.'))

    def _user(self, User, username, role, first_name, last_name):
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': f'{username}@okoznaniy.test',
                'role': role,
                'first_name': first_name,
                'last_name': last_name,
                'is_active': True,
            },
        )
        changed = False
        for field, value in {
            'role': role,
            'first_name': first_name,
            'last_name': last_name,
            'email': user.email or f'{username}@okoznaniy.test',
            'is_active': True,
        }.items():
            if getattr(user, field) != value:
                setattr(user, field, value)
                changed = True
        if created:
            user.set_password('test12345')
            changed = True
        if changed:
            user.save()
        return user

    def _seed_director_messages(self, room, messages):
        if room.messages.exists():
            return
        for sender, text in messages:
            DirectorChatMessage.objects.create(room=room, sender=sender, message=text)

    def _seed_partner_messages(self, room, messages):
        if room.messages.exists():
            return
        for sender, text in messages:
            PartnerChatMessage.objects.create(room=room, sender=sender, message=text)
