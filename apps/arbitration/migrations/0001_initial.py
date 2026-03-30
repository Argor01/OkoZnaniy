# Generated migration for arbitration app

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import apps.arbitration.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('orders', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ArbitrationCase',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('case_number', models.CharField(default=apps.arbitration.models.generate_arbitration_number, max_length=20, unique=True, verbose_name='Номер дела')),
                ('reason', models.CharField(choices=[('order_not_completed', 'Заказ не выполнен'), ('poor_quality', 'Низкое качество работы'), ('deadline_violation', 'Нарушение сроков'), ('payment_dispute', 'Спор по оплате'), ('contract_violation', 'Нарушение условий договора'), ('other', 'Другое')], max_length=50, verbose_name='Причина обращения')),
                ('subject', models.CharField(max_length=255, verbose_name='Тема обращения')),
                ('description', models.TextField(verbose_name='Описание проблемы')),
                ('refund_type', models.CharField(choices=[('none', 'Без возврата'), ('partial', 'Частичный возврат'), ('full', 'Полный возврат')], default='none', max_length=20, verbose_name='Тип возврата')),
                ('requested_refund_percentage', models.DecimalField(decimal_places=2, default=0, max_digits=5, verbose_name='Запрошенный процент возврата')),
                ('requested_refund_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True, verbose_name='Запрошенная сумма возврата')),
                ('approved_refund_percentage', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True, verbose_name='Одобренный процент возврата')),
                ('approved_refund_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True, verbose_name='Одобренная сумма возврата')),
                ('status', models.CharField(choices=[('draft', 'Черновик'), ('submitted', 'Подано'), ('under_review', 'На рассмотрении'), ('awaiting_response', 'Ожидает ответа'), ('in_arbitration', 'В арбитраже'), ('decision_made', 'Решение принято'), ('closed', 'Закрыто'), ('rejected', 'Отклонено')], default='draft', max_length=30, verbose_name='Статус')),
                ('priority', models.CharField(choices=[('low', 'Низкий'), ('medium', 'Средний'), ('high', 'Высокий'), ('urgent', 'Срочный')], default='medium', max_length=20, verbose_name='Приоритет')),
                ('decision', models.TextField(blank=True, verbose_name='Решение арбитража')),
                ('decision_date', models.DateTimeField(blank=True, null=True, verbose_name='Дата решения')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Создано')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Обновлено')),
                ('submitted_at', models.DateTimeField(blank=True, null=True, verbose_name='Подано')),
                ('closed_at', models.DateTimeField(blank=True, null=True, verbose_name='Закрыто')),
                ('deadline_relevant', models.BooleanField(default=False, verbose_name='Актуальность сроков')),
                ('evidence_files', models.JSONField(blank=True, default=list, verbose_name='Файлы доказательств')),
                ('tags', models.TextField(blank=True, verbose_name='Теги')),
                ('assigned_admin', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assigned_arbitration_cases', to=settings.AUTH_USER_MODEL, verbose_name='Назначенный администратор')),
                ('assigned_users', models.ManyToManyField(blank=True, related_name='observed_arbitration_cases', to=settings.AUTH_USER_MODEL, verbose_name='Наблюдатели')),
                ('decision_made_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='arbitration_decisions', to=settings.AUTH_USER_MODEL, verbose_name='Решение принял')),
                ('defendant', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='defendant_cases', to=settings.AUTH_USER_MODEL, verbose_name='Ответчик')),
                ('order', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='arbitration_cases', to='orders.order', verbose_name='Связанный заказ')),
                ('plaintiff', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='plaintiff_cases', to=settings.AUTH_USER_MODEL, verbose_name='Истец')),
            ],
            options={
                'verbose_name': 'Арбитражное дело',
                'verbose_name_plural': 'Арбитражные дела',
                'db_table': 'arbitration_cases',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ArbitrationMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('message_type', models.CharField(choices=[('plaintiff', 'От истца'), ('defendant', 'От ответчика'), ('admin', 'От администратора'), ('system', 'Системное')], max_length=20, verbose_name='Тип сообщения')),
                ('text', models.TextField(verbose_name='Текст сообщения')),
                ('is_internal', models.BooleanField(default=False, verbose_name='Внутреннее (не видно сторонам)')),
                ('attachments', models.JSONField(blank=True, default=list, verbose_name='Вложения')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Создано')),
                ('case', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='arbitration.arbitrationcase', verbose_name='Дело')),
                ('sender', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL, verbose_name='Отправитель')),
            ],
            options={
                'verbose_name': 'Сообщение арбитража',
                'verbose_name_plural': 'Сообщения арбитража',
                'db_table': 'arbitration_messages',
                'ordering': ['created_at'],
            },
        ),
        migrations.CreateModel(
            name='ArbitrationActivity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('activity_type', models.CharField(choices=[('created', 'Дело создано'), ('submitted', 'Дело подано'), ('status_changed', 'Статус изменен'), ('priority_changed', 'Приоритет изменен'), ('admin_assigned', 'Назначен администратор'), ('observer_added', 'Добавлен наблюдатель'), ('observer_removed', 'Удален наблюдатель'), ('message_sent', 'Отправлено сообщение'), ('decision_made', 'Принято решение'), ('refund_processed', 'Оформлен возврат'), ('closed', 'Дело закрыто'), ('tag_added', 'Добавлен тег'), ('tag_removed', 'Удален тег')], max_length=30, verbose_name='Тип активности')),
                ('description', models.TextField(verbose_name='Описание')),
                ('metadata', models.JSONField(blank=True, default=dict, verbose_name='Метаданные')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Создано')),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL, verbose_name='Инициатор')),
                ('case', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='activities', to='arbitration.arbitrationcase', verbose_name='Дело')),
            ],
            options={
                'verbose_name': 'Активность арбитража',
                'verbose_name_plural': 'Активности арбитража',
                'db_table': 'arbitration_activities',
                'ordering': ['created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='arbitrationcase',
            index=models.Index(fields=['status', '-created_at'], name='arbitration_status_idx'),
        ),
        migrations.AddIndex(
            model_name='arbitrationcase',
            index=models.Index(fields=['plaintiff', '-created_at'], name='arbitration_plaintiff_idx'),
        ),
        migrations.AddIndex(
            model_name='arbitrationcase',
            index=models.Index(fields=['defendant', '-created_at'], name='arbitration_defendant_idx'),
        ),
        migrations.AddIndex(
            model_name='arbitrationcase',
            index=models.Index(fields=['assigned_admin', 'status'], name='arbitration_admin_status_idx'),
        ),
    ]
