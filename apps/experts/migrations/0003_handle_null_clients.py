from django.db import migrations

def handle_null_clients(apps, schema_editor):
    ExpertReview = apps.get_model('experts', 'ExpertReview')
    for review in ExpertReview.objects.filter(client__isnull=True):
        if review.order and review.order.client:
            review.client = review.order.client
            review.save()
        else:
            review.delete()  # Удаляем отзывы без клиента и заказа

class Migration(migrations.Migration):
    dependencies = [
        ('experts', '0002_alter_expertreview_options_and_more'),
    ]

    operations = [
        migrations.RunPython(handle_null_clients),
    ] 