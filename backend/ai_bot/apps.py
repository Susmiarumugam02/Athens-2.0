"""
AI Bot Django app configuration
"""

from django.apps import AppConfig

class AIBotConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ai_bot'

    def ready(self):
        from . import signals  # noqa: F401
