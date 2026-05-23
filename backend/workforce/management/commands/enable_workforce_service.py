"""
Management command: enable_workforce_service

Ensures the 'workforce' Service record exists and is enabled
for every active tenant that doesn't already have it.

Usage:
    python manage.py enable_workforce_service
    python manage.py enable_workforce_service --tenant-id 3   # specific tenant only
"""
from django.core.management.base import BaseCommand
from control_plane.models import Service, Tenant, TenantService


class Command(BaseCommand):
    help = 'Enable the Workforce service for all active tenants'

    def add_arguments(self, parser):
        parser.add_argument('--tenant-id', type=int, default=None,
                            help='Enable only for this tenant ID')

    def handle(self, *args, **options):
        # Ensure the Service record exists
        service, created = Service.objects.get_or_create(
            code='workforce',
            defaults={
                'name':         'Workforce Management',
                'service_type': 'hr_workforce',
                'base_url':     '/app/workforce',
                'description':  'Employee, attendance and payroll management',
                'is_active':    True,
            }
        )
        if created:
            self.stdout.write(f'  Created Service: {service.name} (code=workforce)')
        else:
            if not service.is_active:
                service.is_active = True
                service.save(update_fields=['is_active'])
            self.stdout.write(f'  Found Service: {service.name} (code=workforce)')

        # Determine which tenants to process
        tenant_id = options.get('tenant_id')
        tenants = (
            Tenant.objects.filter(id=tenant_id, is_active=True)
            if tenant_id
            else Tenant.objects.filter(is_active=True)
        )

        if not tenants.exists():
            self.stdout.write(self.style.WARNING('  No active tenants found.'))
            return

        enabled = 0
        for tenant in tenants:
            ts, ts_created = TenantService.objects.get_or_create(
                tenant=tenant,
                service=service,
                defaults={'is_enabled': True, 'tier': 'professional'},
            )
            if ts_created:
                self.stdout.write(f'  Enabled for tenant: {tenant.name} (id={tenant.id})')
                enabled += 1
            elif not ts.is_enabled:
                ts.is_enabled = True
                ts.save(update_fields=['is_enabled'])
                self.stdout.write(f'  Re-enabled for tenant: {tenant.name} (id={tenant.id})')
                enabled += 1
            else:
                self.stdout.write(f'  Already enabled: {tenant.name} (id={tenant.id})')

        self.stdout.write(self.style.SUCCESS(
            f'\n✅  Done. Workforce service enabled/verified for {tenants.count()} tenant(s).'
        ))
