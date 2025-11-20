"""
Модуль для восстановления пароля через код подтверждения
"""
import random
import string
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.core.cache import cache


def generate_reset_code():
    """Генерирует 6-значный код для сброса пароля"""
    return ''.join(random.choices(string.digits, k=6))


def create_password_reset_code(user):
    """
    Создает код для сброса пароля и сохраняет в кеш на 15 минут
    """
    code = generate_reset_code()
    cache_key = f'password_reset_{user.email}'
    
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
        )
        return True
    except Exception as e:
        print(f"Error sending password reset email: {e}")
        return False


def verify_password_reset_code(email, code):
    """
    Проверяет код сброса пароля
    Возвращает user_id если код верный, иначе None
    """
    cache_key = f'password_reset_{email}'
    reset_data = cache.get(cache_key)
    
    if not reset_data:
        return None
    
    if reset_data['code'] != code:
        return None
    
    return reset_data['user_id']


def delete_password_reset_code(email):
    """Удаляет код сброса пароля из кеша"""
    cache_key = f'password_reset_{email}'
    cache.delete(cache_key)
