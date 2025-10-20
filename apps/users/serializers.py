from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    specializations = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'role', 'phone', 'telegram_id', 'balance', 'frozen_balance',
            'date_joined', 'last_login', 'specializations', 'partner',
            'avatar', 'bio', 'experience_years', 'hourly_rate', 'education', 
            'skills', 'portfolio_url', 'is_verified',
            'referral_code', 'partner_commission_rate', 'total_referrals', 
            'active_referrals', 'total_earnings'
        ]
        read_only_fields = ['email', 'date_joined', 'last_login', 'is_verified']
    
    def get_specializations(self, obj):
        """Возвращает специализации только для экспертов"""
        if obj.role == 'expert':
            from apps.experts.serializers import SpecializationSerializer
            return SpecializationSerializer(obj.specializations.all(), many=True).data
        return []

class UserCreateSerializer(serializers.Serializer):
    # MVP: упрощенная регистрация
    email = serializers.EmailField(required=False)
    phone = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    role = serializers.ChoiceField(choices=[('client', 'Клиент'), ('expert', 'Специалист'), ('partner', 'Партнер')])
    referral_code = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        # Должен быть email или телефон
        if not attrs.get('email') and not attrs.get('phone'):
            raise serializers.ValidationError({"contact": "Укажите email или телефон"})
        # Пароли совпадают
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Пароли не совпадают"})
        # Уникальность email при наличии
        email = attrs.get('email')
        if email and User.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "Пользователь с таким email уже существует."})
        
        # Уникальность телефона при наличии
        phone = attrs.get('phone')
        if phone and User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError({"phone": "Пользователь с таким телефоном уже существует."})
        
        return attrs

    def create(self, validated_data):
        email = validated_data.get('email', '')
        phone = validated_data.get('phone', '')
        password = validated_data.get('password')
        role = validated_data.get('role')
        referral_code = validated_data.pop('referral_code', None)
        # Удаляем вспомогательные поля
        validated_data.pop('password2', None)

        # Генерируем username: email до @ или телефон
        if email:
            base_username = email.split('@')[0]
        elif phone:
            base_username = phone
        else:
            base_username = 'user'

        username = base_username
        suffix = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{suffix}"
            suffix += 1

        # Ищем партнера по реферальному коду
        partner = None
        if referral_code:
            try:
                partner = User.objects.get(referral_code=referral_code, role='partner')
            except User.DoesNotExist:
                pass  # Игнорируем неверный реферальный код

        user = User.objects.create_user(
            username=username,
            email=email or None,
            phone=phone or None,
            password=password,
            role=role,
            partner=partner,
        )
        
        # Обновляем статистику партнера
        if partner:
            partner.total_referrals += 1
            partner.save()

        return user

class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'telegram_id', 'avatar',
            'bio', 'experience_years', 'hourly_rate', 
            'education', 'skills', 'portfolio_url'
        ]

class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()

class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(validators=[validate_password])
    new_password2 = serializers.CharField()

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password": "Пароли не совпадают"})
        return attrs

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Поддерживаем вход по username, email или телефону
        username = attrs.get('username')
        password = attrs.get('password')
        
        # Пытаемся найти пользователя по username, email или телефону
        user = None
        
        # Сначала пробуем по username
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            pass
        
        # Если не найден по username, пробуем по email
        if not user and '@' in username:
            try:
                user = User.objects.get(email=username)
            except User.DoesNotExist:
                pass
        
        # Если не найден по email, пробуем по телефону
        if not user and (username.startswith('+') or username.replace('+', '').replace('-', '').replace(' ', '').isdigit()):
            try:
                user = User.objects.get(phone=username)
            except User.DoesNotExist:
                pass
        
        if user and user.check_password(password):
            attrs['username'] = user.username  # Передаем username для JWT
            data = super().validate(attrs)
            data['user'] = UserSerializer(user).data
            return data
        else:
            raise serializers.ValidationError('Неверные учетные данные') 