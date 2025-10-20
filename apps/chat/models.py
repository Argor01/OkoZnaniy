# Create your models here.
from django.db import models
from django.conf import settings
from rest_framework.exceptions import ValidationError

from apps.orders.models import Order

class Chat(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE)
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL)

    def __str__(self):
        return f"Чат по заказу #{self.order.id}"

class Message(models.Model):
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        import re
        if re.search(r"(?:@|\+7|https?://|\d{9,})", self.text, re.I):
            raise ValidationError("Контактные данные запрещены в чате.")

    def __str__(self):
        return f"{self.sender.username}: {self.text[:30]}"
