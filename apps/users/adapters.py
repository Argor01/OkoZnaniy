from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.account.adapter import DefaultAccountAdapter
from django.conf import settings


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    """Custom adapter для обработки социальной авторизации"""
    
    def get_callback_url(self, request, app):
        """
        Переопределяем callback URL для использования правильного домена в production
        """
        callback_url = super().get_callback_url(request, app)
        
        # В production используем FRONTEND_URL из настроек
        if not settings.DEBUG and settings.FRONTEND_URL:
            # Заменяем localhost на правильный URL
            if 'localhost' in callback_url or '127.0.0.1' in callback_url:
                from urllib.parse import urlparse, urlunparse
                parsed = urlparse(callback_url)
                frontend_parsed = urlparse(settings.FRONTEND_URL)
                
                # Заменяем scheme и netloc на правильные
                callback_url = urlunparse((
                    frontend_parsed.scheme,
                    frontend_parsed.netloc,
                    parsed.path,
                    parsed.params,
                    parsed.query,
                    parsed.fragment
                ))
        
        return callback_url
    
    def get_app(self, request, provider, client_id=None):
        """
        Переопределяем метод get_app чтобы избежать ошибки MultipleObjectsReturned
        """
        from allauth.socialaccount.models import SocialApp
        from django.contrib.sites.models import Site
        
        try:
            # Пытаемся получить приложение стандартным способом
            return super().get_app(request, provider, client_id)
        except Exception as e:
            # Если возникла ошибка, пытаемся получить первое подходящее приложение
            site = Site.objects.get_current(request)
            apps = SocialApp.objects.filter(provider=provider, sites=site)
            
            if client_id:
                apps = apps.filter(client_id=client_id)
            
            if apps.exists():
                return apps.first()
            
            # Если не нашли по site, ищем любое приложение с этим provider
            apps = SocialApp.objects.filter(provider=provider)
            if client_id:
                apps = apps.filter(client_id=client_id)
            
            if apps.exists():
                return apps.first()
            
            raise e
    
    def pre_social_login(self, request, sociallogin):
        """
        Вызывается перед входом через социальную сеть.
        Связываем существующего пользователя с социальным аккаунтом если email совпадает.
        Если пользователя нет - перенаправляем на регистрацию с email.
        """
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"🔍 pre_social_login called, is_existing: {sociallogin.is_existing}")
        
        # Если пользователь уже авторизован, ничего не делаем
        if sociallogin.is_existing:
            logger.info("✅ User already exists, continuing with login")
            return
        
        # Получаем email из данных социальной сети
        email = sociallogin.account.extra_data.get('email')
        logger.info(f"📧 Email from Google: {email}")
        
        if not email:
            logger.warning("⚠️ No email from Google")
            return
        
        # Ищем пользователя с таким email
        from apps.users.models import User
        try:
            user = User.objects.get(email=email)
            logger.info(f"✅ User found: {user.username}, connecting social account")
            # Связываем социальный аккаунт с существующим пользователем
            sociallogin.connect(request, user)
        except User.DoesNotExist:
            logger.info(f"❌ User not found, redirecting to registration")
            # Пользователя нет - сохраняем email в сессии для регистрации
            from django.shortcuts import redirect
            
            # Сохраняем данные из Google в сессии
            request.session['google_email'] = email
            request.session['google_first_name'] = sociallogin.account.extra_data.get('given_name', '')
            request.session['google_last_name'] = sociallogin.account.extra_data.get('family_name', '')
            request.session['google_picture'] = sociallogin.account.extra_data.get('picture', '')
            
            # Прерываем процесс авторизации
            from allauth.exceptions import ImmediateHttpResponse
            frontend_url = settings.FRONTEND_URL or 'http://localhost:5173'
            redirect_url = f"{frontend_url}/login?email={email}&from=google&register=true"
            logger.info(f"🔀 Redirecting to: {redirect_url}")
            raise ImmediateHttpResponse(redirect(redirect_url))
    
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
