"""
Система подтверждения email через код
"""
import random
import string
import logging
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model
from .models import EmailVerificationCode

logger = logging.getLogger(__name__)
User = get_user_model()


def generate_verification_code():
    """Генерирует 6-значный код"""
    return ''.join(random.choices(string.digits, k=6))


def create_verification_code(user, email=None):
    """
    Создает код подтверждения для пользователя
    
    Args:
        user: объект User
        email: email адрес (если None, используется user.email)
    
    Returns:
        EmailVerificationCode: созданный код
    """
    if email is None:
        email = user.email
    
    # Деактивируем старые коды для этого email
    EmailVerificationCode.objects.filter(
        email=email,
        is_used=False
    ).update(is_used=True)
    
    # Создаем новый код
    code = generate_verification_code()
    expires_at = timezone.now() + timedelta(minutes=15)  # Код действителен 15 минут
    
    verification_code = EmailVerificationCode.objects.create(
        user=user,
        email=email,
        code=code,
        expires_at=expires_at
    )
    
    return verification_code


def send_verification_code(email, code):
    """
    Отправляет код подтверждения на email
    
    Args:
        email: email адрес
        code: код подтверждения
    
    Returns:
        bool: True если отправлено успешно
    """
    subject = 'Код подтверждения OkoZnaniy'
    
    message = f"""
Здравствуйте!

Ваш код подтверждения: {code}

Код действителен в течение 15 минут.

Если вы не запрашивали этот код, просто проигнорируйте это письмо.

С уважением,
Команда OkoZnaniy
    """
    
    html_message = f"""
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .container {{
            background-color: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            text-align: center;
        }}
        .logo {{
            font-size: 32px;
            font-weight: bold;
            color: #4F46E5;
            margin-bottom: 20px;
        }}
        .code {{
            font-size: 48px;
            font-weight: bold;
            color: #4F46E5;
            letter-spacing: 10px;
            margin: 30px 0;
            padding: 20px;
            background-color: white;
            border-radius: 10px;
            border: 2px dashed #4F46E5;
        }}
        .footer {{
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🎓 OkoZnaniy</div>
        
        <h2>Код подтверждения</h2>
        
        <p>Введите этот код для подтверждения вашего email:</p>
        
        <div class="code">{code}</div>
        
        <p><strong>Код действителен в течение 15 минут</strong></p>
        
        <p>Если вы не запрашивали этот код, просто проигнорируйте это письмо.</p>
        
        <div class="footer">
            <p>С уважением,<br>Команда OkoZnaniy</p>
            <p>Это автоматическое письмо, пожалуйста, не отвечайте на него.</p>
        </div>
    </div>
</body>
</html>
    """
    
    try:
        from_email = settings.DEFAULT_FROM_EMAIL or settings.EMAIL_HOST_USER
        logger.info(f"[EMAIL] Отправка кода подтверждения на {email}")
        logger.info(f"[EMAIL] Subject: {subject}")
        
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"[EMAIL] Успешно отправлено на {email}")
        return True
    except Exception as e:
        logger.error(f"[EMAIL ERROR] Ошибка отправки на {email}: {str(e)}", exc_info=True)
        return False


def verify_code(email, code):
    """
    Проверяет код подтверждения
    
    Args:
        email: email адрес
        code: введенный код
    
    Returns:
        tuple: (success: bool, message: str, user: User or None)
    """
    try:
        # Ищем активный код
        verification = EmailVerificationCode.objects.filter(
            email=email,
            code=code,
            is_used=False
        ).order_by('-created_at').first()
        
        if not verification:
            return False, "Неверный код", None
        
        # Увеличиваем счетчик попыток
        verification.attempts += 1
        verification.save()
        
        # Проверяем количество попыток
        if verification.attempts > 3:
            verification.is_used = True
            verification.save()
            return False, "Превышено количество попыток. Запросите новый код", None
        
        # Проверяем срок действия
        if verification.expires_at < timezone.now():
            verification.is_used = True
            verification.save()
            return False, "Код истек. Запросите новый код", None
        
        # Код верный - помечаем как использованный
        verification.is_used = True
        verification.save()
        
        # Подтверждаем email пользователя
        user = verification.user
        user.email_verified = True
        user.save()
        
        return True, "Email успешно подтвержден", user
        
    except Exception as e:
        print(f"Ошибка проверки кода: {e}")
        return False, "Ошибка проверки кода", None


def resend_verification_code(email):
    """
    Повторно отправляет код подтверждения
    
    Args:
        email: email адрес
    
    Returns:
        tuple: (success: bool, message: str)
    """
    try:
        logger.info(f"[RESEND] Request to resend code to {email}")
        
        # Ищем пользователя по email
        user = User.objects.filter(email=email).first()
        
        if not user:
            logger.warning(f"[RESEND] User not found for {email}")
            return False, "Пользователь не найден"
        
        if user.email_verified:
            logger.warning(f"[RESEND] Email already verified for {email}")
            return False, "Email уже подтвержден"
        
        # Проверяем, не отправляли ли код недавно (защита от спама)
        recent_code = EmailVerificationCode.objects.filter(
            email=email,
            created_at__gte=timezone.now() - timedelta(minutes=1)
        ).first()
        
        if recent_code:
            logger.info(f"[RESEND] Code sent recently, waiting for {email}")
            return False, "Код уже был отправлен. Подождите 1 минуту перед повторной отправкой"
        
        # Создаем новый код
        verification_code = create_verification_code(user, email)
        logger.info(f"[RESEND] Created new code for {email}")
        
        # Отправляем код
        send_result = send_verification_code(email, verification_code.code)
        logger.info(f"[RESEND] Email send result: {send_result}")
        
        if send_result:
            return True, "Код отправлен на ваш email"
        else:
            return False, "Ошибка отправки email"
            
    except Exception as e:
        logger.error(f"[RESEND ERROR] Ошибка повторной отправки кода: {e}", exc_info=True)
        return False, "Ошибка отправки кода"


def cleanup_expired_codes():
    """
    Удаляет истекшие коды (для периодического запуска через Celery)
    """
    expired_date = timezone.now() - timedelta(days=1)
    deleted_count = EmailVerificationCode.objects.filter(
        created_at__lt=expired_date
    ).delete()[0]
    
    return deleted_count
