from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()


class EmailOrUsernameBackend(ModelBackend):
    """
    Кастомный authentication backend, который позволяет входить
    используя email или username
    """
    
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None
        
        # Пытаемся найти пользователя по email или username
        try:
            # Сначала пробуем найти по email
            if '@' in username:
                user = User.objects.get(email=username)
            else:
                # Если нет @, ищем по username
                user = User.objects.get(username=username)
        except User.DoesNotExist:
            # Запускаем default password hasher для защиты от timing attacks
            User().set_password(password)
            return None
        except User.MultipleObjectsReturned:
            # Если несколько пользователей с таким email, берем первого
            if '@' in username:
                user = User.objects.filter(email=username).first()
            else:
                user = User.objects.filter(username=username).first()
        
        # Проверяем пароль
        if user and user.check_password(password):
            return user
        
        return None
