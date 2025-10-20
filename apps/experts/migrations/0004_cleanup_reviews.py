from django.db import migrations

def cleanup_reviews(apps, schema_editor):
    ExpertReview = apps.get_model('experts', 'ExpertReview')
    # Удаляем все отзывы без клиента или заказа
    ExpertReview.objects.filter(client__isnull=True).delete()
    ExpertReview.objects.filter(order__isnull=True).delete()
    ExpertReview.objects.filter(comment__isnull=True).update(comment="")

class Migration(migrations.Migration):
    dependencies = [
        ('experts', '0003_handle_null_clients'),
    ]

    operations = [
        migrations.RunPython(cleanup_reviews),
    ] 