from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0017_add_client_note_to_order'),
    ]

    operations = [
        migrations.AddField(
            model_name='orderfile',
            name='expert_viewed_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Просмотрен экспертом'),
        ),
    ]
