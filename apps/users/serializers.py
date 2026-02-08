from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password

User = get_user_model()

class SimpleUserSerializer(serializers.ModelSerializer):
    """Упрощенный сериализатор пользователя без вложенных полей, вызывающих рекурсию"""
    avatar = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'avatar', 'role', 'is_verified'
        ]
    
    def get_avatar(self, obj):
        """Возвращает полный URL аватарки"""
        if obj.avatar:
            request = self.context.get('request')
            if request:
                url = request.build_absolute_uri(obj.avatar.url)
                if url.startswith('http://'):
                    forwarded_proto = request.META.get('HTTP_X_FORWARDED_PROTO')
                    if forwarded_proto:
                        forwarded_proto = forwarded_proto.split(',')[0].strip().lower()
                    if request.is_secure() or forwarded_proto == 'https':
                        url = url.replace('http://', 'https://', 1)
                return url
            return obj.avatar.url
        return None

class UserSerializer(serializers.ModelSerializer):
    specializations = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'role', 'phone', 'telegram_id', 'balance', 'frozen_balance',
            'date_joined', 'last_login', 'specializations', 'partner',
            'avatar', 'bio', 'experience_years', 'hourly_rate', 'education', 
            'skills', 'portfolio_url', 'is_verified',
            'referral_code', 'partner_commission_rate', 'total_referrals', 
            'active_referrals', 'total_earnings',
            'has_submitted_application', 'application_approved',
            'application_submitted_at', 'application_reviewed_at'
        ]
        read_only_fields = ['email', 'date_joined', 'last_login', 'is_verified', 'has_submitted_application', 'application_approved', 'application_submitted_at', 'application_reviewed_at']
    
    def get_avatar(self, obj):
        """Возвращает полный URL аватарки"""
        if obj.avatar:
            request = self.context.get('request')
            if request:
                url = request.build_absolute_uri(obj.avatar.url)
                if url.startswith('http://'):
                    forwarded_proto = request.META.get('HTTP_X_FORWARDED_PROTO')
                    if forwarded_proto:
                        forwarded_proto = forwarded_proto.split(',')[0].strip().lower()
                    if request.is_secure() or forwarded_proto == 'https':
                        url = url.replace('http://', 'https://', 1)
                return url
            # Если нет request в контексте, возвращаем относительный путь
            return obj.avatar.url
        return None
    
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
            'username', 'first_name', 'last_name', 'telegram_id', 'avatar',
            'bio', 'experience_years', 'hourly_rate', 
            'education', 'skills', 'portfolio_url'
        ]

class ExpertApplicationSerializer(serializers.Serializer):
    """Сериализатор для подачи анкеты эксперта"""
    first_name = serializers.CharField(max_length=150, required=True)
    last_name = serializers.CharField(max_length=150, required=True)
    bio = serializers.CharField(required=True, help_text="О себе")
    experience_years = serializers.IntegerField(required=True, min_value=0, help_text="Опыт работы в годах")
    education = serializers.CharField(required=True, help_text="Образование: вуз, специальность, годы обучения")
    skills = serializers.CharField(required=False, allow_blank=True, help_text="Навыки")
    portfolio_url = serializers.URLField(required=False, allow_blank=True, help_text="Ссылка на портфолио")

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
        import logging
        logger = logging.getLogger(__name__)
        
        # Поддерживаем вход по username, email или телефону
        username = attrs.get('username')
        password = attrs.get('password')
        
        # Логируем входящие данные для отладки
        logger.info(f"[Login] Attempting login with username: {username}")
        print(f"[Login] ========== LOGIN ATTEMPT ==========")
        print(f"[Login] Username/Email: {username}")
        print(f"[Login] Password provided: {'Yes' if password else 'No'}")
        print(f"[Login] All attrs: {list(attrs.keys())}")
        
        # Проверяем, что username и password не пустые
        if not username or not password:
            logger.warning(f"[Login] Missing username or password")
            print(f"[Login] Missing username or password")
            raise serializers.ValidationError('Укажите имя пользователя и пароль')
        
        # Пытаемся найти пользователя по username, email или телефону
        user = None
        
        # Сначала пробуем по username
        try:
            user = User.objects.get(username=username)
            logger.info(f"[Login] User found by username: {username}")
        except User.DoesNotExist:
            pass
        
        # Если не найден по username, пробуем по email
        if not user and username and '@' in username:
            try:
                user = User.objects.get(email=username)
                logger.info(f"[Login] User found by email: {username}, user_id: {user.id}")
                print(f"[Login] User found by email: {username}, user_id: {user.id}")
            except User.DoesNotExist:
                logger.warning(f"[Login] User not found by email: {username}")
                print(f"[Login] User not found by email: {username}")
            except User.MultipleObjectsReturned:
                user = User.objects.filter(email=username).first()
                logger.warning(f"[Login] Multiple users found by email: {username}, using first: {user.id}")
                print(f"[Login] Multiple users found by email: {username}, using first: {user.id}")
        
        # Если не найден по email, пробуем по телефону
        if not user and username:
            # Нормализуем телефон для поиска
            phone_normalized = username.replace('+', '').replace('-', '').replace(' ', '').replace('(', '').replace(')', '')
            if phone_normalized.isdigit():
                try:
                    # Ищем по точному совпадению или по нормализованному номеру
                    user = User.objects.filter(phone=username).first()
                    if not user:
                        # Пробуем найти по нормализованному номеру
                        for u in User.objects.filter(phone__isnull=False).exclude(phone=''):
                            if u.phone and u.phone.replace('+', '').replace('-', '').replace(' ', '').replace('(', '').replace(')', '') == phone_normalized:
                                user = u
                                break
                    if user:
                        logger.info(f"[Login] User found by phone: {username}")
                except Exception as e:
                    logger.warning(f"[Login] Error searching by phone: {str(e)}")
        
        if user:
            # Проверяем пароль
            password_valid = user.check_password(password)
            logger.info(f"[Login] User found: {user.username}, password_valid: {password_valid}")
            print(f"[Login] ========== USER FOUND ==========")
            print(f"[Login] Username: {user.username}")
            print(f"[Login] Email: {user.email}")
            print(f"[Login] Role: {user.role}")
            print(f"[Login] Email verified: {user.email_verified}")
            print(f"[Login] Password valid: {password_valid}")
            print(f"[Login] =====================================")
            
            if password_valid:
                # Генерируем токены вручную, чтобы избежать рекурсии в super().validate()
                try:
                    refresh = self.get_token(user)
                    data = {
                        'refresh': str(refresh),
                        'access': str(refresh.access_token),
                    }
                    data['user'] = UserSerializer(user).data
                    
                    # Обновляем last_login вручную если нужно (но simplejwt settings говорят False)
                    # from django.contrib.auth.models import update_last_login
                    # update_last_login(None, user)
                    
                    logger.info(f"[Login] Login successful for user: {user.username}")
                    print(f"[Login] Login successful for user: {user.username}")
                    return data
                except Exception as e:
                    logger.error(f"[Login] Error generating tokens: {str(e)}")
                    print(f"[Login] ========== ERROR IN TOKEN CREATION ==========")
                    print(f"[Login] Error: {str(e)}")
                    import traceback
                    print(traceback.format_exc())
                    print(f"[Login] ================================================")
                    raise serializers.ValidationError(f'Ошибка при создании токена: {str(e)}')
            else:
                logger.warning(f"[Login] Invalid password for user: {user.username}")
                print(f"[Login] Invalid password for user: {user.username}")
        else:
            logger.warning(f"[Login] User not found for username: {username}")
            print(f"[Login] ========== USER NOT FOUND ==========")
            print(f"[Login] Searched for: {username}")
            print(f"[Login] ========================================")
        
        # Если дошли сюда, значит пользователь не найден или пароль неверный
        print(f"[Login] ========== LOGIN FAILED ==========")
        print(f"[Login] Raising ValidationError: Неверные учетные данные")
        print(f"[Login] ======================================")
        raise serializers.ValidationError('Неверные учетные данные') 
