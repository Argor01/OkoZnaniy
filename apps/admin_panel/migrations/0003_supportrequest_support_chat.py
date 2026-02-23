# Generated manually

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0012_contactviolationlog_chat_contac_user_id_f5486d_idx_and_more'),
        ('admin_panel', '0002_claim_priority_claimmessage'),
    ]

    operations = [
        migrations.AddField(
            model_name='supportrequest',
            name='support_chat',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='support_request', to='chat.supportchat', verbose_name='Чат поддержки'),
        ),
    ]
