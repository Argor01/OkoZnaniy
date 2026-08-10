from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("orders", "0034_client_review")]
    operations = [
        migrations.AddField(
            model_name="orderfile",
            name="client_downloaded_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Скачан клиентом"),
        ),
    ]
