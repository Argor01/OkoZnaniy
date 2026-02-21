from rest_framework import serializers
from django.utils.html import strip_tags
from .models import ReadyWork, ReadyWorkFile, Purchase
from apps.catalog.serializers import SubjectSerializer, WorkTypeSerializer


class AuthorSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()
    
    class Meta:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        model = User
        fields = ['id', 'username', 'name', 'rating']
    
    def get_name(self, obj):
        return obj.get_full_name() or obj.username
    
    def get_rating(self, obj):

        return 0


class ReadyWorkFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReadyWorkFile
        fields = ['id', 'name', 'file', 'file_type', 'file_size']


class ReadyWorkSerializer(serializers.ModelSerializer):
    files = ReadyWorkFileSerializer(many=True, read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    work_type_name = serializers.CharField(source='work_type.name', read_only=True)
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    author = AuthorSerializer(read_only=True)
    preview = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()
    reviewsCount = serializers.SerializerMethodField()
    purchasesCount = serializers.SerializerMethodField()
    viewsCount = serializers.SerializerMethodField()
    
    class Meta:
        model = ReadyWork
        fields = [
            'id', 'title', 'description', 'price', 'subject', 'work_type',
            'subject_name', 'work_type_name', 'author', 'author_name',
            'preview', 'rating', 'reviewsCount', 'viewsCount', 'purchasesCount',
            'is_active', 'created_at', 'updated_at', 'files'
        ]
        read_only_fields = ['author', 'created_at', 'updated_at']
    
    def get_preview(self, obj):
        if obj.preview:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.preview.url)
            return obj.preview.url
        return None

    def get_rating(self, obj):
        return float(getattr(obj, 'rating_avg', None) or 0)

    def get_reviewsCount(self, obj):
        return int(getattr(obj, 'rating_count', None) or 0)

    def get_purchasesCount(self, obj):
        return int(getattr(obj, 'purchase_count', None) or 0)

    def get_viewsCount(self, obj):
        return int(getattr(obj, 'views_count', None) or 0)
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['description'] = strip_tags(data.get('description') or '')
        return data

    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)


class CreateReadyWorkSerializer(serializers.ModelSerializer):
    preview = serializers.ImageField(required=False)
    work_files = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        write_only=True
    )
    
    class Meta:
        model = ReadyWork
        fields = [
            'title', 'description', 'price', 'subject', 'work_type',
            'preview', 'work_files'
        ]
    
    def validate_description(self, value):
        return strip_tags(value or '')

    def create(self, validated_data):
        work_files = validated_data.pop('work_files', [])
        validated_data['author'] = self.context['request'].user
        
        work = ReadyWork.objects.create(**validated_data)
        
        # Создаем файлы работы
        for file in work_files:
            ReadyWorkFile.objects.create(
                work=work,
                name=file.name,
                file=file,
                file_type=file.content_type or '',
                file_size=file.size
            )
        
        return work


class PurchaseSerializer(serializers.ModelSerializer):
    work_title = serializers.CharField(source='work.title', read_only=True)
    work_detail = ReadyWorkSerializer(source='work', read_only=True)
    delivered_file_available = serializers.SerializerMethodField()
    
    class Meta:
        model = Purchase
        fields = [
            'id',
            'work',
            'work_title',
            'work_detail',
            'price_paid',
            'rating',
            'rated_at',
            'delivered_file_available',
            'delivered_file_name',
            'delivered_file_type',
            'delivered_file_size',
            'created_at',
        ]
        read_only_fields = ['buyer', 'created_at']

    def get_delivered_file_available(self, obj):
        return bool(obj.delivered_file)
