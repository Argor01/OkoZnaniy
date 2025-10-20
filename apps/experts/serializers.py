from rest_framework import serializers
from .models import Specialization, ExpertDocument, ExpertReview, ExpertStatistics, ExpertRating
from apps.users.serializers import UserSerializer
from apps.catalog.serializers import SubjectSerializer
from apps.catalog.models import Subject

class SpecializationSerializer(serializers.ModelSerializer):
    expert = UserSerializer(read_only=True)
    subject = SubjectSerializer(read_only=True)
    subject_id = serializers.PrimaryKeyRelatedField(
        write_only=True,
        source='subject',
        queryset=Subject.objects.all()
    )

    class Meta:
        model = Specialization
        fields = ['id', 'expert', 'subject', 'subject_id', 'experience_years', 
                 'hourly_rate', 'description', 'is_verified']
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

    class Meta:
        model = ExpertReview
        fields = ['id', 'expert', 'order', 'client', 'rating', 
                 'comment', 'created_at']
        read_only_fields = ['expert', 'client', 'created_at']

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