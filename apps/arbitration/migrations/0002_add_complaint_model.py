# Generated migration for Complaint model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('arbitration', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('orders', '0015_bid_prepayment_percent'),
    ]

    operations = [
        migrations.CreateModel(
            name='Complaint',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('complaint_type', models.CharField(choices=[('not_completed', 'Заказ не выполнен'), ('poor_quality', 'Заказ выполнен некачественно'), ('not_paid', 'Заказ не оплачен'), ('unjustified_review', 'Необоснованный отзыв'), ('ready_works_shop', 'Магазин готовых работ'), ('other', 'Другое')], max_length=50, verbose_name='Тип претензии')),
                ('is_order_relevant', models.BooleanField(default=True, verbose_name='Заказ актуален')),
                ('relevant_until', models.DateTimeField(blank=True, null=True, verbose_name='Актуален до')),
                ('financial_requirement', models.CharField(choices=[('prepayment_refund', 'Возврат предоплаты'), ('prepayment_refund_plus_penalty', 'Возврат предоплаты и неустойка'), ('no_refund', 'Возврат не требуется')], max_length=50, verbose_name='Финансовые требования')),
                ('refund_percent', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True, verbose_name='Процент возврата')),
                ('description', models.TextField(verbose_name='Описание')),
                ('status', models.CharField(choices=[('open', 'Открыт'), ('in_progress', 'В работе'), ('resolved', 'Решён'), ('closed', 'Закрыт')], default='open', max_length=20, verbose_name='Статус')),
                ('resolution', models.TextField(blank=True, verbose_name='Резолюция')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Создано')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Обновлено')),
                ('resolved_at', models.DateTimeField(blank=True, null=True, verbose_name='Разрешено')),
                ('chat_id', models.IntegerField(blank=True, null=True, verbose_name='ID чата')),
                ('defendant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='defendant_complaints', to=settings.AUTH_USER_MODEL, verbose_name='Ответчик')),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='complaints', to='orders.order', verbose_name='Заказ')),
                ('plaintiff', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='plaintiff_complaints', to=settings.AUTH_USER_MODEL, verbose_name='Истец')),
            ],
            options={
                'verbose_name': 'Претензия',
                'verbose_name_plural': 'Претензии',
                'db_table': 'arbitration_complaints',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='complaint',
            index=models.Index(fields=['status', '-created_at'], name='arb_complaint_status_idx'),
        ),
        migrations.AddIndex(
            model_name='complaint',
            index=models.Index(fields=['order', 'status'], name='arb_complaint_order_status_idx'),
        ),
        migrations.AddIndex(
            model_name='complaint',
            index=models.Index(fields=['plaintiff', '-created_at'], name='arb_complaint_plaintiff_idx'),
        ),
        migrations.AddIndex(
            model_name='complaint',
            index=models.Index(fields=['defendant', '-created_at'], name='arb_complaint_defendant_idx'),
        ),
    ]
