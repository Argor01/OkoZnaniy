# Generated migration for adding arbitration fields to Claim model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('admin_panel', '0008_migrate_admin_chats_to_director'),
        ('orders', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='claim',
            name='defendant',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='defendant_claims', to='admin_panel.user', verbose_name='Ответчик'),
        ),
        migrations.AddField(
            model_name='claim',
            name='plaintiff',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='plaintiff_claims', to='admin_panel.user', verbose_name='Истец'),
        ),
        migrations.AddField(
            model_name='claim',
            name='reason',
            field=models.CharField(choices=[('order_not_completed', 'Заказ не выполнен'), ('poor_quality', 'Низкое качество'), ('deadline_violation', 'Нарушение сроков'), ('contact_violation', 'Нарушение контактов'), ('other', 'Другое')], default='other', max_length=50, verbose_name='Причина претензии'),
        ),
        migrations.AddField(
            model_name='claim',
            name='refund_type',
            field=models.CharField(choices=[('full', 'Полный возврат'), ('partial', 'Частичный возврат'), ('none', 'Без возврата')], default='none', max_length=20, verbose_name='Тип возврата'),
        ),
        migrations.AddField(
            model_name='claim',
            name='refund_percentage',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5, verbose_name='Процент возврата'),
        ),
        migrations.AddField(
            model_name='claim',
            name='refund_amount',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True, verbose_name='Сумма возврата'),
        ),
    ]
