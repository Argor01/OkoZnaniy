from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0016_merge_20260330_0341'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='blocked_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Дата блокировки'),
        ),
        migrations.AddField(
            model_name='user',
            name='block_reason',
            field=models.TextField(blank=True, null=True, verbose_name='Причина блокировки'),
        ),
        migrations.AddField(
            model_name='user',
            name='unblock_date',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Дата разблокировки'),
        ),
        migrations.AddField(
            model_name='user',
            name='blocked_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, related_name='blocked_users_by_admin', to='users.user', verbose_name='Кто заблокировал'),
        ),
    ]
