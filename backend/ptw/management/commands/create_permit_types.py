from django.core.management.base import BaseCommand
from ptw.models import PermitType

class Command(BaseCommand):
    help = 'Create comprehensive permit types for world-class PTW system'

    def handle(self, *args, **options):
        permit_types = [
            # Hot Work Permits
            {
                'name': 'Hot Work - Arc Welding',
                'category': 'hot_work',
                'description': 'Electric arc welding operations including SMAW, GMAW, GTAW',
                'color_code': '#ff4d4f',
                'risk_level': 'high',
                'validity_hours': 8,
                'requires_gas_testing': True,
                'requires_fire_watch': True,
                'requires_isolation': True,
                'requires_training_verification': True,
                'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'coveralls', 'respirator'],
                'safety_checklist': [
                    'Welding machine inspected and grounded',
                    'Fire watch assigned for 30 minutes after work',
                    'Combustible materials removed 35ft radius',
                    'Fire extinguisher readily available',
                    'Welding screens/curtains in place',
                    'Ventilation adequate for fume removal',
                    'Electrode holders insulated'
                ],
                'risk_factors': ['Arc flash', 'Metal fumes', 'Fire/explosion', 'Electric shock'],
                'control_measures': ['Proper ventilation', 'Fire watch', 'PPE', 'Equipment grounding'],
                'emergency_procedures': ['Stop work immediately', 'Evacuate area', 'Call emergency services'],
                'min_personnel_required': 2
            },
            {
                'name': 'Hot Work - Gas Welding/Cutting',
                'category': 'hot_work',
                'description': 'Oxy-fuel welding and cutting operations',
                'color_code': '#ff4d4f',
                'risk_level': 'extreme',
                'validity_hours': 8,
                'requires_gas_testing': True,
                'requires_fire_watch': True,
                'requires_training_verification': True,
                'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'coveralls'],
                'safety_checklist': [
                    'Gas cylinders secured and chained',
                    'Flashback arrestors installed',
                    'Hoses inspected for damage',
                    'Regulators calibrated',
                    'Fire watch assigned',
                    'Emergency shutdown procedures reviewed'
                ],
                'risk_factors': ['Fire/explosion', 'Gas leaks', 'Flashback', 'Burns'],
                'control_measures': ['Proper gas handling', 'Flashback protection', 'Fire watch'],
                'min_personnel_required': 2
            },
            {
                'name': 'Hot Work - Cutting & Grinding',
                'category': 'hot_work',
                'description': 'Oxy-fuel cutting, plasma cutting, and grinding operations',
                'color_code': '#ff7a45',
                'risk_level': 'high',
                'validity_hours': 8,
                'requires_gas_testing': True,
                'requires_fire_watch': True,
                'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'face_shield'],
                'safety_checklist': [
                    'Fire watch assigned for 30 minutes after work',
                    'Spark arrestors installed where required',
                    'Adjacent areas protected from sparks',
                    'Cutting equipment inspected and certified'
                ]
            },
            {
                'name': 'Hot Work - Brazing & Soldering',
                'category': 'hot_work',
                'description': 'Brazing, soldering, and thermal operations',
                'color_code': '#ffa940',
                'risk_level': 'medium',
                'validity_hours': 8,
                'requires_fire_watch': True,
                'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles'],
                'safety_checklist': [
                    'Work area cleared of combustibles',
                    'Adequate ventilation provided',
                    'Fire extinguisher within 30ft'
                ]
            },

            # Confined Space Permits
            {
                'name': 'Confined Space - Entry',
                'category': 'confined_space',
                'description': 'Entry into tanks, vessels, manholes, and enclosed spaces',
                'color_code': '#722ed1',
                'risk_level': 'extreme',
                'validity_hours': 8,
                'requires_gas_testing': True,
                'requires_isolation': True,
                'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'harness', 'respirator', 'coveralls'],
                'safety_checklist': [
                    'Atmospheric testing completed (O2, LEL, H2S, CO)',
                    'Continuous gas monitoring in place',
                    'Mechanical ventilation operating',
                    'Entry supervisor assigned and present',
                    'Rescue team on standby',
                    'Communication system established',
                    'Emergency evacuation plan reviewed',
                    'All energy sources isolated and locked out'
                ]
            },
            {
                'name': 'Confined Space - Non-Entry',
                'category': 'confined_space',
                'description': 'Work on confined spaces without entry',
                'color_code': '#9254de',
                'risk_level': 'high',
                'validity_hours': 8,
                'requires_gas_testing': True,
                'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'respirator'],
                'safety_checklist': [
                    'Space isolated and purged',
                    'Atmospheric testing at opening',
                    'Ventilation provided if required'
                ]
            },

            # Electrical Work Permits
            {
                'name': 'Electrical - High Voltage (>1kV)',
                'category': 'electrical',
                'description': 'Work on electrical systems above 1000V',
                'color_code': '#fadb14',
                'risk_level': 'extreme',
                'validity_hours': 8,
                'requires_isolation': True,
                'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'coveralls', 'electrical_ppe'],
                'safety_checklist': [
                    'Electrical isolation completed and verified',
                    'LOTO procedures implemented',
                    'Qualified electrician assigned',
                    'Arc flash analysis completed',
                    'Appropriate arc flash PPE worn',
                    'Insulated tools used',
                    'Electrical safety boundaries established'
                ]
            },
            {
                'name': 'Electrical - Low Voltage (<1kV)',
                'category': 'electrical',
                'description': 'Work on electrical systems below 1000V',
                'color_code': '#fadb14',
                'risk_level': 'high',
                'validity_hours': 8,
                'requires_isolation': True,
                'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles'],
                'safety_checklist': [
                    'Circuit de-energized and locked out',
                    'Voltage testing completed',
                    'Qualified person supervising',
                    'Electrical PPE inspected'
                ]
            },
            {
                'name': 'Electrical - Live Work',
                'category': 'electrical',
                'description': 'Work on energized electrical equipment',
                'color_code': '#ff4d4f',
                'risk_level': 'extreme',
                'validity_hours': 4,
                'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'electrical_ppe', 'face_shield'],
                'safety_checklist': [
                    'Justification for energized work documented',
                    'Arc flash study completed',
                    'Appropriate arc flash PPE selected',
                    'Insulated tools and equipment used',
                    'Safety observer assigned',
                    'Emergency response plan in place'
                ]
            },

            # Work at Height Permits
            {
                'name': 'Work at Height - Scaffolding',
                'category': 'height',
                'description': 'Work on scaffolds above 6 feet',
                'color_code': '#1890ff',
                'risk_level': 'high',
                'validity_hours': 12,
                'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'harness'],
                'safety_checklist': [
                    'Scaffold inspected by competent person',
                    'Fall protection system in place',
                    'Guardrails installed where required',
                    'Access ladders secured',
                    'Weather conditions acceptable',
                    'Exclusion zone established below'
                ]
            },
            {
                'name': 'Work at Height - Ladder Work',
                'category': 'height',
                'description': 'Work using ladders above 6 feet',
                'color_code': '#40a9ff',
                'risk_level': 'medium',
                'validity_hours': 8,
                'mandatory_ppe': ['helmet', 'gloves', 'shoes'],
                'safety_checklist': [
                    'Ladder inspected before use',
                    'Proper ladder angle (4:1 ratio)',
                    'Ladder secured at top and bottom',
                    'Three-point contact maintained',
                    'Spotter assigned if required'
                ]
            },
            {
                'name': 'Work at Height - Rope Access',
                'category': 'height',
                'description': 'Industrial rope access work',
                'color_code': '#096dd9',
                'risk_level': 'extreme',
                'validity_hours': 8,
                'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'harness', 'rope_access_ppe'],
                'safety_checklist': [
                    'IRATA/SPRAT certified technicians',
                    'Rope access equipment inspected',
                    'Rescue plan established',
                    'Weather conditions suitable',
                    'Anchor points certified'
                ]
            },

            # Excavation Permits
            {
                'name': 'Excavation - Manual Digging',
                'category': 'excavation',
                'description': 'Hand digging and trenching operations',
                'color_code': '#8c8c8c',
                'risk_level': 'medium',
                'validity_hours': 8,
                'mandatory_ppe': ['helmet', 'gloves', 'shoes'],
                'safety_checklist': [
                    'Underground utilities located and marked',
                    'Excavation permit obtained',
                    'Soil conditions assessed',
                    'Proper sloping or shoring in place',
                    'Safe entry/exit provided'
                ]
            },
            {
                'name': 'Excavation - Mechanical',
                'category': 'excavation',
                'description': 'Machine excavation and trenching',
                'color_code': '#595959',
                'risk_level': 'high',
                'validity_hours': 8,
                'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'high_vis'],
                'safety_checklist': [
                    'Utility clearance obtained',
                    'Competent person assigned',
                    'Excavation equipment inspected',
                    'Spoil pile placement planned',
                    'Traffic control measures in place'
                ]
            },

            # Chemical Work Permits
            {
                'name': 'Chemical Handling - Hazardous',
                'category': 'chemical',
                'description': 'Work with hazardous chemicals and substances',
                'color_code': '#fa8c16',
                'risk_level': 'high',
                'validity_hours': 8,
                'requires_gas_testing': True,
                'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'chemical_suit', 'respirator'],
                'safety_checklist': [
                    'SDS reviewed for all chemicals',
                    'Chemical compatibility verified',
                    'Spill response kit available',
                    'Emergency shower/eyewash accessible',
                    'Proper ventilation provided',
                    'Waste disposal plan in place'
                ]
            },
            {
                'name': 'Chemical Handling - Corrosive',
                'category': 'chemical',
                'description': 'Work with acids, bases, and corrosive materials',
                'color_code': '#fa541c',
                'risk_level': 'high',
                'validity_hours': 8,
                'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'chemical_suit', 'face_shield'],
                'safety_checklist': [
                    'Chemical resistant PPE selected',
                    'Emergency neutralization available',
                    'Secondary containment in place',
                    'Personnel trained in chemical hazards'
                ]
            },

            # Crane and Lifting Operations
            {
                'name': 'Crane Operations - Mobile Crane',
                'category': 'crane_lifting',
                'description': 'Mobile crane lifting operations',
                'color_code': '#52c41a',
                'risk_level': 'high',
                'validity_hours': 8,
                'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'high_vis'],
                'safety_checklist': [
                    'Crane operator certified and current',
                    'Crane inspection completed',
                    'Lift plan prepared and reviewed',
                    'Ground conditions assessed',
                    'Load weight verified',
                    'Rigging equipment inspected',
                    'Exclusion zone established',
                    'Signal person assigned if required'
                ]
            },
            {
                'name': 'Crane Operations - Overhead Crane',
                'category': 'crane_lifting',
                'description': 'Overhead and bridge crane operations',
                'color_code': '#73d13d',
                'risk_level': 'medium',
                'validity_hours': 8,
                'mandatory_ppe': ['helmet', 'gloves', 'shoes'],
                'safety_checklist': [
                    'Crane pre-operational check completed',
                    'Load capacity not exceeded',
                    'Proper rigging techniques used',
                    'Clear communication established'
                ]
            },
            {
                'name': 'Rigging Operations',
                'category': 'crane_lifting',
                'description': 'Rigging and slinging operations',
                'color_code': '#95de64',
                'risk_level': 'medium',
                'validity_hours': 8,
                'mandatory_ppe': ['helmet', 'gloves', 'shoes'],
                'safety_checklist': [
                    'Rigger certified and qualified',
                    'Rigging hardware inspected',
                    'Load weight and center of gravity known',
                    'Proper sling angles maintained'
                ]
            },

            # Cold Work Permits
            {
                'name': 'Cold Work - General Maintenance',
                'category': 'cold_work',
                'description': 'General maintenance and repair work',
                'color_code': '#13c2c2',
                'risk_level': 'low',
                'validity_hours': 12,
                'mandatory_ppe': ['helmet', 'gloves', 'shoes'],
                'safety_checklist': [
                    'Work area inspected for hazards',
                    'Tools and equipment inspected',
                    'Housekeeping standards maintained'
                ]
            },
            {
                'name': 'Cold Work - Mechanical',
                'category': 'cold_work',
                'description': 'Mechanical work without heat generation',
                'color_code': '#36cfc9',
                'risk_level': 'low',
                'validity_hours': 12,
                'requires_isolation': True,
                'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles'],
                'safety_checklist': [
                    'Equipment isolated and locked out',
                    'Stored energy released',
                    'Work procedures reviewed'
                ]
            },

            # Specialized Permits
            {
                'name': 'Radiography Work',
                'category': 'specialized',
                'description': 'Industrial radiography and NDT work',
                'color_code': '#f759ab',
                'risk_level': 'extreme',
                'validity_hours': 8,
                'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'radiation_badge', 'lead_apron'],
                'safety_checklist': [
                    'Radiation safety officer present',
                    'Exclusion zone established',
                    'Radiation monitoring equipment calibrated',
                    'Emergency response procedures reviewed',
                    'Personnel dosimetry current'
                ]
            },
            {
                'name': 'Pressure Testing',
                'category': 'specialized',
                'description': 'Hydrostatic and pneumatic pressure testing',
                'color_code': '#ff85c0',
                'risk_level': 'high',
                'validity_hours': 8,
                'requires_isolation': True,
                'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'face_shield'],
                'safety_checklist': [
                    'Test procedure approved by engineer',
                    'Pressure relief systems functional',
                    'Test equipment calibrated',
                    'Personnel clear of test area',
                    'Emergency shutdown procedures established'
                ]
            },
            {
                'name': 'Asbestos Work',
                'category': 'specialized',
                'description': 'Asbestos removal and abatement work',
                'color_code': '#d3adf7',
                'risk_level': 'extreme',
                'validity_hours': 8,
                'requires_gas_testing': True,
                'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'respirator', 'disposable_coveralls'],
                'safety_checklist': [
                    'Asbestos survey completed',
                    'Licensed contractor performing work',
                    'Containment area established',
                    'Air monitoring in place',
                    'Waste disposal plan approved'
                ]
            },
            {
                'name': 'Demolition Work',
                'category': 'specialized',
                'description': 'Structural demolition operations',
                'color_code': '#ff7875',
                'risk_level': 'extreme',
                'validity_hours': 8,
                'requires_isolation': True,
                'mandatory_ppe': ['helmet', 'gloves', 'shoes', 'goggles', 'coveralls', 'respirator'],
                'safety_checklist': [
                    'Structural engineer approval obtained',
                    'Utilities disconnected and verified',
                    'Hazardous materials survey completed',
                    'Demolition sequence planned',
                    'Public protection measures in place',
                    'Emergency response plan established'
                ]
            }
        ]

        created_count = 0
        for permit_data in permit_types:
            permit_type, created = PermitType.objects.get_or_create(
                name=permit_data['name'],
                defaults=permit_data
            )
            if created:
                created_count += 1
                self.stdout.write(f"Created: {permit_type.name}")
            else:
                # Update existing permit type
                for key, value in permit_data.items():
                    setattr(permit_type, key, value)
                permit_type.save()
                self.stdout.write(f"Updated: {permit_type.name}")

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created/updated {len(permit_types)} permit types ({created_count} new)')
        )