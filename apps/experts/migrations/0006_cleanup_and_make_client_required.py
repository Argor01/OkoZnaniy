from django.db import migrations, models

def cleanup_reviews(apps, schema_editor):
    ExpertReview = apps.get_model('experts', 'ExpertReview')
    # Удаляем все отзывы без клиента
    ExpertReview.objects.filter(client__isnull=True).delete()

class Migration(migrations.Migration):
    dependencies = [
        ('experts', '0005_alter_expertdocument_created_at_and_more'),
    ]

    operations = [
        migrations.RunPython(cleanup_reviews),
        migrations.AlterField(
            model_name='expertreview',
            name='client',
            field=models.ForeignKey(
                on_delete=models.deletion.CASCADE,
                related_name='reviews_given',
                to='users.user',
                verbose_name='Клиент'
            ),
        ),
    ] 