from django.db import models
from django.utils.text import slugify

class StaticPage(models.Model):
    """Модель для статических страниц (О нас, Контакты, и т.д.)"""
    title = models.CharField("Заголовок", max_length=200)
    slug = models.SlugField("URL", unique=True)
    content = models.TextField("Содержание")
    meta_description = models.TextField("META описание", blank=True)
    is_published = models.BooleanField("Опубликовано", default=True)
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)

    class Meta:
        verbose_name = "Статическая страница"
        verbose_name_plural = "Статические страницы"
        ordering = ['title']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

class FAQCategory(models.Model):
    """Категории вопросов FAQ"""
    name = models.CharField("Название", max_length=100)
    slug = models.SlugField("URL", unique=True)
    order = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        verbose_name = "Категория FAQ"
        verbose_name_plural = "Категории FAQ"
        ordering = ['order', 'name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

class FAQ(models.Model):
    """Часто задаваемые вопросы"""
    category = models.ForeignKey(FAQCategory, on_delete=models.CASCADE, related_name='questions', verbose_name="Категория")
    question = models.CharField("Вопрос", max_length=500)
    answer = models.TextField("Ответ")
    is_published = models.BooleanField("Опубликовано", default=True)
    order = models.PositiveIntegerField("Порядок", default=0)
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)

    class Meta:
        verbose_name = "Вопрос"
        verbose_name_plural = "Вопросы"
        ordering = ['category', 'order']

    def __str__(self):
        return self.question

class Contact(models.Model):
    """Обращения через форму обратной связи"""
    name = models.CharField("Имя", max_length=100)
    email = models.EmailField("Email")
    phone = models.CharField("Телефон", max_length=20, blank=True)
    subject = models.CharField("Тема", max_length=200)
    message = models.TextField("Сообщение")
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    processed = models.BooleanField("Обработано", default=False)
    processed_at = models.DateTimeField("Дата обработки", null=True, blank=True)
    processed_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Кто обработал")
    notes = models.TextField("Заметки", blank=True)

    class Meta:
        verbose_name = "Обращение"
        verbose_name_plural = "Обращения"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.subject} от {self.name}"
