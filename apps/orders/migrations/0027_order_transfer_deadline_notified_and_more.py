from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0026_order_is_ready_work_purchase_order_transfer_deadline_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='transfer_deadline_notified_at',
            field=models.DateTimeField(blank=True, help_text="Чтобы не дублировать уведомление эксперту «таймер истёк, клиент может отменить» от периодической задачи", null=True, verbose_name='Когда эксперту ушло уведомление «таймер истёк, клиент может отменить»'),
        ),
        migrations.AddField(
            model_name='order',
            name='auto_bad_review_issued',
            field=models.BooleanField(default=False, help_text='Выставляется, когда клиент отменил заказ после истечения таймера передачи готовой работы', verbose_name='Авто-отзыв 1★ уже выставлен'),
        ),
    ]