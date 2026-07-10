from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0022_improvementsuggestion_attachment'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='max_id',
            field=models.BigIntegerField(blank=True, null=True),
        ),
    ]
