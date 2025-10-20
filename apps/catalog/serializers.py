from rest_framework import serializers
from .models import Subject, Topic, WorkType, Complexity, SubjectCategory, DiscountRule
from django.utils import timezone

class SubjectCategorySerializer(serializers.ModelSerializer):
    subjects_count = serializers.IntegerField(read_only=True)
    active_subjects_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = SubjectCategory
        fields = ['id', 'name', 'slug', 'description', 'order', 'subjects_count', 'active_subjects_count']

class WorkTypeSerializer(serializers.ModelSerializer):
    display_price = serializers.SerializerMethodField()
    display_time = serializers.SerializerMethodField()
    orders_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = WorkType
        fields = [
            'id', 'name', 'slug', 'description', 'base_price', 'display_price',
            'estimated_time', 'display_time', 'is_active', 'icon', 'orders_count'
        ]

    def get_display_price(self, obj):
        return f"{obj.base_price} ₽"

    def get_display_time(self, obj):
        if obj.estimated_time >= 24:
            days = obj.estimated_time // 24
            hours = obj.estimated_time % 24
            return f"{days}д {hours}ч" if hours else f"{days}д"
        return f"{obj.estimated_time}ч"

class ComplexitySerializer(serializers.ModelSerializer):
    display_multiplier = serializers.SerializerMethodField()
    orders_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Complexity
        fields = [
            'id', 'name', 'slug', 'description', 'multiplier', 'display_multiplier',
            'is_active', 'icon', 'orders_count'
        ]

    def get_display_multiplier(self, obj):
        return f"×{obj.multiplier:.2f}"

class SubjectSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    topics_count = serializers.IntegerField(read_only=True)
    active_topics_count = serializers.IntegerField(read_only=True)
    experts_count = serializers.IntegerField(read_only=True)
    verified_experts_count = serializers.IntegerField(read_only=True)
    orders_count = serializers.IntegerField(read_only=True)
    completed_orders_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Subject
        fields = [
            'id', 'name', 'slug', 'description', 'category', 'category_name',
            'icon', 'is_active', 'min_price', 'topics_count', 'active_topics_count',
            'experts_count', 'verified_experts_count', 'orders_count',
            'completed_orders_count'
        ]

class SubjectDetailSerializer(SubjectSerializer):
    """Расширенный сериализатор для детального представления предмета"""
    category = SubjectCategorySerializer(read_only=True)
    topics = serializers.SerializerMethodField()
    recent_orders = serializers.SerializerMethodField()

    class Meta(SubjectSerializer.Meta):
        fields = SubjectSerializer.Meta.fields + ['topics', 'recent_orders']

    def get_topics(self, obj):
        topics = obj.topics.filter(is_active=True)[:10]
        return TopicSerializer(topics, many=True).data

    def get_recent_orders(self, obj):
        from apps.orders.serializers import OrderListSerializer
        orders = obj.orders.filter(status='completed').order_by('-created_at')[:5]
        return OrderListSerializer(orders, many=True).data

class TopicSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    orders_count = serializers.IntegerField(read_only=True)
    completed_orders_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Topic
        fields = [
            'id', 'name', 'slug', 'description', 'subject', 'subject_name',
            'is_active', 'complexity_level', 'keywords', 'orders_count',
            'completed_orders_count'
        ]

class TopicDetailSerializer(TopicSerializer):
    """Расширенный сериализатор для детального представления темы"""
    subject = SubjectSerializer(read_only=True)
    recent_orders = serializers.SerializerMethodField()
    related_topics = serializers.SerializerMethodField()

    class Meta(TopicSerializer.Meta):
        fields = TopicSerializer.Meta.fields + ['recent_orders', 'related_topics']

    def get_recent_orders(self, obj):
        from apps.orders.serializers import OrderListSerializer
        orders = obj.orders.filter(status='completed').order_by('-created_at')[:5]
        return OrderListSerializer(orders, many=True).data

    def get_related_topics(self, obj):
        topics = Topic.objects.filter(
            subject=obj.subject
        ).exclude(
            id=obj.id
        ).filter(
            is_active=True
        )[:5]
        return TopicSerializer(topics, many=True).data

class WorkTypeSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkType
        fields = ['id', 'name']

class DiscountRuleSerializer(serializers.ModelSerializer):
    work_types = WorkTypeSimpleSerializer(many=True, read_only=True)
    discount_display = serializers.SerializerMethodField()

    class Meta:
        model = DiscountRule
        fields = [
            'id', 'name', 'description', 'discount_type', 'value',
            'discount_display', 'valid_from', 'valid_until', 'is_active',
            'work_types', 'min_orders', 'min_total_spent'
        ]

    def get_discount_display(self, obj):
        if obj.discount_type == 'percentage':
            return f"{obj.value}%"
        return f"{obj.value} ₽"

class DiscountProgressSerializer(serializers.Serializer):
    orders_remaining = serializers.IntegerField()
    spent_remaining = serializers.DecimalField(max_digits=10, decimal_places=2)
    min_orders = serializers.IntegerField()
    min_total_spent = serializers.DecimalField(max_digits=10, decimal_places=2)

    def validate(self, data):
        if data.get('valid_until'):
            if data['valid_until'] < data.get('valid_from', timezone.now()):
                raise serializers.ValidationError(
                    "Дата окончания должна быть позже даты начала"
                )
        return data 