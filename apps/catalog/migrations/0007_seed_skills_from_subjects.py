from django.db import migrations


def forwards(apps, schema_editor):
    Subject = apps.get_model('catalog', 'Subject')
    Skill = apps.get_model('catalog', 'Skill')

    for subject in Subject.objects.all().only('name'):
        name = (subject.name or '').strip()
        if not name:
            continue
        if Skill.objects.filter(name__iexact=name).exists():
            continue
        Skill.objects.create(name=name)


def backwards(apps, schema_editor):
    # Не удаляем навыки при откате миграции, чтобы не потерять пользовательские данные
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0006_skill'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
