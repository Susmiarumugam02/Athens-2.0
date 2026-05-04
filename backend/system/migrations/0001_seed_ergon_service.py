from django.db import migrations


def seed_ergon_service(apps, schema_editor):
    Service = apps.get_model('control_plane', 'Service')
    
    # Create ERGON service (idempotent)
    Service.objects.get_or_create(
        code='ergon',
        defaults={
            'name': 'Ergon',
            'description': 'Ergon Workforce Management System',
            'service_type': 'hr_workforce',
            'base_url': '/services/ergon',
            'icon': 'users',
            'is_active': True,
            'features': {},
            'pricing': {}
        }
    )


def reverse_seed(apps, schema_editor):
    Service = apps.get_model('control_plane', 'Service')
    Service.objects.filter(code='ergon').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('control_plane', '0007_service_tenantservice'),
    ]

    operations = [
        migrations.RunPython(seed_ergon_service, reverse_seed),
    ]
