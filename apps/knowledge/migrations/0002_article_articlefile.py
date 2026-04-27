import apps.knowledge.models
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('knowledge', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Article',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=300, verbose_name='Название статьи')),
                ('description', models.TextField(verbose_name='Описание статьи')),
                ('work_type', models.CharField(blank=True, default='', max_length=200, verbose_name='Тип работы')),
                ('subject', models.CharField(blank=True, default='', max_length=200, verbose_name='Предмет')),
                ('views_count', models.PositiveIntegerField(default=0, verbose_name='Просмотры')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Дата обновления')),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='knowledge_articles', to=settings.AUTH_USER_MODEL, verbose_name='Автор')),
            ],
            options={
                'verbose_name': 'Статья',
                'verbose_name_plural': 'Статьи',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='article',
            index=models.Index(fields=['-created_at'], name='knowledge_a_created_idx'),
        ),
        migrations.AddIndex(
            model_name='article',
            index=models.Index(fields=['work_type'], name='knowledge_a_work_ty_idx'),
        ),
        migrations.AddIndex(
            model_name='article',
            index=models.Index(fields=['subject'], name='knowledge_a_subject_idx'),
        ),
        migrations.CreateModel(
            name='ArticleFile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(upload_to=apps.knowledge.models.article_file_upload_to, verbose_name='Файл')),
                ('original_name', models.CharField(max_length=300, verbose_name='Имя файла')),
                ('file_size', models.PositiveIntegerField(default=0, verbose_name='Размер')),
                ('uploaded_at', models.DateTimeField(auto_now_add=True, verbose_name='Дата загрузки')),
                ('article', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='files', to='knowledge.article', verbose_name='Статья')),
            ],
            options={
                'verbose_name': 'Файл статьи',
                'verbose_name_plural': 'Файлы статей',
            },
        ),
    ]
