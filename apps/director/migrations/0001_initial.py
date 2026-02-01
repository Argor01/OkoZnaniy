# Generated migration

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('orders', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='InternalMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.TextField(verbose_name='Текст сообщения')),
                ('claim_id', models.IntegerField(blank=True, help_text='Связанное обращение (если есть)', null=True, verbose_name='ID обращения')),
                ('priority', models.CharField(choices=[('low', 'Низкий'), ('medium', 'Средний'), ('high', 'Высокий')], default='medium', max_length=10, verbose_name='Приоритет')),
                ('is_read', models.BooleanField(default=False, verbose_name='Прочитано')),
                ('read_at', models.DateTimeField(blank=True, null=True, verbose_name='Время прочтения')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Дата обновления')),
                ('order', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='internal_messages', to='orders.order', verbose_name='Связанный заказ')),
                ('recipient', models.ForeignKey(blank=True, help_text='Если не указан, сообщение видно всем арбитрам/директорам', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='received_internal_messages', to=settings.AUTH_USER_MODEL, verbose_name='Получатель')),
                ('sender', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sent_internal_messages', to=settings.AUTH_USER_MODEL, verbose_name='Отправитель')),
            ],
            options={
                'verbose_name': 'Внутреннее сообщение',
                'verbose_name_plural': 'Внутренние сообщения',
                'db_table': 'director_internal_messages',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='InternalMessageAttachment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(upload_to='internal_messages/%Y/%m/%d/', verbose_name='Файл')),
                ('filename', models.CharField(max_length=255, verbose_name='Имя файла')),
                ('file_size', models.IntegerField(verbose_name='Размер файла (байты)')),
                ('uploaded_at', models.DateTimeField(auto_now_add=True, verbose_name='Дата загрузки')),
                ('message', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attachments', to='director.internalmessage', verbose_name='Сообщение')),
            ],
            options={
                'verbose_name': 'Вложение к сообщению',
                'verbose_name_plural': 'Вложения к сообщениям',
                'db_table': 'director_internal_message_attachments',
                'ordering': ['-uploaded_at'],
            },
        ),
        migrations.AddIndex(
            model_name='internalmessage',
            index=models.Index(fields=['-created_at'], name='director_in_created_idx'),
        ),
        migrations.AddIndex(
            model_name='internalmessage',
            index=models.Index(fields=['sender', '-created_at'], name='director_in_sender_idx'),
        ),
        migrations.AddIndex(
            model_name='internalmessage',
            index=models.Index(fields=['recipient', '-created_at'], name='director_in_recipie_idx'),
        ),
        migrations.AddIndex(
            model_name='internalmessage',
            index=models.Index(fields=['is_read'], name='director_in_is_read_idx'),
        ),
        migrations.AddIndex(
            model_name='internalmessage',
            index=models.Index(fields=['claim_id'], name='director_in_claim_i_idx'),
        ),
    ]
