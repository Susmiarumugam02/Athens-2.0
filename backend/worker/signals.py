from django.db.models.signals import post_migrate
from django.dispatch import receiver
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.apps import apps
from django.conf import settings

@receiver(post_migrate)
def create_worker_permissions(sender, **kwargs):
    """
    Create custom permissions for the worker app after migrations.
    """
    if getattr(settings, 'DISABLE_MODEL_SIGNALS', False):
        return
    if sender.name == 'worker':
        # Get the content type for the Worker model
        Worker = apps.get_model('worker', 'Worker')
        content_type = ContentType.objects.get_for_model(Worker)
        
        # Create custom permissions
        Permission.objects.get_or_create(
            codename='view_all_workers',
            name='Can view all workers',
            content_type=content_type,
        )
        
        Permission.objects.get_or_create(
            codename='manage_workers',
            name='Can manage workers',
            content_type=content_type,
        )
