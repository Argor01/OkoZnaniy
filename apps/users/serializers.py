from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
# from dj_rest_auth.registration.serializers import RegisterSerializer
from .models import User


class CustomRegisterSerializer(serializers.ModelSerializer):
    """Кастомный serializer для регистрации с поддержкой реферального кода"""
    referral_code = serializers.CharField(required=False, allow_blank=True, write_only=True)
    role = serializers.ChoiceField(choices=['client', 'expert', 'partner'], required=False, default='client')
    password = serializers.CharField(write_only=True, required=True, min_length=6)
    password2 = serializers.CharField(write_only=True, required=True, min_length=6)
    username = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'role', 'referral_code']
    
    def validate(self, attrs):
        """Проверяем, что пароли совпадают"""
        if attrs.get('password') != attrs.get('password2'):
            raise serializers.ValidationError({"password2": "Пароли не совпадают"})
        return attrs
    
    def create(self, validated_data):
        referral_code = validated_data.pop('referral_code', None)
        password = validated_data.pop('password')
        validated_data.pop('password2', None)  # Удаляем password2, он нам больше не нужен
        role = validated_data.pop('role', 'client')
        
        # Если username не указан, генерируем из email
        if not validated_data.get('username'):
            email = validated_data.get('email', '')
            if email:
                # Берем часть до @ и добавляем случайные цифры если нужно
                base_username = email.split('@')[0]
                username = base_username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1
                validated_data['username'] = username
            else:
                # Если нет email, генерируем случайный username
                import uuid
                validated_data['username'] = f"user_{uuid.uuid4().hex[:8]}"
        
        # Создаем пользователя
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.role = role
        
        # Если указан реферальный код, находим партнера
        if referral_code:
            try:
                partner = User.objects.get(
                    referral_code=referral_code,
                    role='partner'
                )
                user.partner = partner
                
                # Увеличиваем счетчик рефералов у партнера
                partner.total_referrals += 1
                partner.save(update_fields=['total_referrals'])
                
            except User.DoesNotExist:
                # Если код не найден, просто игнорируем
                pass
        
        user.save()
        return user
    
    def custom_signup(self, request, user):
        """Обработка дополнительных полей при регистрации"""
        referral_code = self.validated_data.get('referral_code', '').strip()
        role = self.validated_data.get('role', 'client')
        
        # Устанавливаем роль
        user.role = role
        
        # Если указан реферальный код, находим партнера
        if referral_code:
            try:
                partner = User.objects.get(
                    referral_code=referral_code,
                    role='partner'
                )
                user.partner = partner
                
                # Увеличиваем счетчик рефералов у партнера
                partner.total_referrals += 1
                partner.save(update_fields=['total_referrals'])
                
            except User.DoesNotExist:
                # Если код не найден, просто игнорируем
                pass
        
        user.save()


class UserSerializer(serializers.ModelSerializer):
    """Serializer для модели User"""
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone', 'balance', 'frozen_balance',
            'avatar', 'bio', 'experience_years', 'hourly_rate',
            'education', 'skills', 'portfolio_url', 'is_verified',
            'referral_code', 'partner_commission_rate',
            'total_referrals', 'active_referrals', 'total_earnings',
            'city', 'email_verified'
        ]
        read_only_fields = [
            'id', 'balance', 'frozen_balance', 'is_verified',
            'referral_code', 'total_referrals', 'active_referrals',
            'total_earnings', 'email_verified'
        ]


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer для создания пользователя"""
    password = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'role', 'first_name', 'last_name', 'phone']
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer для обновления пользователя"""
    
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'phone', 'avatar', 'bio',
            'experience_years', 'hourly_rate', 'education', 'skills',
            'portfolio_url', 'city'
        ]


class PasswordResetSerializer(serializers.Serializer):
    """Serializer для запроса сброса пароля"""
    email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer для подтверждения сброса пароля"""
    code = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, write_only=True)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Кастомный serializer для получения токена с дополнительными данными пользователя"""
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Добавляем дополнительные данные в токен
        token['username'] = user.username
        token['email'] = user.email
        token['role'] = user.role
        
        return token
    
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Добавляем данные пользователя в ответ
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'role': self.user.role,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
        }
        
        return data


class ExpertApplicationSerializer(serializers.Serializer):
    """Serializer для заявки на эксперта"""
    bio = serializers.CharField(required=True)
    experience_years = serializers.IntegerField(required=True)
    hourly_rate = serializers.DecimalField(max_digits=10, decimal_places=2, required=True)
    education = serializers.CharField(required=False, allow_blank=True)
    skills = serializers.CharField(required=False, allow_blank=True)
    portfolio_url = serializers.URLField(required=False, allow_blank=True)


class SimpleUserSerializer(serializers.ModelSerializer):
    """Упрощенный serializer для пользователя"""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'avatar']


class PublicUserProfileSerializer(serializers.ModelSerializer):
    """Serializer для публичного профиля пользователя"""
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'role',
            'avatar', 'bio', 'experience_years', 'hourly_rate',
            'education', 'skills', 'portfolio_url', 'is_verified', 'city'
        ]
