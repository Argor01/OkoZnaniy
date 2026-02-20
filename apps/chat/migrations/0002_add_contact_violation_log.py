# Generated migration for contact violation logging

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('chat', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ContactViolationLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('violation_text', models.TextField(verbose_name='Текст нарушения')),
                ('detected_at', models.DateTimeField(auto_now_add=True, verbose_name='Дата обнаружения')),
                ('action_taken', models.CharField(
                    choices=[
                        ('warning', 'Предупреждение'),
                        ('ban', 'Бан'),
                        ('message_blocked', 'Сообщение заблокировано'),
                    ],
                    max_length=20,
                    verbose_name='Принятое действие'
                )),
                ('notes', models.TextField(blank=True, null=True, verbose_name='Заметки')),
                ('chat', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='violations',
                    to='chat.chat',
                    verbose_name='Чат'
                )),
                ('message', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='violations',
                    to='chat.message',
                    verbose_name='Сообщение'
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='contact_violations',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Пользователь'
                )),
            ],
            options={
                'verbose_name': 'Лог нарушения обмена контактами',
                'verbose_name_plural': 'Логи нарушений обмена контактами',
                'ordering': ['-detected_at'],
            },
        ),
    ]
