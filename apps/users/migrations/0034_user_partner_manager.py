from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('users', '0033_user_registration_source')]
    operations = [migrations.AddField(
        model_name='user', name='partner_manager',
        field=models.ForeignKey(
            blank=True, null=True, limit_choices_to={'role': 'admin'},
            on_delete=django.db.models.deletion.SET_NULL,
            related_name='managed_partners', to=settings.AUTH_USER_MODEL,
            verbose_name='Менеджер партнера',
        ),
    )]
