from django.db import migrations, models


def migrate_director_role_forward(apps, schema_editor):
    User = apps.get_model('users', 'User')
    User.objects.filter(email='director@test.com').update(role='director')
    User.objects.filter(username='director').update(role='director')


def migrate_director_role_backward(apps, schema_editor):
    User = apps.get_model('users', 'User')
    User.objects.filter(role='director', email='director@test.com').update(role='admin')
    User.objects.filter(role='director', username='director').update(role='admin')


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0009_alter_user_email'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('client', 'Client'),
                    ('expert', 'Expert'),
                    ('arbitrator', 'Arbitrator'),
                    ('admin', 'Admin'),
                    ('director', 'Director'),
                    ('partner', 'Partner'),
                ],
                default='client',
                max_length=20,
            ),
        ),
        migrations.RunPython(migrate_director_role_forward, migrate_director_role_backward),
    ]
