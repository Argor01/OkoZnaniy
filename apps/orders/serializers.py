from rest_framework import serializers
from .models import Order, Transaction, Dispute, OrderFile, OrderComment, Bid
from apps.catalog.models import Subject, Topic, WorkType, Complexity
from apps.catalog.serializers import SubjectSerializer, TopicSerializer, WorkTypeSerializer, ComplexitySerializer, DiscountRuleSerializer
from apps.catalog.services import PricingService
from apps.users.serializers import UserSerializer
from django.utils import timezone

class OrderFileSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)
    file_type_display = serializers.CharField(source='get_file_type_display', read_only=True)
    file_url = serializers.SerializerMethodField()
    filename = serializers.CharField(read_only=True)
    file_size = serializers.SerializerMethodField()

    class Meta:
        model = OrderFile
        fields = [
            'id', 'file', 'file_type', 'file_type_display', 'uploaded_by',
            'created_at', 'description', 'file_url', 'filename', 'file_size'
        ]
        read_only_fields = ['uploaded_by', 'created_at']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None

    def get_file_size(self, obj):
        if obj.file and hasattr(obj.file, 'size'):
            size = obj.file.size
            # Конвертируем размер в человекочитаемый формат
            for unit in ['B', 'KB', 'MB', 'GB']:
                if size < 1024:
                    return f"{size:.1f} {unit}"
                size /= 1024
            return f"{size:.1f} TB"
        return "0 B"

class OrderCommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model = OrderComment
        fields = ['id', 'text', 'author', 'created_at']
        read_only_fields = ['author']

class BidSerializer(serializers.ModelSerializer):
    expert = UserSerializer(read_only=True)

    class Meta:
        model = Bid
        fields = ['id', 'order', 'expert', 'amount', 'comment', 'created_at']
        read_only_fields = ['id', 'expert', 'created_at', 'order']

class OrderPriceBreakdownSerializer(serializers.Serializer):
    base_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    complexity_adjustment = serializers.DecimalField(max_digits=10, decimal_places=2)
    urgency_adjustment = serializers.DecimalField(max_digits=10, decimal_places=2)
    requirements_adjustment = serializers.DecimalField(max_digits=10, decimal_places=2)
    final_price = serializers.DecimalField(max_digits=10, decimal_places=2)

class OrderSerializer(serializers.ModelSerializer):
    client = UserSerializer(read_only=True)
    expert = UserSerializer(read_only=True)
    subject = SubjectSerializer(read_only=True)
    topic = TopicSerializer(read_only=True)
    work_type = WorkTypeSerializer(read_only=True)
    complexity = ComplexitySerializer(read_only=True)
    files = OrderFileSerializer(many=True, read_only=True)
    comments = OrderCommentSerializer(many=True, read_only=True)
    bids = BidSerializer(many=True, read_only=True)
    price_breakdown = OrderPriceBreakdownSerializer(read_only=True)
    discount = DiscountRuleSerializer(read_only=True)

    # Поля для создания/обновления заказа
    subject_id = serializers.PrimaryKeyRelatedField(
        source='subject', write_only=True, queryset=Subject.objects.all()
    )
    topic_id = serializers.PrimaryKeyRelatedField(
        source='topic', write_only=True, queryset=Topic.objects.all(), required=False
    )
    custom_topic = serializers.CharField(write_only=True, required=False, allow_blank=True)
    work_type_id = serializers.PrimaryKeyRelatedField(
        source='work_type', write_only=True, queryset=WorkType.objects.all()
    )
    complexity_id = serializers.PrimaryKeyRelatedField(
        source='complexity', write_only=True, queryset=Complexity.objects.all(), required=False
    )
    additional_requirements = serializers.JSONField(required=False)

    class Meta:
        model = Order
        fields = [
            'id', 'client', 'expert', 'subject', 'topic', 'work_type', 
            'complexity', 'title', 'description', 'deadline', 'budget', 
            'status', 'created_at', 'updated_at', 'files', 'comments', 'bids',
            'subject_id', 'topic_id', 'work_type_id', 'complexity_id',
            'custom_topic', 'additional_requirements', 'price_breakdown', 'discount',
            'original_price', 'discount_amount', 'final_price'
        ]
        read_only_fields = [
            'client', 'expert', 'status', 'created_at',
            'updated_at', 'discount', 'original_price',
            'discount_amount', 'final_price'
        ]

    def validate(self, data):
        # Проверяем, что указана либо тема из списка, либо произвольная тема
        if not data.get('topic') and not data.get('custom_topic'):
            raise serializers.ValidationError({
                'topic': 'Укажите тему из списка или введите произвольную тему'
            })
        
        # Проверяем, что тема принадлежит выбранному предмету (если выбрана из списка)
        if data.get('topic') and data.get('subject'):
            if data['topic'].subject != data['subject']:
                raise serializers.ValidationError({
                    'topic': 'Выбранная тема не принадлежит указанному предмету'
                })
        
        # Проверяем дедлайн
        if data.get('deadline'):
            if data['deadline'] <= timezone.now():
                raise serializers.ValidationError({
                    'deadline': 'Дедлайн не может быть в прошлом'
                })
        
        # Проверяем цену
        if data.get('budget'):
            if data['budget'] <= 0:
                raise serializers.ValidationError({
                    'budget': 'Цена должна быть больше 0'
                })
        
        return data

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['client'] = request.user
        additional_requirements = validated_data.pop('additional_requirements', None)
        
        # Проверяем дедлайн еще раз перед расчетом цены
        deadline = validated_data.get('deadline')
        if deadline and deadline <= timezone.now():
            raise serializers.ValidationError({
                'deadline': 'Дедлайн не может быть в прошлом'
            })
        
        # Используем цену, указанную клиентом
        if 'budget' not in validated_data or not validated_data['budget']:
            raise serializers.ValidationError({
                'budget': 'Укажите желаемую цену за работу'
            })
        
        # Проверяем, что цена больше 0
        if validated_data['budget'] <= 0:
            raise serializers.ValidationError({
                'budget': 'Цена должна быть больше 0'
            })
        
        # Создаем заказ
        order = super().create(validated_data)
        
        return order

    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        # Добавляем информацию о споре, если он существует
        if hasattr(instance, 'dispute') and instance.dispute:
            data['dispute'] = {
                'id': instance.dispute.id,
                'resolved': instance.dispute.resolved
            }
        else:
            data['dispute'] = None
        
        # Показываем произвольную тему, если она есть
        if instance.custom_topic:
            data['topic'] = {
                'id': None,
                'name': instance.custom_topic,
                'slug': '',
                'description': 'Произвольная тема',
                'subject': instance.subject.id if instance.subject else None,
                'subject_name': instance.subject.name if instance.subject else '',
                'is_active': True,
                'complexity_level': 1,
                'keywords': '',
                'orders_count': 0,
                'completed_orders_count': 0
            }
        
        # Добавляем разбивку цены (упрощенная версия без сложности)
        if instance.work_type and instance.deadline:
            try:
                base_price = float(instance.work_type.base_price)
                urgency_multiplier = float(PricingService._calculate_urgency_multiplier(
                    instance.work_type.estimated_time,
                    instance.deadline
                ))
                final_price = base_price * urgency_multiplier
                
                data['price_breakdown'] = {
                    'base_price': base_price,
                    'complexity_adjustment': 0.0,
                    'urgency_adjustment': final_price - base_price,
                    'requirements_adjustment': 0.0,
                    'discount_amount': 0.0,
                    'final_price': final_price
                }
            except ValueError as e:
                # Если дедлайн в прошлом, показываем базовую цену без срочности
                base_price = float(instance.work_type.base_price)
                data['price_breakdown'] = {
                    'base_price': base_price,
                    'complexity_adjustment': 0.0,
                    'urgency_adjustment': 0.0,
                    'requirements_adjustment': 0.0,
                    'discount_amount': 0.0,
                    'final_price': base_price
                }
        
        return data

class TransactionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    
    class Meta:
        model = Transaction
        fields = ['id', 'user', 'order', 'amount', 'type', 'type_display', 'timestamp']
        read_only_fields = ['timestamp']

class DisputeSerializer(serializers.ModelSerializer):
    arbitrator = UserSerializer(read_only=True)
    order = serializers.SerializerMethodField()
    
    class Meta:
        model = Dispute
        fields = ['id', 'order', 'reason', 'resolved', 'result', 'arbitrator', 'created_at']
        read_only_fields = ['created_at', 'resolved', 'result', 'arbitrator']
    
    def get_order(self, obj):
        return {
            'id': obj.order.id,
            'title': obj.order.title or 'Без названия',
            'client': {
                'id': obj.order.client.id,
                'username': obj.order.client.username
            },
            'expert': {
                'id': obj.order.expert.id,
                'username': obj.order.expert.username
            } if obj.order.expert else None
        } 