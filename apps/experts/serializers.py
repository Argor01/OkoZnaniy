from rest_framework import serializers
from .models import Specialization, ExpertDocument, ExpertReview, ExpertStatistics, ExpertRating, ExpertApplication, Education
from apps.users.serializers import UserSerializer, SimpleUserSerializer
from apps.catalog.serializers import SubjectSerializer
from apps.catalog.models import Subject
from apps.orders.models import Order

class SimpleOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['id', 'title']

class SpecializationSerializer(serializers.ModelSerializer):
    expert = SimpleUserSerializer(read_only=True)
    subject = SubjectSerializer(read_only=True)
    subject_id = serializers.PrimaryKeyRelatedField(
        write_only=True,
        source='subject',
        queryset=Subject.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Specialization
        fields = ['id', 'expert', 'subject', 'subject_id', 'experience_years', 
                 'hourly_rate', 'description', 'skills', 'is_verified', 'custom_name']
        read_only_fields = ['expert', 'is_verified']

class ExpertDocumentSerializer(serializers.ModelSerializer):
    expert = UserSerializer(read_only=True)
    document_type_display = serializers.CharField(
        source='get_document_type_display',
        read_only=True
    )
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ExpertDocument
        fields = ['id', 'expert', 'document_type', 'document_type_display', 
                 'title', 'file', 'file_url', 'description', 'is_verified', 'uploaded_at']
        read_only_fields = ['expert', 'is_verified', 'uploaded_at']

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None

class ExpertReviewSerializer(serializers.ModelSerializer):
    expert = UserSerializer(read_only=True)
    client = UserSerializer(read_only=True)
    # Используем PrimaryKeyRelatedField для записи, чтобы валидация работала корректно
    order = serializers.PrimaryKeyRelatedField(queryset=Order.objects.all())

    class Meta:
        model = ExpertReview
        fields = ['id', 'expert', 'order', 'client', 'rating', 
                 'comment', 'created_at']
        read_only_fields = ['expert', 'client', 'created_at']

    def to_representation(self, instance):
        # При чтении заменяем ID заказа на объект с деталями
        ret = super().to_representation(instance)
        ret['order'] = SimpleOrderSerializer(instance.order).data
        return ret

    def validate(self, data):
        order = data.get('order')
        request = self.context.get('request')
        
        if not order.expert:
            raise serializers.ValidationError(
                'Невозможно оставить отзыв для заказа без эксперта'
            )
        
        if order.client != request.user:
            raise serializers.ValidationError(
                'Только клиент может оставить отзыв'
            )
        
        if order.status != 'completed':
            raise serializers.ValidationError(
                'Отзыв можно оставить только для завершенного заказа'
            )
        
        return data

class ExpertRatingSerializer(serializers.ModelSerializer):
    expert = UserSerializer(read_only=True)
    client = UserSerializer(read_only=True)
    
    class Meta:
        model = ExpertRating
        fields = ['id', 'expert', 'client', 'order', 'rating', 'comment', 'created_at']
        read_only_fields = ['expert', 'client', 'created_at']

    def validate(self, data):
        # Проверяем, что заказ завершен
        order = data['order']
        if order.status != 'completed':
            raise serializers.ValidationError(
                "Оставить отзыв можно только для завершенного заказа"
            )
        
        # Проверяем, что клиент является заказчиком
        request = self.context.get('request')
        if request and request.user != order.client:
            raise serializers.ValidationError(
                "Вы не можете оставить отзыв для этого заказа"
            )
        
        # Проверяем, что отзыв еще не оставлен
        if ExpertRating.objects.filter(order=order).exists():
            raise serializers.ValidationError(
                "Отзыв для этого заказа уже существует"
            )
        
        return data


class ExpertRatingDetailSerializer(serializers.ModelSerializer):
    expert = serializers.IntegerField(source='expert_id', read_only=True)
    client = SimpleUserSerializer(read_only=True)
    order = serializers.SerializerMethodField()

    class Meta:
        model = ExpertRating
        fields = ['id', 'expert', 'client', 'order', 'rating', 'comment', 'created_at']
        read_only_fields = fields

    def get_order(self, obj):
        return {
            'id': obj.order.id,
            'title': obj.order.title or 'Без названия',
        }

class ExpertStatisticsSerializer(serializers.ModelSerializer):
    expert = UserSerializer(read_only=True)
    
    class Meta:
        model = ExpertStatistics
        fields = [
            'id', 'expert', 'total_orders', 'completed_orders',
            'average_rating', 'success_rate', 'total_earnings',
            'response_time_avg', 'last_updated'
        ]
        read_only_fields = fields 

class ExpertMatchSerializer(serializers.ModelSerializer):
    expert = UserSerializer()
    relevance_score = serializers.FloatField()
    current_workload = serializers.IntegerField()
    avg_rating = serializers.FloatField()
    success_rate = serializers.FloatField()
    availability = serializers.SerializerMethodField()
    hourly_rate = serializers.DecimalField(max_digits=10, decimal_places=2)
    experience_years = serializers.IntegerField()

    class Meta:
        model = Specialization
        fields = [
            'expert', 'subject', 'hourly_rate', 'experience_years',
            'relevance_score', 'current_workload', 'avg_rating',
            'success_rate', 'availability'
        ]

    def get_availability(self, obj):
        from .services import ExpertMatchingService
        return ExpertMatchingService.get_expert_availability(obj.expert) 


class EducationSerializer(serializers.ModelSerializer):
    start_year = serializers.IntegerField(
        min_value=1950, 
        max_value=2100,
        error_messages={
            'min_value': 'Год начала обучения должен быть не раньше 1950',
            'max_value': 'Год начала обучения должен быть не позже 2100'
        }
    )
    end_year = serializers.IntegerField(
        required=False, 
        allow_null=True,
        min_value=1950,
        max_value=2100,
        error_messages={
            'min_value': 'Год окончания обучения должен быть не раньше 1950',
            'max_value': 'Год окончания обучения должен быть не позже 2100'
        }
    )
    degree = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
    class Meta:
        model = Education
        fields = ['id', 'university', 'start_year', 'end_year', 'degree', 'created_at']
        read_only_fields = ['id', 'created_at']


class ExpertApplicationSerializer(serializers.ModelSerializer):
    expert = UserSerializer(read_only=True)
    educations = EducationSerializer(many=True, read_only=True)
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    reviewed_by = UserSerializer(read_only=True)

    class Meta:
        model = ExpertApplication
        fields = [
            'id', 'expert', 'full_name', 'work_experience_years',
            'specializations', 'educations',
            'status', 'status_display', 'rejection_reason',
            'reviewed_by', 'reviewed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['expert', 'status', 'rejection_reason', 'reviewed_by', 'reviewed_at', 'created_at', 'updated_at']


class ExpertApplicationCreateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255, required=True)
    work_experience_years = serializers.IntegerField(min_value=0, required=True)
    specializations = serializers.CharField(required=True, allow_blank=False, help_text="Специальности, которые вы пишете")
    educations = EducationSerializer(many=True, required=True, min_length=1) 



class TransactionSerializer(serializers.ModelSerializer):
    """Сериализатор для транзакций эксперта"""
    order_info = serializers.SerializerMethodField()
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    
    class Meta:
        from apps.orders.models import Transaction
        model = Transaction
        fields = ['id', 'type', 'type_display', 'amount', 'order_info', 'timestamp']
        read_only_fields = fields
        
    def get_order_info(self, obj):
        """Возвращает информацию о заказе"""
        if obj.order:
            return {
                'id': obj.order.id,
                'title': obj.order.title or 'Без названия'
            }
        return None


class NotificationSerializer(serializers.ModelSerializer):
    """Сериализатор для уведомлений"""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    
    class Meta:
        from apps.notifications.models import Notification
        model = Notification
        fields = ['id', 'type', 'type_display', 'title', 'message', 'data', 'is_read', 'created_at']
        read_only_fields = ['id', 'type', 'type_display', 'title', 'message', 'data', 'created_at']


class ExpertReviewDetailSerializer(serializers.ModelSerializer):
    """Детальный сериализатор для отзывов о эксперте"""
    client = UserSerializer(read_only=True)
    order = serializers.SerializerMethodField()
    
    class Meta:
        model = ExpertReview
        fields = ['id', 'rating', 'comment', 'client', 'order', 'created_at']
        read_only_fields = fields
        
    def get_order(self, obj):
        """Возвращает информацию о заказе"""
        return {
            'id': obj.order.id,
            'title': obj.order.title or 'Без названия'
        }
