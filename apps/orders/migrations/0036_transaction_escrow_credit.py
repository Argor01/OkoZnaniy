
from django.db import migrations, models
class Migration(migrations.Migration):
    dependencies = [('orders', '0035_orderfile_client_downloaded_at')]
    operations = [migrations.AlterField(model_name='transaction', name='type',
        field=models.CharField(max_length=20, choices=[
            ('escrow_credit', 'Поступление в резерв'), ('hold', 'Заморозка'),
            ('release', 'Разморозка'), ('payout', 'Выплата'), ('commission', 'Комиссия'),
            ('refund', 'Возврат'), ('topup', 'Пополнение'), ('withdrawal', 'Вывод средств'),
            ('purchase', 'Покупка'), ('partner_payout', 'Выплата партнеру'),
            ('clawback', 'Списание по возврату')]))]
