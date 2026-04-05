from rest_framework import serializers
from .models import Question, QuestionTag, Answer, AnswerLike


class QuestionTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionTag
        fields = ['name']


class AnswerAuthorSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField(source='username')
    avatar = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    
    def get_avatar(self, obj):
        return None  # TODO: добавить аватары
    
    def get_role(self, obj):
        if obj.role == 'expert':
            return 'Эксперт'
        return None


class AnswerSerializer(serializers.ModelSerializer):
    author = AnswerAuthorSerializer(read_only=True)
    is_liked = serializers.SerializerMethodField()
    
    class Meta:
        model = Answer
        fields = [
            'id', 'author', 'content', 'is_best_answer',
            'likes_count', 'created_at', 'is_liked'
        ]
        read_only_fields = ['likes_count', 'created_at']
    
    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return AnswerLike.objects.filter(
                answer=obj,
                user=request.user
            ).exists()
        return False



class QuestionAuthorSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField(source='username')
    avatar = serializers.SerializerMethodField()
    
    def get_avatar(self, obj):
        return None  # TODO: добавить аватары


class QuestionListSerializer(serializers.ModelSerializer):
    author = QuestionAuthorSerializer(read_only=True)
    tags = serializers.SerializerMethodField()
    answers_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Question
        fields = [
            'id', 'title', 'description', 'category', 'author',
            'status', 'views_count', 'answers_count', 'created_at', 'tags'
        ]
    
    def get_tags(self, obj):
        return [tag.name for tag in obj.tags.all()]


class QuestionDetailSerializer(serializers.ModelSerializer):
    author = QuestionAuthorSerializer(read_only=True)
    tags = serializers.SerializerMethodField()
    answers = serializers.SerializerMethodField()
    answers_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Question
        fields = [
            'id', 'title', 'description', 'category', 'author',
            'status', 'views_count', 'answers_count', 'created_at',
            'updated_at', 'tags', 'answers'
        ]
    
    def get_tags(self, obj):
        return [tag.name for tag in obj.tags.all()]
    
    def get_answers(self, obj):
        return AnswerSerializer(obj.answers.all(), many=True, context=self.context).data



class QuestionCreateSerializer(serializers.ModelSerializer):
    tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        allow_empty=True,
        write_only=True
    )
    tags_output = serializers.SerializerMethodField(read_only=True)
    author = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = Question
        fields = ['title', 'description', 'category', 'tags', 'tags_output', 'author']
        read_only_fields = ['author']
    
    def get_tags_output(self, obj):
        return [tag.name for tag in obj.tags.all()]
    
    def create(self, validated_data):
        tags_data = validated_data.pop('tags', [])
        validated_data.pop('author', None)  # Remove author from validated_data to avoid conflict
        request = self.context.get('request')
        author = request.user if request else None
        question = Question.objects.create(author=author, **validated_data)
        
        # Создаем теги
        for tag_name in tags_data:
            QuestionTag.objects.create(question=question, name=tag_name)
        
        return question


class AnswerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ['content']
