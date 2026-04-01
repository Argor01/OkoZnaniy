from django.contrib import admin
from .models import Question, QuestionTag, Answer, AnswerLike, QuestionView


class QuestionTagInline(admin.TabularInline):
    model = QuestionTag
    extra = 1


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'author', 'status', 'views_count', 'created_at']
    list_filter = ['status', 'category', 'created_at']
    search_fields = ['title', 'description']
    readonly_fields = ['views_count', 'created_at', 'updated_at']
    inlines = [QuestionTagInline]
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('title', 'description', 'category', 'author')
        }),
        ('Статус', {
            'fields': ('status', 'views_count')
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ['question', 'author', 'is_best_answer', 'likes_count', 'created_at']
    list_filter = ['is_best_answer', 'created_at']
    search_fields = ['content', 'question__title']
    readonly_fields = ['likes_count', 'created_at', 'updated_at']


@admin.register(AnswerLike)
class AnswerLikeAdmin(admin.ModelAdmin):
    list_display = ['answer', 'user', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username', 'answer__content']


@admin.register(QuestionView)
class QuestionViewAdmin(admin.ModelAdmin):
    list_display = ['question', 'user', 'ip_address', 'created_at']
    list_filter = ['created_at']
    search_fields = ['question__title', 'user__username', 'ip_address']
