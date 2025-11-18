"""
Telegram авторизация через бота
"""
import hashlib
import hmac
from datetime import datetime, timedelta
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


def verify_telegram_auth(auth_data):
    """
    Проверяет подлинность данных от Telegram Widget
    
    Args:
        auth_data: dict с данными от Telegram (id, first_name, username, photo_url, auth_date, hash)
    
    Returns:
        bool: True если данные валидны
    """
    bot_token = settings.TELEGRAM_BOT_TOKEN
    
    # Получаем hash из данных
    received_hash = auth_data.get('hash')
    if not received_hash:
        return False
    
    # Создаем строку для проверки (все поля кроме hash, отсортированные по алфавиту)
    check_data = {k: v for k, v in auth_data.items() if k != 'hash'}
    data_check_string = '\n'.join([f'{k}={v}' for k, v in sorted(check_data.items())])
    
    # Создаем секретный ключ из токена бота
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    
    # Вычисляем hash
    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()
    
    # Проверяем совпадение hash
    if calculated_hash != received_hash:
        return False
    
    # Проверяем время авторизации (не старше 24 часов)
    auth_date = int(auth_data.get('auth_date', 0))
    current_timestamp = int(datetime.now().timestamp())
    
    if current_timestamp - auth_date > 86400:  # 24 часа
        return False
    
    return True


def get_or_create_telegram_user(telegram_data):
    """
    Получает или создает пользователя по данным Telegram
    
    Args:
        telegram_data: dict с данными от Telegram
        
    Returns:
        User: объект пользователя
    """
    telegram_id = telegram_data.get('id')
    
    # Ищем пользователя по telegram_id
    try:
        user = User.objects.get(telegram_id=telegram_id)
        
        # Обновляем данные пользователя
        if telegram_data.get('username'):
            user.username = telegram_data['username']
        if telegram_data.get('first_name'):
            user.first_name = telegram_data['first_name']
        if telegram_data.get('last_name'):
            user.last_name = telegram_data.get('last_name', '')
        
        user.save()
        return user
        
    except User.DoesNotExist:
        # Создаем нового пользователя
        username = telegram_data.get('username')
        
        # Если username занят, добавляем суффикс
        if not username or User.objects.filter(username=username).exists():
            base_username = username or f"tg_{telegram_id}"
            suffix = 1
            username = base_username
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{suffix}"
                suffix += 1
        
        user = User.objects.create(
            username=username,
            telegram_id=telegram_id,
            first_name=telegram_data.get('first_name', ''),
            last_name=telegram_data.get('last_name', ''),
            role='client',  # По умолчанию клиент
        )
        
        return user


def generate_tokens_for_user(user):
    """
    Генерирует JWT токены для пользователя
    
    Args:
        user: объект User
        
    Returns:
        dict: {'access': str, 'refresh': str}
    """
    refresh = RefreshToken.for_user(user)
    
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }
