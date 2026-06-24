from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("shop", "0004_favoritework"),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name="purchase",
            unique_together=set(),
        ),
    ]
