from django.core.management.base import BaseCommand
from permit_to_work.models import PermitType, CloseoutChecklistTemplate


class Command(BaseCommand):
    help = 'Seed default permit types and templates'
    
    def handle(self, *args, **options):
        self.stdout.write('Seeding permit types...')
        
        permit_types = [
            {
                'name': 'Hot Work',
                'category': 'hot_work',
                'description': 'Welding, cutting, grinding, or other spark-producing activities',
                'color_code': '#FF5722',
                'risk_level': 'high',
                'validity_hours': 8,
                'requires_gas_testing': True,
                'requires_isolation': True,
                'mandatory_ppe': ['Fire-resistant clothing', 'Welding helmet', 'Safety gloves']
            },
            {
                'name': 'Confined Space Entry',
                'category': 'confined_space',
                'description': 'Entry into tanks, vessels, or enclosed spaces',
                'color_code': '#9C27B0',
                'risk_level': 'extreme',
                'validity_hours': 4,
                'requires_gas_testing': True,
                'requires_isolation': True,
                'mandatory_ppe': ['Breathing apparatus', 'Safety harness', 'Gas detector']
            },
            {
                'name': 'Electrical Work',
                'category': 'electrical',
                'description': 'Work on electrical systems and equipment',
                'color_code': '#FFC107',
                'risk_level': 'high',
                'validity_hours': 8,
                'requires_isolation': True,
                'mandatory_ppe': ['Insulated gloves', 'Safety shoes', 'Arc flash suit']
            },
            {
                'name': 'Work at Height',
                'category': 'height',
                'description': 'Work above 2 meters from ground level',
                'color_code': '#2196F3',
                'risk_level': 'high',
                'validity_hours': 8,
                'mandatory_ppe': ['Safety harness', 'Hard hat', 'Safety shoes']
            },
            {
                'name': 'Excavation',
                'category': 'excavation',
                'description': 'Digging, trenching, or ground disturbance',
                'color_code': '#795548',
                'risk_level': 'medium',
                'validity_hours': 8,
                'mandatory_ppe': ['Hard hat', 'Safety shoes', 'High-visibility vest']
            },
            {
                'name': 'Cold Work',
                'category': 'cold_work',
                'description': 'General maintenance and non-hazardous work',
                'color_code': '#4CAF50',
                'risk_level': 'low',
                'validity_hours': 24,
                'mandatory_ppe': ['Hard hat', 'Safety shoes']
            }
        ]
        
        created_count = 0
        for pt_data in permit_types:
            pt, created = PermitType.objects.get_or_create(
                name=pt_data['name'],
                defaults=pt_data
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  ✓ Created: {pt.name}'))
                
                # Create default closeout template
                CloseoutChecklistTemplate.objects.get_or_create(
                    permit_type=pt,
                    name=f'{pt.name} Closeout Checklist',
                    defaults={
                        'risk_level': pt.risk_level,
                        'items': [
                            {'key': 'work_completed', 'label': 'All work completed as per permit', 'required': True},
                            {'key': 'area_cleaned', 'label': 'Work area cleaned and restored', 'required': True},
                            {'key': 'tools_removed', 'label': 'All tools and equipment removed', 'required': True},
                            {'key': 'hazards_removed', 'label': 'All hazards eliminated', 'required': True},
                            {'key': 'isolation_restored', 'label': 'Isolation points restored (if applicable)', 'required': False},
                        ]
                    }
                )
        
        self.stdout.write(self.style.SUCCESS(f'\n✓ Seeded {created_count} permit types'))
        self.stdout.write(self.style.SUCCESS(f'✓ Total permit types: {PermitType.objects.count()}'))
