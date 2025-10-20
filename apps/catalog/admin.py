from django.contrib import admin
from django.utils.html import format_html, mark_safe
from django.db.models import Count, Q, Avg
from django.utils.safestring import mark_safe
from django.contrib import messages
from django.contrib.admin import SimpleListFilter
from django.http import HttpResponse
import csv
from datetime import datetime
from .models import Subject, Topic, WorkType, Complexity, SubjectCategory

def make_active(modeladmin, request, queryset):
    updated = queryset.update(is_active=True)
    messages.success(request, f'Активировано {updated} записей')
make_active.short_description = "Сделать активными выбранные записи"

def make_inactive(modeladmin, request, queryset):
    updated = queryset.update(is_active=False)
    messages.success(request, f'Деактивировано {updated} записей')
make_inactive.short_description = "Сделать неактивными выбранные записи"

def export_as_csv(modeladmin, request, queryset):
    meta = modeladmin.model._meta
    field_names = [field.name for field in meta.fields]
    
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename={meta.verbose_name_plural}-{datetime.now().strftime("%Y-%m-%d")}.csv'
    writer = csv.writer(response)

    writer.writerow(field_names)
    for obj in queryset:
        writer.writerow([getattr(obj, field) for field in field_names])

    return response
export_as_csv.short_description = "Экспортировать выбранные записи в CSV"

class HasActiveTopicsFilter(SimpleListFilter):
    title = 'активные темы'
    parameter_name = 'has_active_topics'

    def lookups(self, request, model_admin):
        return (
            ('yes', 'Есть активные темы'),
            ('no', 'Нет активных тем'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'yes':
            return queryset.filter(topics__is_active=True).distinct()
        if self.value() == 'no':
            return queryset.exclude(topics__is_active=True)

class HasVerifiedExpertsFilter(SimpleListFilter):
    title = 'проверенные эксперты'
    parameter_name = 'has_verified_experts'

    def lookups(self, request, model_admin):
        return (
            ('yes', 'Есть проверенные эксперты'),
            ('no', 'Нет проверенных экспертов'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'yes':
            return queryset.filter(experts__is_verified=True).distinct()
        if self.value() == 'no':
            return queryset.exclude(experts__is_verified=True)

@admin.register(SubjectCategory)
class SubjectCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'display_order', 'subjects_count', 'active_subjects_count', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('order', 'name')

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.annotate(
            subjects_annotated=Count('subjects', distinct=True),
            active_subjects_annotated=Count('subjects', filter=Q(subjects__is_active=True), distinct=True)
        )

    def display_order(self, obj):
        return mark_safe('<span style="color: #666;">{}</span>'.format(obj.order))
    display_order.short_description = 'Порядок'
    display_order.admin_order_field = 'order'

    def subjects_count(self, obj):
        return obj.subjects_annotated
    subjects_count.short_description = 'Всего предметов'
    subjects_count.admin_order_field = 'subjects_annotated'

    def active_subjects_count(self, obj):
        color = 'green' if obj.active_subjects_annotated > 0 else 'orange'
        return mark_safe('<span style="color: {}">{}</span>'.format(
            color, obj.active_subjects_annotated
        ))
    active_subjects_count.short_description = 'Активные предметы'
    active_subjects_count.admin_order_field = 'active_subjects_annotated'

@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'display_category',
        'display_price',
        'display_topics',
        'display_active_topics',
        'display_experts',
        'display_verified_experts',
        'is_active',
        'created_at'
    )
    list_filter = (
        'category',
        'is_active',
        HasActiveTopicsFilter,
        HasVerifiedExpertsFilter,
        'created_at',
    )
    search_fields = (
        'name',
        'description',
        'category__name',
        'topics__name',
        'topics__keywords'
    )
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('created_at', 'updated_at', 'display_icon')
    ordering = ('category', 'name')
    list_editable = ('is_active',)
    save_on_top = True
    fieldsets = (
        ('Основная информация', {
            'fields': ('name', 'slug', 'category', 'description')
        }),
        ('Настройки', {
            'fields': ('is_active', 'min_price', ('icon', 'display_icon'))
        }),
        ('Метаданные', {
            'classes': ('collapse',),
            'fields': ('created_at', 'updated_at')
        }),
    )
    actions = [make_active, make_inactive, export_as_csv]

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.select_related('category').annotate(
            topics_annotated=Count('topics', distinct=True),
            active_topics_annotated=Count('topics', filter=Q(topics__is_active=True), distinct=True),
            experts_annotated=Count('experts', distinct=True),
            verified_experts_annotated=Count('experts', filter=Q(experts__is_verified=True), distinct=True),
            orders_annotated=Count('order', distinct=True),
            completed_orders_annotated=Count('order', filter=Q(order__status='completed'), distinct=True)
        )

    def display_category(self, obj):
        if obj.category:
            return mark_safe(
                '<span style="color: #666;">{}</span>'.format(obj.category.name)
            )
        return '-'
    display_category.short_description = 'Категория'
    display_category.admin_order_field = 'category__name'

    def display_price(self, obj):
        return mark_safe('<b>{}₽</b>'.format(obj.min_price))
    display_price.short_description = 'Цена от'
    display_price.admin_order_field = 'min_price'

    def display_topics(self, obj):
        return mark_safe(
            '{} <span style="color: green;">({} активных)</span>'.format(
                obj.topics_annotated, obj.active_topics_annotated
            )
        )
    display_topics.short_description = 'Темы'
    display_topics.admin_order_field = 'topics_annotated'

    def display_active_topics(self, obj):
        color = 'green' if obj.active_topics_annotated > 0 else 'orange'
        return mark_safe(
            '<span style="color: {}">{} / {}</span>'.format(
                color, obj.active_topics_annotated, obj.topics_annotated
            )
        )
    display_active_topics.short_description = 'Активные темы'
    display_active_topics.admin_order_field = 'active_topics_annotated'

    def display_experts(self, obj):
        return obj.experts_annotated
    display_experts.short_description = 'Эксперты'
    display_experts.admin_order_field = 'experts_annotated'

    def display_verified_experts(self, obj):
        color = 'green' if obj.verified_experts_annotated > 0 else 'orange'
        return mark_safe(
            '<span style="color: {}">{}</span>'.format(
                color, obj.verified_experts_annotated
            )
        )
    display_verified_experts.short_description = 'Проверенные'
    display_verified_experts.admin_order_field = 'verified_experts_annotated'

    def display_icon(self, obj):
        if obj.icon:
            return format_html('<i class="fas {}" style="font-size: 24px;"></i>', obj.icon)
        return '-'
    display_icon.short_description = 'Предпросмотр иконки'

    class Media:
        css = {
            'all': ('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',)
        }

@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'display_subject',
        'display_complexity',
        'display_orders',
        'display_success_rate',
        'is_active',
        'created_at'
    )
    list_filter = (
        'subject__category',
        'subject',
        'is_active',
        'complexity_level',
        ('created_at', admin.DateFieldListFilter),
    )
    search_fields = (
        'name',
        'description',
        'subject__name',
        'keywords',
        'subject__category__name'
    )
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('subject', 'name')
    list_editable = ('is_active',)
    save_on_top = True
    fieldsets = (
        ('Основная информация', {
            'fields': ('name', 'slug', 'subject', 'description')
        }),
        ('Настройки', {
            'fields': ('is_active', 'complexity_level', 'keywords')
        }),
        ('Метаданные', {
            'classes': ('collapse',),
            'fields': ('created_at', 'updated_at')
        }),
    )
    actions = [make_active, make_inactive, export_as_csv]

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.select_related('subject', 'subject__category').annotate(
            orders_annotated=Count('order', distinct=True),
            completed_orders_annotated=Count('order', filter=Q(order__status='completed'), distinct=True)
        )

    def display_subject(self, obj):
        return mark_safe(
            '{} <span style="color: #666;">/ {}</span>'.format(
                obj.subject.name,
                obj.subject.category.name if obj.subject.category else '-'
            )
        )
    display_subject.short_description = 'Предмет / Категория'
    display_subject.admin_order_field = 'subject__name'

    def display_complexity(self, obj):
        colors = {
            1: '#28a745',  # зеленый
            2: '#17a2b8',  # голубой
            3: '#ffc107',  # желтый
            4: '#fd7e14',  # оранжевый
            5: '#dc3545'   # красный
        }
        stars = '★' * obj.complexity_level + '☆' * (5 - obj.complexity_level)
        return mark_safe(
            '<span style="color: {}">{}</span>'.format(
                colors.get(obj.complexity_level, '#666'),
                stars
            )
        )
    display_complexity.short_description = 'Сложность'
    display_complexity.admin_order_field = 'complexity_level'

    def display_orders(self, obj):
        return mark_safe(
            '{} <span style="color: green;">({} завершено)</span>'.format(
                obj.orders_annotated,
                obj.completed_orders_annotated
            )
        )
    display_orders.short_description = 'Заказы'
    display_orders.admin_order_field = 'orders_annotated'

    def display_success_rate(self, obj):
        if obj.orders_annotated:
            rate = (obj.completed_orders_annotated / obj.orders_annotated) * 100
            color = 'green' if rate >= 80 else 'orange' if rate >= 50 else 'red'
            return mark_safe(
                '<span style="color: {}">{:.1f}%</span>'.format(
                    color,
                    rate
                )
            )
        return '-'
    display_success_rate.short_description = 'Успешность'
    display_success_rate.admin_order_field = 'completed_orders_annotated'

@admin.register(WorkType)
class WorkTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'display_price', 'display_time', 'display_icon', 'is_active')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('created_at', 'updated_at', 'display_icon')
    ordering = ('name',)
    list_editable = ('is_active',)
    save_on_top = True
    fieldsets = (
        ('Основная информация', {
            'fields': ('name', 'slug', 'description')
        }),
        ('Настройки', {
            'fields': ('is_active', 'base_price', 'estimated_time', ('icon', 'display_icon'))
        }),
        ('Метаданные', {
            'classes': ('collapse',),
            'fields': ('created_at', 'updated_at')
        }),
    )
    actions = [make_active, make_inactive, export_as_csv]

    def display_price(self, obj):
        return format_html('<b>{}₽</b>', obj.base_price)
    display_price.short_description = 'Базовая цена'
    display_price.admin_order_field = 'base_price'

    def display_time(self, obj):
        if obj.estimated_time >= 24:
            days = obj.estimated_time // 24
            hours = obj.estimated_time % 24
            return format_html(
                '<span style="color: #666;">{}</span>',
                f"{days}д {hours}ч" if hours else f"{days}д"
            )
        return format_html(
            '<span style="color: #666;">{}</span>',
            f"{obj.estimated_time}ч"
        )
    display_time.short_description = 'Время'
    display_time.admin_order_field = 'estimated_time'

    def display_icon(self, obj):
        if obj.icon:
            return format_html('<i class="fas {}" style="font-size: 24px;"></i>', obj.icon)
        return '-'
    display_icon.short_description = 'Иконка'

    class Media:
        css = {
            'all': ('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',)
        }

@admin.register(Complexity)
class ComplexityAdmin(admin.ModelAdmin):
    list_display = ('name', 'display_multiplier', 'display_icon', 'is_active')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('created_at', 'updated_at', 'display_icon')
    ordering = ('multiplier',)
    list_editable = ('is_active',)
    save_on_top = True
    fieldsets = (
        ('Основная информация', {
            'fields': ('name', 'slug', 'description')
        }),
        ('Настройки', {
            'fields': ('is_active', 'multiplier', ('icon', 'display_icon'))
        }),
        ('Метаданные', {
            'classes': ('collapse',),
            'fields': ('created_at', 'updated_at')
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            orders_annotated=Count('order', distinct=True),
            completed_orders_annotated=Count('order', filter=Q(order__status='completed'), distinct=True)
        )

    def display_multiplier(self, obj):
        return mark_safe('<b>×{:.2f}</b>'.format(obj.multiplier))
    display_multiplier.short_description = 'Множитель'
    display_multiplier.admin_order_field = 'multiplier'

    def display_icon(self, obj):
        if obj.icon:
            return mark_safe('<i class="fas {}" style="font-size: 24px;"></i>'.format(obj.icon))
        return '-'
    display_icon.short_description = 'Иконка'

    class Media:
        css = {
            'all': ('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',)
        }
