from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from quality.models import QualityTemplate

User = get_user_model()

class Command(BaseCommand):
    help = 'Create default quality templates for solar and wind industries'

    def handle(self, *args, **options):
        user, created = User.objects.get_or_create(
            username='system',
            defaults={'email': 'system@example.com', 'is_staff': True}
        )

        # Solar Templates
        solar_templates = [
            {
                'name': 'Solar Module Inward Inspection',
                'industry': 'solar',
                'inspection_type': 'inward',
                'description': 'Quality inspection for incoming solar modules',
                'checklist_items': [
                    {'name': 'Cell Efficiency (%)', 'type': 'number', 'required': True, 'tolerance': {'min': 20, 'max': 25}},
                    {'name': 'EL Test Result', 'type': 'select', 'required': True, 'options': ['Pass', 'Fail']},
                    {'name': 'IV Curve Validation', 'type': 'select', 'required': True, 'options': ['Pass', 'Fail']},
                    {'name': 'Frame Alignment', 'type': 'select', 'required': True, 'options': ['Good', 'Acceptable', 'Poor']}
                ],
                'failure_codes': [
                    {'code': 'MC001', 'description': 'Micro-cracks detected', 'severity': 'major'},
                    {'code': 'DL001', 'description': 'Delamination found', 'severity': 'critical'},
                    {'code': 'PID001', 'description': 'Potential Induced Degradation', 'severity': 'major'}
                ],
                'compliance_standards': [
                    {'name': 'IEC 61215', 'version': '2016'},
                    {'name': 'IEC 61730', 'version': '2016'}
                ]
            },
            {
                'name': 'Wind Blade Inward Inspection',
                'industry': 'wind',
                'inspection_type': 'inward',
                'description': 'Quality inspection for wind turbine blades',
                'checklist_items': [
                    {'name': 'Blade Length (m)', 'type': 'number', 'required': True, 'tolerance': {'min': 40, 'max': 120}},
                    {'name': 'Ultrasonic Test Result', 'type': 'select', 'required': True, 'options': ['Pass', 'Fail']},
                    {'name': 'Surface Finish Quality', 'type': 'select', 'required': True, 'options': ['Excellent', 'Good', 'Poor']},
                    {'name': 'Lightning Protection', 'type': 'select', 'required': True, 'options': ['Installed', 'Missing']}
                ],
                'failure_codes': [
                    {'code': 'SC001', 'description': 'Surface cracks detected', 'severity': 'critical'},
                    {'code': 'UT001', 'description': 'Ultrasonic test failure', 'severity': 'critical'}
                ],
                'compliance_standards': [
                    {'name': 'IEC 61400', 'version': '2019'},
                    {'name': 'ISO 9001', 'version': '2015'}
                ]
            }
        ]

        for template_data in solar_templates:
            template, created = QualityTemplate.objects.get_or_create(
                name=template_data['name'],
                industry=template_data['industry'],
                inspection_type=template_data['inspection_type'],
                defaults={
                    'description': template_data['description'],
                    'checklist_items': template_data['checklist_items'],
                    'failure_codes': template_data['failure_codes'],
                    'compliance_standards': template_data['compliance_standards'],
                    'created_by': user
                }
            )
            
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created template: {template.name}'))

        self.stdout.write(self.style.SUCCESS('Quality templates created successfully'))