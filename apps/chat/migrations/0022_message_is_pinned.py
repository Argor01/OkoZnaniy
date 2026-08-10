from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [("chat", "0021_chatpin")]
    operations = [migrations.AddField(model_name="message", name="is_pinned", field=models.BooleanField(default=False, verbose_name="Закреплено"))]
