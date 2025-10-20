import os
from django.core.asgi import get_asgi_application
from channels .routing import ProtocolTypeRouter, URLRouter
import apps.chat.routing  # если чат будет расширяться

"""
ASGI config for config project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/3.2/howto/deployment/asgi/
"""

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = ProtocolTypeRouter({
    # (http->django views is added by default)
    "http": get_asgi_application(),
    # (websocket->daphne is added by default)
    #"websocket": URLRouter(
        #apps.chat.routing.websocket_urlpatterns
    #),
})
