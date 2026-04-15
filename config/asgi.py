import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

"""
ASGI config for config project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/3.2/howto/deployment/asgi/
"""

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Сначала создаём HTTP приложение (оно вызывает django.setup())
django_asgi_app = get_asgi_application()

# Теперь Django инициализирован, можно импортировать consumers
import apps.chat.routing

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        URLRouter(
            apps.chat.routing.get_websocket_urlpatterns()
        )
    ),
})
