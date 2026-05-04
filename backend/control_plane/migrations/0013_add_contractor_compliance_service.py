from django.db import migrations


def add_contractor_compliance_service(apps, schema_editor):
    """Add Contractor Compliance service to the catalog"""
    Service = apps.get_model('control_plane', 'Service')
    
    Service.objects.create(
        name='Contractor Compliance',
        code='contractor-compliance',
        description='CLRA automation, contractor master database, compliance tracking, and statutory form generation for contract labour management',
        service_type='sustainability',
        base_url='/contractor-compliance',
        icon='shield-check',
        is_active=True,
        features={
            'basic': [
                'Contractor Master Database',
                'Basic Compliance Tracking',
                'Manual CLRA Form Entry',
                'Contractor Profile Management'
            ],
            'premium': [
                'All Basic Features',
                'Automated CLRA Forms (11 statutory forms)',
                'Compliance Alerts & Notifications',
                'Document Management',
                'Labour Deployment Tracking',
                'License Expiry Alerts'
            ],
            'enterprise': [
                'All Premium Features',
                'Multi-site Compliance Management',
                'Advanced Analytics & Reports',
                'API Access for Integration',
                'Bulk Operations',
                'Dedicated Support',
                'Custom Workflows'
            ]
        },
        pricing={
            'basic': {
                'monthly': 0,
                'annual': 0,
                'description': 'Free tier with basic features'
            },
            'premium': {
                'monthly': 99,
                'annual': 999,
                'description': 'Full automation with CLRA forms'
            },
            'enterprise': {
                'monthly': 299,
                'annual': 2999,
                'description': 'Enterprise-grade compliance management'
            }
        }
    )


def remove_contractor_compliance_service(apps, schema_editor):
    """Remove Contractor Compliance service (rollback)"""
    Service = apps.get_model('control_plane', 'Service')
    Service.objects.filter(code='contractor-compliance').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('control_plane', '0012_fix_tenant_deletion_cascade'),
    ]

    operations = [
        migrations.RunPython(
            add_contractor_compliance_service,
            reverse_code=remove_contractor_compliance_service
        ),
    ]
