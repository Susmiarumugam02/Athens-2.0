from django.apps import AppConfig

class MomConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'mom'

    def ready(self):
        # import mom.signals  # Disabled - using WebSocket notifications from frontend only
        pass
