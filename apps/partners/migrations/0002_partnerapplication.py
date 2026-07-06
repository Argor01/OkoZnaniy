from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('partners', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='PartnerApplication',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('full_name', models.CharField(max_length=255, verbose_name='ФИО')),
                ('email', models.EmailField(max_length=254, verbose_name='Email')),
                ('telegram', models.CharField(blank=True, default='', max_length=100, verbose_name='Telegram')),
                ('phone', models.CharField(blank=True, default='', max_length=32, verbose_name='Телефон')),
                ('comment', models.TextField(blank=True, default='', verbose_name='Комментарий')),
                ('status', models.CharField(choices=[('new', 'Новая'), ('contacted', 'Связались'), ('approved', 'Одобрена'), ('rejected', 'Отклонена')], default='new', max_length=20, verbose_name='Статус')),
                ('director_note', models.TextField(blank=True, default='', verbose_name='Заметка директора')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Дата обновления')),
                ('processed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='processed_partner_applications', to=settings.AUTH_USER_MODEL, verbose_name='Обработал')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='partner_applications', to=settings.AUTH_USER_MODEL, verbose_name='Пользователь')),
            ],
            options={
                'verbose_name': 'Заявка на партнёрство',
                'verbose_name_plural': 'Заявки на партнёрство',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='partnerapplication',
            index=models.Index(fields=['status', '-created_at'], name='partners_pa_status_idx'),
        ),
    ]
