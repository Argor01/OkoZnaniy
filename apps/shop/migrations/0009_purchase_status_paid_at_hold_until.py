from django.db import migrations, models


def backfill_purchase_status(apps, schema_editor):
    Purchase = apps.get_model('shop', 'Purchase')
    Purchase.objects.update(status='paid')


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0008_readywork_moderation_status_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='purchase',
            name='status',
            field=models.CharField(
                choices=[('paid', 'Оплачена'), ('completed', 'Завершена'), ('refunded', 'Возврат'), ('disputed', 'Спор')],
                db_index=True,
                default='paid',
                max_length=20,
                verbose_name='Статус',
            ),
        ),
        migrations.AddField(
            model_name='purchase',
            name='paid_at',
            field=models.DateTimeField(auto_now_add=True, verbose_name='Дата оплаты'),
        ),
        migrations.AddField(
            model_name='purchase',
            name='hold_until',
            field=models.DateTimeField(
                help_text='До этой даты покупатель может открыть спор. После — средства переводятся эксперту.',
                verbose_name='Удержание до',
            ),
        ),
        migrations.RunPython(backfill_purchase_status, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='purchase',
            name='order',
        ),
    ]
