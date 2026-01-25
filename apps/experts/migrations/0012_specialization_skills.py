from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('experts', '0011_specialization_custom_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='specialization',
            name='skills',
            field=models.TextField(blank=True, null=True, verbose_name='Навыки'),
        ),
    ]
