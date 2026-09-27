"""
Модуль для восстановления пароля через код подтверждения
"""
import secrets
import string
import logging

logger = logging.getLogger(__name__)
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail, get_connection
from django.conf import settings
from django.core.cache import cache


def generate_reset_code():
    """Генерирует криптографически стойкий 6-значный код для сброса пароля."""
    return ''.join(secrets.choice(string.digits) for _ in range(6))


def create_password_reset_code(user):
    """
    Создает код для сброса пароля и сохраняет в кеш на 15 минут
    """
    code = generate_reset_code()
    cache_key = f'password_reset_{user.email.strip().lower()}'
    cache.delete(cache_key + '_attempts')
    
    # Сохраняем код в кеш на 15 минут
    cache.set(cache_key, {
        'code': code,
        'user_id': user.id,
        'created_at': timezone.now().isoformat()
    }, 900)  # 15 минут
    
    return code


def send_password_reset_code(email, code):
    """Отправляет код сброса пароля на email"""
    subject = 'Код для сброса пароля - OkoZnaniy'
    message = f'''
Здравствуйте!

Вы запросили сброс пароля на платформе OkoZnaniy.

Ваш код для сброса пароля: {code}

Код действителен в течение 15 минут.

Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.

С уважением,
Команда OkoZnaniy
    '''
    
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
            connection=get_connection(timeout=15),
        )
        return True
    except Exception as e:
        logger.exception("Password reset email delivery failed")
        return False


def verify_password_reset_code(email, code):
    """
    Проверяет код сброса пароля
    Возвращает user_id если код верный, иначе None
    """
    if not isinstance(email, str) or not isinstance(code, str):
        return None
    cache_key = f'password_reset_{email.strip().lower()}'
    reset_data = cache.get(cache_key)
    if not reset_data:
        return None
    attempts_key = cache_key + '_attempts'
    cache.add(attempts_key, 0, 900)
    try:
        attempts = cache.incr(attempts_key)
    except ValueError:
        return None
    if attempts > 5:
        cache.delete(cache_key)
        return None
    if not secrets.compare_digest(str(reset_data['code']), code):
        if attempts >= 5:
            cache.delete(cache_key)
        return None
    return reset_data['user_id']


def delete_password_reset_code(email):
    """Удаляет код сброса пароля из кеша"""
    cache_key = f'password_reset_{email.strip().lower()}'
    cache.delete(cache_key)
