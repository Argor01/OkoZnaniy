# Generated migration for contact ban fields

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='is_banned_for_contacts',
            field=models.BooleanField(default=False, verbose_name='Забанен за обмен контактами'),
        ),
        migrations.AddField(
            model_name='user',
            name='contact_ban_reason',
            field=models.TextField(blank=True, null=True, verbose_name='Причина бана за контакты'),
        ),
        migrations.AddField(
            model_name='user',
            name='contact_ban_date',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Дата бана за контакты'),
        ),
        migrations.AddField(
            model_name='user',
            name='contact_violations_count',
            field=models.PositiveIntegerField(default=0, verbose_name='Количество нарушений'),
        ),
        migrations.AddField(
            model_name='user',
            name='banned_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='banned_users',
                to='users.user',
                verbose_name='Кто забанил'
            ),
        ),
    ]
