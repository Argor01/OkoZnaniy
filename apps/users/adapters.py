from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.account.adapter import DefaultAccountAdapter
from django.conf import settings


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    """Custom adapter для обработки социальной авторизации"""
    
    def pre_social_login(self, request, sociallogin):
        """
        Вызывается перед входом через социальную сеть.
        Связываем существующего пользователя с социальным аккаунтом если email совпадает.
        """
        # Если пользователь уже авторизован, ничего не делаем
        if sociallogin.is_existing:
            return
        
        # Получаем email из данных социальной сети
        email = sociallogin.account.extra_data.get('email')
        if not email:
            return
        
        # Ищем пользователя с таким email
        from apps.users.models import User
        try:
            user = User.objects.get(email=email)
            # Связываем социальный аккаунт с существующим пользователем
            sociallogin.connect(request, user)
        except User.DoesNotExist:
            pass
    
    def populate_user(self, request, sociallogin, data):
        """
        Заполняем данные пользователя из социальной сети
        """
        user = super().populate_user(request, sociallogin, data)
        
        # Получаем дополнительные данные
        extra_data = sociallogin.account.extra_data
        
        # Для Google
        if sociallogin.account.provider == 'google':
            user.email = extra_data.get('email', '')
            user.first_name = extra_data.get('given_name', '')
            user.last_name = extra_data.get('family_name', '')
            
        # Для VK
        elif sociallogin.account.provider == 'vk':
            user.email = extra_data.get('email', '')
            user.first_name = extra_data.get('first_name', '')
            user.last_name = extra_data.get('last_name', '')
        
        return user
    
    def save_user(self, request, sociallogin, form=None):
        """
        Сохраняем пользователя после авторизации через социальную сеть
        """
        user = super().save_user(request, sociallogin, form)
        
        # Устанавливаем роль по умолчанию если не установлена
        if not user.role:
            user.role = 'client'
            user.save()
        
        return user


class CustomAccountAdapter(DefaultAccountAdapter):
    """Custom adapter для обработки обычной авторизации"""
    
    def is_open_for_signup(self, request):
        """
        Разрешаем регистрацию
        """
        return True
    
    def save_user(self, request, user, form, commit=True):
        """
        Сохраняем пользователя при регистрации
        """
        user = super().save_user(request, user, form, commit=False)
        
        # Устанавливаем роль по умолчанию
        if not user.role:
            user.role = 'client'
        
        if commit:
            user.save()
        
        return user
