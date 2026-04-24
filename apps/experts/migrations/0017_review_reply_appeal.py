from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('experts', '0016_alter_expertapplication_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='expertreview',
            name='reply_text',
            field=models.TextField(blank=True, default='', verbose_name='Ответ эксперта'),
        ),
        migrations.AddField(
            model_name='expertreview',
            name='reply_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Дата ответа эксперта'),
        ),
        migrations.AddField(
            model_name='expertreview',
            name='is_appealed',
            field=models.BooleanField(default=False, verbose_name='Обжалован'),
        ),
        migrations.AddField(
            model_name='expertreview',
            name='appeal_reason',
            field=models.TextField(blank=True, default='', verbose_name='Причина обжалования'),
        ),
        migrations.AddField(
            model_name='expertreview',
            name='appeal_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Дата обжалования'),
        ),
        migrations.AddField(
            model_name='expertreview',
            name='appeal_resolved',
            field=models.BooleanField(default=False, verbose_name='Обжалование рассмотрено'),
        ),
        migrations.AddField(
            model_name='expertreview',
            name='appeal_resolution',
            field=models.TextField(blank=True, default='', verbose_name='Решение по обжалованию'),
        ),
        migrations.AddField(
            model_name='expertrating',
            name='reply_text',
            field=models.TextField(blank=True, default='', verbose_name='Ответ эксперта'),
        ),
        migrations.AddField(
            model_name='expertrating',
            name='reply_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Дата ответа эксперта'),
        ),
        migrations.AddField(
            model_name='expertrating',
            name='is_appealed',
            field=models.BooleanField(default=False, verbose_name='Обжалован'),
        ),
        migrations.AddField(
            model_name='expertrating',
            name='appeal_reason',
            field=models.TextField(blank=True, default='', verbose_name='Причина обжалования'),
        ),
        migrations.AddField(
            model_name='expertrating',
            name='appeal_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Дата обжалования'),
        ),
        migrations.AddField(
            model_name='expertrating',
            name='appeal_resolved',
            field=models.BooleanField(default=False, verbose_name='Обжалование рассмотрено'),
        ),
        migrations.AddField(
            model_name='expertrating',
            name='appeal_resolution',
            field=models.TextField(blank=True, default='', verbose_name='Решение по обжалованию'),
        ),
    ]
