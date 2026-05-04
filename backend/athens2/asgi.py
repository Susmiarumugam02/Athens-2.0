import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'athens2.settings')

# Must call get_asgi_application() before importing anything that uses Django models
django_asgi_app = get_asgi_application()

from chatbox.routing import websocket_urlpatterns  # noqa: E402
from chatbox.middleware import JwtAuthMiddleware   # noqa: E402

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AllowedHostsOriginValidator(
        JwtAuthMiddleware(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
