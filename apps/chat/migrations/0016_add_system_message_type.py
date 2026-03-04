# Generated manually for system message type

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0015_fix_contact_violation_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='message',
            name='message_type',
            field=models.CharField(
                choices=[
                    ('text', 'Текст'),
                    ('offer', 'Индивидуальное предложение'),
                    ('work_offer', 'Предложение готовой работы'),
                    ('work_delivery', 'Отправка готовой работы'),
                    ('system', 'Системное сообщение'),
                ],
                default='text',
                max_length=20,
                verbose_name='Тип сообщения'
            ),
        ),
    ]