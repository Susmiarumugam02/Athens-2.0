from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Subscription, TenantService
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender='control_plane.Tenant')
def enable_default_services_for_new_tenant(sender, instance, created, **kwargs):
    """Auto-enable Workforce service for every new tenant."""
    if not created:
        return
    try:
        from .models import Service
        service, _ = Service.objects.get_or_create(
            code='workforce',
            defaults={
                'name':         'Workforce Management',
                'service_type': 'hr_workforce',
                'base_url':     '/app/workforce',
                'description':  'Employee, attendance and payroll management',
                'is_active':    True,
            }
        )
        TenantService.objects.get_or_create(
            tenant=instance,
            service=service,
            defaults={'is_enabled': True, 'tier': 'professional'},
        )
        logger.info(f"Workforce service auto-enabled for new tenant: {instance.name}")
    except Exception as e:
        logger.error(f"Failed to auto-enable workforce for tenant {instance.name}: {e}")


@receiver(post_save, sender=Subscription)
def sync_service_tiers_on_subscription_change(sender, instance, created, **kwargs):
    """
    Auto-update service tiers when subscription plan changes
    """
    if not created:  # Only on update, not create
        # Map subscription plan to service tier
        plan_to_tier = {
            'Starter': 'starter',
            'Professional': 'professional',
            'Enterprise': 'enterprise'
        }
        
        new_tier = plan_to_tier.get(instance.plan_name)
        if not new_tier:
            logger.warning(f"Unknown plan name: {instance.plan_name}")
            return
        
        # Update all enabled services for this tenant
        updated = TenantService.objects.filter(
            tenant=instance.tenant,
            is_enabled=True
        ).update(tier=new_tier)
        
        logger.info(f"Updated {updated} service tiers to '{new_tier}' for tenant {instance.tenant.name}")
