from rest_framework import serializers
from .models import ReadyWork, ReadyWorkFile, Purchase
from apps.catalog.serializers import SubjectSerializer, WorkTypeSerializer


class ReadyWorkFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReadyWorkFile
        fields = ['id', 'name', 'file', 'file_type', 'file_size']


class ReadyWorkSerializer(serializers.ModelSerializer):
    files = ReadyWorkFileSerializer(many=True, read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    work_type_name = serializers.CharField(source='work_type.name', read_only=True)
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    
    class Meta:
        model = ReadyWork
        fields = [
            'id', 'title', 'description', 'price', 'subject', 'work_type',
            'subject_name', 'work_type_name', 'author', 'author_name',
            'preview', 'is_active', 'created_at', 'updated_at', 'files'
        ]
        read_only_fields = ['author', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)


class CreateReadyWorkSerializer(serializers.ModelSerializer):
    files = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        write_only=True
    )
    
    class Meta:
        model = ReadyWork
        fields = [
            'title', 'description', 'price', 'subject', 'work_type',
            'preview', 'files'
        ]
    
    def create(self, validated_data):
        files_data = validated_data.pop('files', [])
        validated_data['author'] = self.context['request'].user
        
        work = ReadyWork.objects.create(**validated_data)
        
        # Создаем файлы (пока без реальной загрузки)
        for file_data in files_data:
            ReadyWorkFile.objects.create(
                work=work,
                name=file_data.get('name', ''),
                file_type=file_data.get('type', ''),
                file_size=file_data.get('size', 0)
            )
        
        return work


class PurchaseSerializer(serializers.ModelSerializer):
    work_title = serializers.CharField(source='work.title', read_only=True)
    
    class Meta:
        model = Purchase
        fields = ['id', 'work', 'work_title', 'price_paid', 'created_at']
        read_only_fields = ['buyer', 'created_at']