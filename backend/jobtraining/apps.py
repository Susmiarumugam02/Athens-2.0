from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _

class JobtrainingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'jobtraining'
    verbose_name = _('Job Training')