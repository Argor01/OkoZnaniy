from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [('users', '0032_user_test_payments_allowed')]
    operations = [migrations.AddField(
        model_name='user', name='registration_source',
        field=models.CharField(default='unknown', editable=False, max_length=32, verbose_name='Способ регистрации'),
    )]
