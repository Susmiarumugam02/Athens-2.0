# Generated migration for tenant data migration

from django.db import migrations
import logging

logger = logging.getLogger(__name__)


def migrate_tenant_data(apps, schema_editor):
    """Migrate legacy athens_tenant_id (UUID/int) to tenant FK"""
    User = apps.get_model('authentication', 'User')
    Tenant = apps.get_model('control_plane', 'Tenant')
    
    unmapped_users = []
    migrated_count = 0
    
    for user in User.objects.all():
        legacy_value = user.athens_tenant_id
        
        if not legacy_value:
            # No tenant assigned, skip
            continue
        
        # Try to parse as integer
        try:
            tenant_id = int(str(legacy_value))
            try:
                tenant = Tenant.objects.get(id=tenant_id)
                user.tenant = tenant
                user.save(update_fields=['tenant'])
                migrated_count += 1
                logger.info(f"Migrated user {user.id} ({user.email}) to tenant {tenant_id}")
            except Tenant.DoesNotExist:
                unmapped_users.append({
                    'user_id': user.id,
                    'email': user.email,
                    'legacy_value': str(legacy_value),
                    'reason': f'Tenant ID {tenant_id} not found'
                })
                logger.warning(f"User {user.id} ({user.email}): Tenant {tenant_id} not found")
        except (ValueError, TypeError):
            # UUID or invalid value - cannot map
            unmapped_users.append({
                'user_id': user.id,
                'email': user.email,
                'legacy_value': str(legacy_value),
                'reason': 'UUID value cannot be mapped (no UUID field on Tenant)'
            })
            logger.warning(f"User {user.id} ({user.email}): Cannot map UUID {legacy_value}")
    
    logger.info(f"Migration complete: {migrated_count} users migrated")
    if unmapped_users:
        logger.warning(f"{len(unmapped_users)} users could not be mapped:")
        for u in unmapped_users:
            logger.warning(f"  - User {u['user_id']} ({u['email']}): {u['reason']}")


def reverse_migrate(apps, schema_editor):
    """Reverse migration - copy tenant FK back to athens_tenant_id"""
    User = apps.get_model('authentication', 'User')
    
    for user in User.objects.filter(tenant__isnull=False):
        user.athens_tenant_id = user.tenant_id
        user.save(update_fields=['athens_tenant_id'])


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0008_add_tenant_fk'),
        ('control_plane', '0006_add_tenant_fk'),
    ]

    operations = [
        migrations.RunPython(migrate_tenant_data, reverse_migrate),
    ]
