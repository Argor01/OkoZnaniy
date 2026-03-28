# Generated migration to remove system messages from chats

from django.db import migrations


def remove_system_messages(apps, schema_editor):
    """Удаляем системные сообщения о присоединении/выходе из чата"""
    DirectorChatMessage = apps.get_model('director', 'DirectorChatMessage')
    
    # Удаляем все системные сообщения
    DirectorChatMessage.objects.filter(is_system=True).delete()


def reverse_migration(apps, schema_editor):
    """Обратная миграция не требуется"""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('director', '0005_alter_manualexpense_amount_alter_manualincome_amount'),
    ]

    operations = [
        migrations.RunPython(remove_system_messages, reverse_migration),
    ]
