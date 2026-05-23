from django.apps import AppConfig


class MLConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ml'
    verbose_name = 'Athens ML — Predictive Industrial Intelligence'

    def ready(self):
        # Ensure model storage directory exists
        import os
        from django.conf import settings
        model_dir = getattr(settings, 'ML_MODEL_DIR', os.path.join(settings.BASE_DIR, 'ml_models'))
        os.makedirs(model_dir, exist_ok=True)
