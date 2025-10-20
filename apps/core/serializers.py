from rest_framework import serializers
from .models import StaticPage, FAQCategory, FAQ, Contact

class StaticPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaticPage
        fields = ['id', 'title', 'slug', 'content', 'meta_description', 'created_at', 'updated_at']

class FAQCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQCategory
        fields = ['id', 'name', 'slug', 'order']

class FAQSerializer(serializers.ModelSerializer):
    category = FAQCategorySerializer(read_only=True)
    
    class Meta:
        model = FAQ
        fields = ['id', 'category', 'question', 'answer', 'order']

class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = ['id', 'name', 'email', 'phone', 'subject', 'message', 'created_at']
        read_only_fields = ['created_at'] 