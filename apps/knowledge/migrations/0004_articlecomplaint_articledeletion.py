import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('knowledge', '0003_article_articlefile_v2'),
        ('admin_panel', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ArticleComplaint',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('article_title', models.CharField(blank=True, default='', max_length=300, verbose_name='Название статьи')),
                ('reason', models.CharField(choices=[('spam', 'Спам'), ('inappropriate', 'Неприемлемый контент'), ('copyright', 'Нарушение авторских прав'), ('misinformation', 'Недостоверная информация'), ('other', 'Другое')], default='other', max_length=30, verbose_name='Причина')),
                ('description', models.TextField(verbose_name='Описание жалобы')),
                ('status', models.CharField(choices=[('pending', 'На рассмотрении'), ('reviewed', 'Рассмотрена'), ('rejected', 'Отклонена'), ('article_deleted', 'Статья удалена')], default='pending', max_length=20, verbose_name='Статус')),
                ('admin_response', models.TextField(blank=True, default='', verbose_name='Ответ администратора')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Дата обновления')),
                ('article', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='complaints', to='knowledge.article', verbose_name='Статья')),
                ('complainant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='article_complaints', to=settings.AUTH_USER_MODEL, verbose_name='Жалобщик')),
                ('claim', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='article_complaints', to='admin_panel.claim', verbose_name='Обращение')),
            ],
            options={
                'verbose_name': 'Жалоба на статью',
                'verbose_name_plural': 'Жалобы на статьи',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ArticleDeletion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('article_title', models.CharField(max_length=300, verbose_name='Название статьи')),
                ('article_description', models.TextField(blank=True, default='', verbose_name='Описание статьи')),
                ('article_work_type', models.CharField(blank=True, default='', max_length=200, verbose_name='Тип работы')),
                ('article_subject', models.CharField(blank=True, default='', max_length=200, verbose_name='Предмет')),
                ('reason', models.TextField(verbose_name='Причина удаления')),
                ('status', models.CharField(choices=[('deleted', 'Удалена'), ('disputed', 'Оспаривается'), ('upheld', 'Подтверждено'), ('restored', 'Восстановлена')], default='deleted', max_length=20, verbose_name='Статус')),
                ('dispute_message', models.TextField(blank=True, default='', verbose_name='Оспаривание')),
                ('admin_final_response', models.TextField(blank=True, default='', verbose_name='Итоговый ответ')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Дата удаления')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Дата обновления')),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='deleted_articles', to=settings.AUTH_USER_MODEL, verbose_name='Автор статьи')),
                ('deleted_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='articles_deleted_by_me', to=settings.AUTH_USER_MODEL, verbose_name='Удалил')),
                ('complaint', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='deletion', to='knowledge.articlecomplaint', verbose_name='Жалоба')),
            ],
            options={
                'verbose_name': 'Удаление статьи',
                'verbose_name_plural': 'Удаления статей',
                'ordering': ['-created_at'],
            },
        ),
    ]
