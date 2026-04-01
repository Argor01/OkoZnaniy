from django.db import models
from django.conf import settings


class Question(models.Model):
    """Вопрос в Портале Знаний"""
    
    STATUS_CHOICES = [
        ('open', 'Открыт'),
        ('answered', 'Есть ответы'),
        ('closed', 'Закрыт'),
    ]
    
    title = models.CharField('Заголовок', max_length=200)
    description = models.TextField('Описание')
    category = models.CharField('Категория', max_length=100)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='knowledge_questions',
        verbose_name='Автор'
    )
    status = models.CharField(
        'Статус',
        max_length=20,
        choices=STATUS_CHOICES,
        default='open'
    )
    views_count = models.IntegerField('Количество просмотров', default=0)
    created_at = models.DateTimeField('Дата создания', auto_now_add=True)
    updated_at = models.DateTimeField('Дата обновления', auto_now=True)
    
    class Meta:
        verbose_name = 'Вопрос'
        verbose_name_plural = 'Вопросы'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['category']),
        ]
    
    def __str__(self):
        return self.title


class QuestionTag(models.Model):
    """Тег для вопроса"""
    
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='tags',
        verbose_name='Вопрос'
    )
    name = models.CharField('Название тега', max_length=50)
    
    class Meta:
        verbose_name = 'Тег вопроса'
        verbose_name_plural = 'Теги вопросов'
        unique_together = ['question', 'name']
    
    def __str__(self):
        return self.name


class Answer(models.Model):
    """Ответ на вопрос"""
    
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='answers',
        verbose_name='Вопрос'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='knowledge_answers',
        verbose_name='Автор'
    )
    content = models.TextField('Содержание ответа')
    is_best_answer = models.BooleanField('Лучший ответ', default=False)
    likes_count = models.IntegerField('Количество лайков', default=0)
    created_at = models.DateTimeField('Дата создания', auto_now_add=True)
    updated_at = models.DateTimeField('Дата обновления', auto_now=True)
    
    class Meta:
        verbose_name = 'Ответ'
        verbose_name_plural = 'Ответы'
        ordering = ['-is_best_answer', '-created_at']
        indexes = [
            models.Index(fields=['question', '-created_at']),
        ]
    
    def __str__(self):
        return f'Ответ от {self.author.username} на "{self.question.title}"'


class AnswerLike(models.Model):
    """Лайк ответа"""
    
    answer = models.ForeignKey(
        Answer,
        on_delete=models.CASCADE,
        related_name='likes',
        verbose_name='Ответ'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='answer_likes',
        verbose_name='Пользователь'
    )
    created_at = models.DateTimeField('Дата создания', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Лайк ответа'
        verbose_name_plural = 'Лайки ответов'
        unique_together = ['answer', 'user']
    
    def __str__(self):
        return f'{self.user.username} лайкнул ответ {self.answer.id}'


class QuestionView(models.Model):
    """Просмотр вопроса"""
    
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='views',
        verbose_name='Вопрос'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='question_views',
        verbose_name='Пользователь',
        null=True,
        blank=True
    )
    ip_address = models.GenericIPAddressField('IP адрес', null=True, blank=True)
    created_at = models.DateTimeField('Дата просмотра', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Просмотр вопроса'
        verbose_name_plural = 'Просмотры вопросов'
        indexes = [
            models.Index(fields=['question', 'user']),
            models.Index(fields=['question', 'ip_address']),
        ]
    
    def __str__(self):
        return f'Просмотр вопроса {self.question.id}'
