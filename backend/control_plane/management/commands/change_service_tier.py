from django.core.management.base import BaseCommand
from control_plane.models import TenantService, Tenant, Service


class Command(BaseCommand):
    help = 'Change service tier for a tenant'

    def add_arguments(self, parser):
        parser.add_argument('tenant_name', type=str)
        parser.add_argument('service_code', type=str)
        parser.add_argument('tier', type=str, choices=['basic', 'premium', 'enterprise'])

    def handle(self, *args, **options):
        tenant_name = options['tenant_name']
        service_code = options['service_code']
        tier = options['tier']

        try:
            tenant = Tenant.objects.get(name=tenant_name)
        except Tenant.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Tenant "{tenant_name}" not found'))
            return

        if service_code == 'all':
            tenant_services = TenantService.objects.filter(tenant=tenant, is_enabled=True)
            count = tenant_services.update(tier=tier)
            self.stdout.write(self.style.SUCCESS(f'Updated {count} services to {tier} for {tenant_name}'))
        else:
            try:
                service = Service.objects.get(code=service_code)
                ts = TenantService.objects.get(tenant=tenant, service=service)
                ts.tier = tier
                ts.save()
                self.stdout.write(self.style.SUCCESS(f'Updated {service.name} to {tier} for {tenant_name}'))
            except (Service.DoesNotExist, TenantService.DoesNotExist) as e:
                self.stdout.write(self.style.ERROR(str(e)))
