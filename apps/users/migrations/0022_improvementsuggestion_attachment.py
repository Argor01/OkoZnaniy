from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0021_user_has_custom_username'),
    ]

    operations = [
        migrations.AddField(
            model_name='improvementsuggestion',
            name='attachment',
            field=models.FileField(blank=True, null=True, upload_to='improvements/'),
        ),
    ]