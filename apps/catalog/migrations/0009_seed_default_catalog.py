"""
Idempotent seed migration that populates the catalog tables (subject categories,
subjects, work types) when they are empty. Without this, fresh installs and
recreated databases end up with empty subject/work-type dropdowns in the UI
("список предметов слетел").
"""
from django.db import migrations
from django.core.management import call_command


def seed_catalog(apps, schema_editor):
    SubjectCategory = apps.get_model('catalog', 'SubjectCategory')
    Subject = apps.get_model('catalog', 'Subject')
    WorkType = apps.get_model('catalog', 'WorkType')

    needs_categories = not SubjectCategory.objects.exists()
    needs_subjects = not Subject.objects.exists()
    needs_work_types = not WorkType.objects.exists()

    if needs_categories or needs_subjects:
        try:
            call_command('populate_catalog')
        except Exception as exc:
            print(f"populate_catalog failed (non-fatal): {exc}")
    if needs_work_types:
        try:
            call_command('create_default_work_types')
        except Exception as exc:
            print(f"create_default_work_types failed (non-fatal): {exc}")


def reverse_noop(apps, schema_editor):
    # Не удаляем данные при откате миграции — это пользовательский справочник.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0008_add_unique_constraint_to_subject_name'),
    ]

    operations = [
        migrations.RunPython(seed_catalog, reverse_noop),
    ]
