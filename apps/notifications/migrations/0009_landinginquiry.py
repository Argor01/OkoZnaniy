from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [('notifications', '0008_externaldelivery')]
    operations = [migrations.CreateModel(name='LandingInquiry', fields=[
        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
        ('kind', models.CharField(max_length=20, choices=[('vacancy', 'Вакансия'), ('agency', 'Агентство')])),
        ('vacancy', models.CharField(max_length=100, blank=True)),
        ('name', models.CharField(max_length=120)),
        ('phone', models.CharField(max_length=40, blank=True)),
        ('email', models.EmailField(max_length=254, blank=True)),
        ('message', models.TextField(blank=True)),
        ('consent', models.BooleanField(default=False)),
        ('created_at', models.DateTimeField(auto_now_add=True)),
        ('emailed_at', models.DateTimeField(null=True, blank=True)),
        ('processed', models.BooleanField(default=False))
    ], options={'ordering': ['-created_at'], 'verbose_name': 'Заявка с сайта', 'verbose_name_plural': 'Заявки с сайта'})]
