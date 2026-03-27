from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0013_user_city'),
    ]

    operations = [
        migrations.CreateModel(
            name='ImprovementSuggestion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('area', models.CharField(choices=[('ui_ux', 'Интерфейс и удобство'), ('functionality', 'Функциональность'), ('performance', 'Производительность'), ('content', 'Контент'), ('support', 'Поддержка'), ('other', 'Другое')], max_length=32, verbose_name='Область улучшения')),
                ('comment', models.TextField(verbose_name='Комментарий')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='improvement_suggestions', to=settings.AUTH_USER_MODEL, verbose_name='Пользователь')),
            ],
            options={
                'verbose_name': 'Рекомендация по улучшению',
                'verbose_name_plural': 'Рекомендации по улучшению',
                'ordering': ['-created_at'],
            },
        ),
    ]
