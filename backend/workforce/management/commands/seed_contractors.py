from django.core.management.base import BaseCommand
from workforce.models_contractor import ContractorMaster

SAMPLE_CONTRACTORS = [
    {
        'company_type': 'contractor',
        'company_name': 'Athena Constructions Pvt Ltd',
        'company_address': '12, Industrial Estate, Chennai - 600032',
        'contact_person': 'Rajesh Kumar',
        'contact_number': '9876543210',
        'email': 'contact@athena-constructions.com',
        'pan_number': 'AABCA1234C',
        'gst_number': '33AABCA1234C1Z5',
    },
    {
        'company_type': 'contractor',
        'company_name': 'ABC Engineering Services',
        'company_address': '45, SIDCO Industrial Area, Coimbatore - 641021',
        'contact_person': 'Arun Prakash',
        'contact_number': '9876543211',
        'email': 'info@abcengineering.com',
        'pan_number': 'AABCB5678D',
        'gst_number': '33AABCB5678D1Z3',
    },
    {
        'company_type': 'contractor',
        'company_name': 'Sri Balaji Contractors',
        'company_address': '78, Anna Nagar, Madurai - 625020',
        'contact_person': 'Suresh Babu',
        'contact_number': '9876543212',
        'email': 'balaji@sribalaji.com',
        'pan_number': 'AABCC9012E',
        'gst_number': '33AABCC9012E1Z1',
    },
    {
        'company_type': 'contractor',
        'company_name': 'TechBuild Infra Pvt Ltd',
        'company_address': '23, Guindy Industrial Estate, Chennai - 600032',
        'contact_person': 'Karthik R',
        'contact_number': '9876543213',
        'email': 'info@techbuildinfra.com',
        'pan_number': 'AABCD3456F',
        'gst_number': '33AABCD3456F1Z9',
    },
    {
        'company_type': 'contractor',
        'company_name': 'Global Industrial Solutions',
        'company_address': '56, Ambattur Industrial Estate, Chennai - 600058',
        'contact_person': 'Manoj Kumar',
        'contact_number': '9876543214',
        'email': 'global@gisindia.com',
        'pan_number': 'AABCE7890G',
        'gst_number': '33AABCE7890G1Z7',
    },
    {
        'company_type': 'epc',
        'company_name': 'Renew Power EPC Division',
        'company_address': '1, Rajiv Gandhi Salai, Chennai - 600119',
        'contact_person': 'Priya Nair',
        'contact_number': '9876543215',
        'email': 'epc@renewpower.in',
        'pan_number': 'AABCF2345H',
        'gst_number': '33AABCF2345H1Z5',
    },
    {
        'company_type': 'contractor',
        'company_name': 'Sai Electrical Works',
        'company_address': '34, Peenya Industrial Area, Bengaluru - 560058',
        'contact_person': 'Venkatesh S',
        'contact_number': '9876543216',
        'email': 'sai@saielectrical.com',
        'pan_number': 'AABCG6789I',
        'gst_number': '29AABCG6789I1Z3',
    },
]


class Command(BaseCommand):
    help = 'Seed sample contractor data for all active tenants'

    def add_arguments(self, parser):
        parser.add_argument('--tenant-id', type=int, help='Seed only for a specific tenant ID')

    def handle(self, *args, **options):
        from control_plane.models import Tenant

        tenant_id = options.get('tenant_id')
        tenants = Tenant.objects.filter(id=tenant_id) if tenant_id else Tenant.objects.filter(is_active=True)

        if not tenants.exists():
            self.stdout.write(self.style.WARNING('No active tenants found.'))
            return

        total_created = 0
        for tenant in tenants:
            created_count = 0
            for data in SAMPLE_CONTRACTORS:
                _, created = ContractorMaster.objects.get_or_create(
                    athens_tenant_id=tenant.id,
                    company_name=data['company_name'],
                    defaults={**data, 'status': 'active'},
                )
                if created:
                    created_count += 1
            self.stdout.write(self.style.SUCCESS(
                f'Tenant "{tenant.name}" (id={tenant.id}): {created_count} created, '
                f'{len(SAMPLE_CONTRACTORS) - created_count} already existed.'
            ))
            total_created += created_count

        self.stdout.write(self.style.SUCCESS(f'\nDone. Total new records: {total_created}'))
