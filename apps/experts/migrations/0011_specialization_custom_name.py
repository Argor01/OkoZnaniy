
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("experts", "0010_alter_specialization_unique_together_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="specialization",
            name="custom_name",
            field=models.CharField(
                blank=True,
                null=True,
                max_length=255,
                verbose_name="Название специализации",
                help_text="Укажите название специализации, если оно отличается от названия предмета",
            ),
        ),
    ]
