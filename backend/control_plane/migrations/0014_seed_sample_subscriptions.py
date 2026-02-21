from django.db import migrations
from django.utils import timezone
from datetime import timedelta


def create_sample_subscriptions(apps, schema_editor):
    """Create sample subscriptions for existing tenants"""
    Tenant = apps.get_model('control_plane', 'Tenant')
    Subscription = apps.get_model('control_plane', 'Subscription')
    User = apps.get_model('authentication', 'User')
    
    # Get superadmin user (or first user)
    try:
        superadmin = User.objects.filter(user_type='superadmin').first()
        if not superadmin:
            superadmin = User.objects.first()
    except:
        superadmin = None
    
    # Get all tenants
    tenants = Tenant.objects.all()
    
    if not tenants.exists():
        print("No tenants found. Skipping subscription creation.")
        return
    
    # Create subscription for each tenant
    for tenant in tenants:
        # Check if subscription already exists
        if Subscription.objects.filter(tenant=tenant).exists():
            print(f"Subscription already exists for {tenant.name}")
            continue
        
        # Create subscription
        Subscription.objects.create(
            tenant=tenant,
            plan_name='Professional',
            status='active',
            valid_from=timezone.now(),
            valid_until=timezone.now() + timedelta(days=365),
            created_by=superadmin
        )
        print(f"Created subscription for {tenant.name}")


def remove_sample_subscriptions(apps, schema_editor):
    """Remove sample subscriptions (rollback)"""
    Subscription = apps.get_model('control_plane', 'Subscription')
    Subscription.objects.filter(plan_name='Professional').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('control_plane', '0013_add_contractor_compliance_service'),
    ]

    operations = [
        migrations.RunPython(
            create_sample_subscriptions,
            reverse_code=remove_sample_subscriptions
        ),
    ]
