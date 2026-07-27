from decimal import Decimal

from django.db import migrations


def compute_pending_balance(apps, schema_editor):
    from django.db.models import Sum

    User = apps.get_model('users', 'User')
    PartnerEarning = apps.get_model('users', 'PartnerEarning')

    for user in User.objects.filter(role='partner'):
        result = PartnerEarning.objects.filter(
            partner=user, is_paid=False
        ).aggregate(total=Sum('amount'))['total']

        pending = result or Decimal('0.00')
        User.objects.filter(pk=user.pk).update(pending_balance=pending)


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0025_add_pending_balance'),
    ]

    operations = [
        migrations.RunPython(compute_pending_balance, migrations.RunPython.noop),
    ]
