from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
# from dj_rest_auth.registration.serializers import RegisterSerializer
from .models import User, ImprovementSuggestion


class CustomRegisterSerializer(serializers.ModelSerializer):
    """Кастомный serializer для регистрации с поддержкой реферального кода"""
    referral_code = serializers.CharField(required=False, allow_blank=True, write_only=True)
    role = serializers.ChoiceField(choices=['client', 'expert', 'partner'], required=False, default='client')
    password = serializers.CharField(write_only=True, required=True, min_length=6)
    password2 = serializers.CharField(write_only=True, required=True, min_length=6)
    email = serializers.EmailField(required=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'role', 'referral_code']
        extra_kwargs = {
            'username': {'required': False, 'allow_blank': True, 'allow_null': True}
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Принудительно делаем username необязательным
        self.fields['username'].required = False
        self.fields['username'].allow_blank = True
        self.fields['username'].allow_null = True
    
    def to_internal_value(self, data):
        """Переопределяем для обработки отсутствующего username"""
        # Если username не передан или пустой, добавляем временное значение
        if 'username' not in data or not data.get('username', '').strip():
            data = data.copy() if hasattr(data, 'copy') else dict(data)
            data['username'] = ''  # Временное значение, будет заменено в create
        return super().to_internal_value(data)
    
    def validate_username(self, value):
        """Разрешаем пустой username - он будет сгенерирован автоматически"""
        return value
    
    def validate(self, attrs):
        """Проверяем, что пароли совпадают"""
        if attrs.get('password') != attrs.get('password2'):
            raise serializers.ValidationError({"password2": "Пароли не совпадают"})
        
        # Если username пустой или None, удаляем его из attrs
        # Он будет сгенерирован в методе create
        username = attrs.get('username', '').strip() if attrs.get('username') else ''
        if not username:
            attrs.pop('username', None)
        
        return attrs
    
    def create(self, validated_data):
        referral_code = validated_data.pop('referral_code', None)
        password = validated_data.pop('password')
        validated_data.pop('password2', None)  # Удаляем password2, он нам больше не нужен
        role = validated_data.pop('role', 'client')
        
        # Генерируем username если его нет
        if 'username' not in validated_data or not validated_data.get('username'):
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
    is_blocked = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone', 'balance', 'frozen_balance',
            'avatar', 'bio', 'experience_years', 'hourly_rate',
            'education', 'skills', 'portfolio_url', 'is_verified',
            'referral_code', 'partner_commission_rate',
            'total_referrals', 'active_referrals', 'total_earnings',
            'city', 'email_verified', 'is_active', 'is_blocked',
            'date_joined', 'last_login', 'blocked_at', 'block_reason',
            'unblock_date', 'contact_violations_count'
        ]
        read_only_fields = [
            'id', 'balance', 'frozen_balance', 'is_verified',
            'referral_code', 'total_referrals', 'active_referrals',
            'total_earnings', 'email_verified', 'is_blocked',
            'date_joined', 'last_login', 'blocked_at', 'block_reason',
            'unblock_date', 'contact_violations_count'
        ]

    def get_is_blocked(self, obj):
        return not obj.is_active


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
    username = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=150,
        trim_whitespace=False  # Не обрезаем пробелы по краям
    )
    
    class Meta:
        model = User
        fields = [
            'username', 'first_name', 'last_name', 'phone', 'avatar', 'bio',
            'experience_years', 'hourly_rate', 'education', 'skills',
            'portfolio_url', 'city'
        ]
    
    def validate_username(self, value):
        """Разрешаем пробелы в никнейме"""
        if value is not None and not value.strip():
            raise serializers.ValidationError("Никнейм не может состоять только из пробелов")
        # Проверяем на уникальность, исключая текущего пользователя
        if value and value.strip():
            user = self.context.get('request').user if self.context.get('request') else None
            if user:
                existing = User.objects.filter(username=value).exclude(id=user.id).first()
                if existing:
                    raise serializers.ValidationError("Этот никнейм уже занят")
        return value


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


class ImprovementSuggestionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImprovementSuggestion
        fields = ['area', 'comment']


class ImprovementSuggestionListSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    role = serializers.CharField(source='user.role', read_only=True)
    avatar = serializers.ImageField(source='user.avatar', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    area_display = serializers.CharField(source='get_area_display', read_only=True)

    class Meta:
        model = ImprovementSuggestion
        fields = [
            'id',
            'user_id',
            'username',
            'role',
            'avatar',
            'email',
            'area',
            'area_display',
            'comment',
            'created_at',
        ]
