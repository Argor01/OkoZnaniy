import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.shop.models import ReadyWork
from django.contrib.auth import get_user_model

User = get_user_model()

print("--- Works ---")
for work in ReadyWork.objects.all():
    print(f"ID: {work.pk}, Title: {work.title}, Active: {work.is_active}, Subject: {work.subject.name}, Type: {work.work_type.name}, Author: {work.author.username}")

print("\n--- Users ---")
for user in User.objects.all():
    print(f"ID: {user.pk}, Username: {user.username}")
