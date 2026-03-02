# Generated migration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('experts', '0013_expertrating_updated_at_and_more'),
        ('catalog', '0008_add_unique_constraint_to_subject_name'),
    ]

    operations = [
        # Переименовываем старое поле
        migrations.RenameField(
            model_name='expertapplication',
            old_name='specializations',
            new_name='specializations_old',
        ),
        # Добавляем новое поле ManyToMany
        migrations.AddField(
            model_name='expertapplication',
            name='specializations',
            field=models.ManyToManyField(
                blank=True,
                related_name='expert_applications',
                to='catalog.subject',
                verbose_name='Специальности',
                help_text='Выберите предметы, по которым вы можете выполнять работы'
            ),
        ),
    ]
