# Generated migration to seed Workforce service

from django.db import migrations


def seed_workforce_service(apps, schema_editor):
    Service = apps.get_model('control_plane', 'Service')
    
    # Idempotent: get_or_create
    service, created = Service.objects.get_or_create(
        code='workforce',
        defaults={
            'name': 'Workforce',
            'description': 'Project Management, Task Tracking (Kanban + SLA), and Finance Management',
            'service_type': 'project',
            'base_url': '/app/workforce',
            'icon': 'briefcase',
            'is_active': True,
            'features': {
                'basic': [
                    'Project Management',
                    'Task Tracking with Kanban',
                    'Customer Management',
                    'Invoice Management',
                ],
                'premium': [
                    'SLA Tracking',
                    'Task Dependencies',
                    'Quotations & Purchase Orders',
                    'Payment Tracking',
                    'Advanced Reports',
                ]
            },
            'pricing': {
                'basic': 0,
                'premium': 1999
            }
        }
    )
    
    if not created:
        # Update if already exists
        service.name = 'Workforce'
        service.description = 'Project Management, Task Tracking (Kanban + SLA), and Finance Management'
        service.base_url = '/app/workforce'
        service.is_active = True
        service.save()


def reverse_seed(apps, schema_editor):
    Service = apps.get_model('control_plane', 'Service')
    Service.objects.filter(code='workforce').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('control_plane', '0007_service_tenantservice'),
    ]

    operations = [
        migrations.RunPython(seed_workforce_service, reverse_seed),
    ]
