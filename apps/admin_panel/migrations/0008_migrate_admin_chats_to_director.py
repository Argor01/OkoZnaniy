# Generated migration to sync admin and director chats

from django.db import migrations


def migrate_admin_chats_to_director(apps, schema_editor):
    """Переносим чаты администраторов в DirectorChatRoom"""
    AdminChatRoom = apps.get_model('admin_panel', 'AdminChatRoom')
    AdminChatMessage = apps.get_model('admin_panel', 'AdminChatMessage')
    DirectorChatRoom = apps.get_model('director', 'DirectorChatRoom')
    DirectorChatMessage = apps.get_model('director', 'DirectorChatMessage')
    
    # Переносим комнаты
    for admin_room in AdminChatRoom.objects.all():
        # Проверяем, не существует ли уже такая комната
        existing_room = DirectorChatRoom.objects.filter(name=admin_room.name).first()
        
        if existing_room:
            # Если комната уже существует, добавляем участников
            for member in admin_room.members.all():
                existing_room.members.add(member)
            director_room = existing_room
        else:
            # Создаем новую комнату
            director_room = DirectorChatRoom.objects.create(
                name=admin_room.name,
                description=admin_room.description,
                room_type='general',
                created_by=admin_room.created_by,
                created_at=admin_room.created_at,
                is_active=True
            )
            # Добавляем участников
            director_room.members.set(admin_room.members.all())
        
        # Переносим сообщения
        for admin_msg in admin_room.messages.all():
            # Проверяем, не существует ли уже такое сообщение
            if not DirectorChatMessage.objects.filter(
                room=director_room,
                sender=admin_msg.sender,
                message=admin_msg.message,
                created_at=admin_msg.created_at
            ).exists():
                DirectorChatMessage.objects.create(
                    room=director_room,
                    sender=admin_msg.sender,
                    message=admin_msg.message,
                    is_system=False,
                    is_pinned=False,
                    created_at=admin_msg.created_at
                )


def reverse_migration(apps, schema_editor):
    """Обратная миграция не требуется, так как мы не удаляем старые данные"""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('admin_panel', '0007_ticketactivity'),
        ('director', '0005_alter_manualexpense_amount_alter_manualincome_amount'),
    ]

    operations = [
        migrations.RunPython(migrate_admin_chats_to_director, reverse_migration),
    ]
