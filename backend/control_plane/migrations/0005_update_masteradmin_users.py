# Generated migration for updating existing MasterAdmin users

from django.db import migrations


def update_masteradmin_users(apps, schema_editor):
    """Update existing MasterAdmin users with admin_type and AthensTenantLink"""
    User = apps.get_model('authentication', 'User')
    MasterAdmin = apps.get_model('control_plane', 'MasterAdmin')
    AthensTenantLink = apps.get_model('control_plane', 'AthensTenantLink')
    
    DEFAULT_ATHENS_MODULES = [
        "PTW", "INCIDENT", "SAFETY_OBS", "QUALITY", "ENVIRONMENT", 
        "INDUCTION", "JOB_TRAINING", "TBT", "INSPECTION", "MANPOWER",
        "WORKER", "ATTENDANCE", "MOM", "PERMISSIONS"
    ]
    
    # Update all MasterAdmin users
    updated_count = 0
    for master in MasterAdmin.objects.all():
        user = master.user
        if not user.admin_type:
            user.admin_type = 'masteradmin'
            user.save()
            updated_count += 1
        
        # Create AthensTenantLink if missing
        AthensTenantLink.objects.get_or_create(
            tenant=master.tenant,
            defaults={
                'enabled_modules': DEFAULT_ATHENS_MODULES,
                'is_active': True,
                'created_by': user
            }
        )
    
    print(f"Updated {updated_count} MasterAdmin users with admin_type")


def reverse_update(apps, schema_editor):
    """Reverse the migration"""
    User = apps.get_model('authentication', 'User')
    User.objects.filter(user_type='masteradmin').update(admin_type=None)


class Migration(migrations.Migration):

    dependencies = [
        ('control_plane', '0004_athens_control_plane'),
        ('authentication', '0004_add_admin_type'),
    ]

    operations = [
        migrations.RunPython(update_masteradmin_users, reverse_update),
    ]
