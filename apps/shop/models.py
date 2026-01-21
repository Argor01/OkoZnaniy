from django.db import models
from django.conf import settings
from apps.catalog.models import Subject, WorkType


class ReadyWork(models.Model):
    """Модель готовой работы для продажи в магазине"""
    
    title = models.CharField("Название", max_length=200)
    description = models.TextField("Описание")
    price = models.DecimalField("Цена", max_digits=10, decimal_places=2)
    
    # Связи с каталогом
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        verbose_name="Предмет"
    )
    work_type = models.ForeignKey(
        WorkType,
        on_delete=models.CASCADE,
        verbose_name="Тип работы"
    )
    
    # Автор работы
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        verbose_name="Автор",
        related_name="ready_works"
    )
    
    # Превью работы
    preview = models.TextField("Превью работы", blank=True)
    
    # Статус
    is_active = models.BooleanField("Активна", default=True)
    
    # Временные метки
    created_at = models.DateTimeField("Создано", auto_now_add=True)
    updated_at = models.DateTimeField("Обновлено", auto_now=True)
    
    class Meta:
        verbose_name = "Готовая работа"
        verbose_name_plural = "Готовые работы"
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title


class ReadyWorkFile(models.Model):
    """Файлы готовой работы"""
    
    work = models.ForeignKey(
        ReadyWork,
        on_delete=models.CASCADE,
        related_name="files",
        verbose_name="Работа"
    )
    name = models.CharField("Название файла", max_length=255)
    file = models.FileField("Файл", upload_to="ready_works/")
    file_type = models.CharField("Тип файла", max_length=50, blank=True)
    file_size = models.PositiveIntegerField("Размер файла", default=0)
    
    created_at = models.DateTimeField("Создано", auto_now_add=True)
    
    class Meta:
        verbose_name = "Файл готовой работы"
        verbose_name_plural = "Файлы готовых работ"
    
    def __str__(self):
        return f"{self.work.title} - {self.name}"


class Purchase(models.Model):
    """Покупка готовой работы"""
    
    work = models.ForeignKey(
        ReadyWork,
        on_delete=models.CASCADE,
        verbose_name="Работа"
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        verbose_name="Покупатель",
        related_name="purchases"
    )
    price_paid = models.DecimalField("Оплаченная цена", max_digits=10, decimal_places=2)
    
    created_at = models.DateTimeField("Дата покупки", auto_now_add=True)
    
    class Meta:
        verbose_name = "Покупка"
        verbose_name_plural = "Покупки"
        unique_together = ['work', 'buyer']  # Один пользователь не может купить одну работу дважды
    
    def __str__(self):
        return f"{self.buyer.username} купил {self.work.title}"