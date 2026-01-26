from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("chat", "0004_chat_per_order_participants"),
    ]

    operations = [
        migrations.AlterField(
            model_name="chat",
            name="order",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="chats",
                to="orders.order",
            ),
        ),
    ]
