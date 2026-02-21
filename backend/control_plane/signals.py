from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Subscription, TenantService
import logging

logger = logging.getLogger(__name__)


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
