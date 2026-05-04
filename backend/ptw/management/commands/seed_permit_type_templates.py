from django.core.management.base import BaseCommand
from ptw.models import PermitType


CATEGORY_TEMPLATES = {
    'hot_work': {
        'sections': [
            {
                'id': 'hot_work_controls',
                'title': 'Hot Work Controls',
                'category': 'required',
                'fields': [
                    {'key': 'fire_watch_required', 'label': 'Fire watch required', 'type': 'boolean', 'default': True, 'required': True},
                    {'key': 'spark_containment', 'label': 'Spark containment in place', 'type': 'boolean', 'default': True, 'required': True},
                ],
            },
            {
                'id': 'hot_work_environment',
                'title': 'Hot Work Environment',
                'category': 'recommended',
                'fields': [
                    {'key': 'combustibles_removed', 'label': 'Combustibles removed', 'type': 'boolean', 'default': True, 'required': False},
                    {'key': 'ventilation_confirmed', 'label': 'Ventilation confirmed', 'type': 'boolean', 'default': True, 'required': False},
                ],
            },
        ],
        'prefill': {
            'ppe_requirements': ['helmet', 'gloves', 'face_shield', 'fire_resistant_clothing'],
            'safety_checklist': [
                'Hot work area cleared',
                'Fire extinguisher available',
                'Work area barricaded',
                'Hot work permit posted',
            ],
            'control_measures': [
                'Maintain fire watch during work',
                'Use spark containment where needed',
                'Verify ventilation before work',
            ],
            'emergency_procedures': [
                'Stop work and raise alarm',
                'Evacuate to designated assembly point',
                'Notify site emergency contact',
            ],
        },
        'references': [
            {'type': 'SOP', 'code': 'SOP-HW-01', 'title': 'Hot Work SOP', 'url': None},
            {'type': 'HIRA', 'code': 'HIRA-HW', 'title': 'Hot Work HIRA', 'url': None},
        ],
    },
    'confined_space': {
        'sections': [
            {
                'id': 'confined_space_entry',
                'title': 'Confined Space Entry',
                'category': 'required',
                'fields': [
                    {'key': 'entry_permit_valid', 'label': 'Entry permit valid', 'type': 'boolean', 'default': True, 'required': True},
                    {'key': 'attendant_assigned', 'label': 'Attendant assigned', 'type': 'boolean', 'default': True, 'required': True},
                ],
            },
            {
                'id': 'confined_space_rescue',
                'title': 'Rescue Preparedness',
                'category': 'required',
                'fields': [
                    {'key': 'rescue_plan_confirmed', 'label': 'Rescue plan confirmed', 'type': 'boolean', 'default': True, 'required': True},
                    {'key': 'communications_checked', 'label': 'Communications checked', 'type': 'boolean', 'default': True, 'required': True},
                ],
            },
        ],
        'prefill': {
            'ppe_requirements': ['helmet', 'gloves', 'harness', 'respirator'],
            'safety_checklist': [
                'Atmospheric testing completed',
                'Ventilation operating',
                'Entry/exit points clear',
            ],
            'control_measures': [
                'Continuous gas monitoring',
                'Maintain communication with attendant',
                'Use retrieval equipment',
            ],
            'emergency_procedures': [
                'Initiate rescue plan',
                'Notify emergency response',
                'Stop work and evacuate',
            ],
        },
        'references': [
            {'type': 'SOP', 'code': 'SOP-CS-01', 'title': 'Confined Space SOP', 'url': None},
            {'type': 'HIRA', 'code': 'HIRA-CS', 'title': 'Confined Space HIRA', 'url': None},
        ],
    },
    'electrical': {
        'sections': [
            {
                'id': 'electrical_isolation',
                'title': 'Electrical Isolation',
                'category': 'required',
                'fields': [
                    {'key': 'lockout_tagout_applied', 'label': 'Lockout/tagout applied', 'type': 'boolean', 'default': True, 'required': True},
                    {'key': 'energy_verified', 'label': 'Zero energy verified', 'type': 'boolean', 'default': True, 'required': True},
                ],
            },
            {
                'id': 'electrical_controls',
                'title': 'Electrical Controls',
                'category': 'recommended',
                'fields': [
                    {'key': 'insulated_tools_used', 'label': 'Insulated tools used', 'type': 'boolean', 'default': True, 'required': False},
                    {'key': 'arc_flash_boundary_set', 'label': 'Arc flash boundary set', 'type': 'boolean', 'default': True, 'required': False},
                ],
            },
        ],
        'prefill': {
            'ppe_requirements': ['helmet', 'gloves', 'electrical_ppe', 'face_shield'],
            'safety_checklist': [
                'Isolation verified',
                'Test equipment calibrated',
                'Warning signage posted',
            ],
            'control_measures': [
                'Apply lockout/tagout',
                'Verify zero energy state',
                'Use insulated tools',
            ],
            'emergency_procedures': [
                'Stop work and isolate source',
                'Provide first aid and notify emergency contact',
            ],
        },
        'references': [
            {'type': 'SOP', 'code': 'SOP-EL-01', 'title': 'Electrical SOP', 'url': None},
            {'type': 'HIRA', 'code': 'HIRA-EL', 'title': 'Electrical HIRA', 'url': None},
        ],
    },
    'height': {
        'sections': [
            {
                'id': 'work_at_height',
                'title': 'Work at Height',
                'category': 'required',
                'fields': [
                    {'key': 'fall_protection_in_place', 'label': 'Fall protection in place', 'type': 'boolean', 'default': True, 'required': True},
                    {'key': 'anchor_points_verified', 'label': 'Anchor points verified', 'type': 'boolean', 'default': True, 'required': True},
                ],
            },
            {
                'id': 'height_controls',
                'title': 'Height Controls',
                'category': 'recommended',
                'fields': [
                    {'key': 'tool_lanyards_used', 'label': 'Tool lanyards used', 'type': 'boolean', 'default': True, 'required': False},
                    {'key': 'drop_zone_established', 'label': 'Drop zone established', 'type': 'boolean', 'default': True, 'required': False},
                ],
            },
        ],
        'prefill': {
            'ppe_requirements': ['helmet', 'harness', 'gloves', 'shoes'],
            'safety_checklist': [
                'Fall protection inspected',
                'Access equipment checked',
                'Drop zone marked',
            ],
            'control_measures': [
                'Use approved fall protection',
                'Inspect ladders and scaffolds',
            ],
            'emergency_procedures': [
                'Stop work and secure area',
                'Notify rescue contact',
            ],
        },
        'references': [
            {'type': 'SOP', 'code': 'SOP-WH-01', 'title': 'Working at Height SOP', 'url': None},
            {'type': 'HIRA', 'code': 'HIRA-WH', 'title': 'Working at Height HIRA', 'url': None},
        ],
    },
    'excavation': {
        'sections': [
            {
                'id': 'excavation_controls',
                'title': 'Excavation Controls',
                'category': 'required',
                'fields': [
                    {'key': 'utilities_marked', 'label': 'Utilities marked', 'type': 'boolean', 'default': True, 'required': True},
                    {'key': 'shoring_in_place', 'label': 'Shoring or sloping in place', 'type': 'boolean', 'default': True, 'required': True},
                ],
            },
            {
                'id': 'excavation_monitoring',
                'title': 'Excavation Monitoring',
                'category': 'recommended',
                'fields': [
                    {'key': 'access_egress_provided', 'label': 'Access/egress provided', 'type': 'boolean', 'default': True, 'required': False},
                    {'key': 'competent_person_assigned', 'label': 'Competent person assigned', 'type': 'boolean', 'default': True, 'required': False},
                ],
            },
        ],
        'prefill': {
            'ppe_requirements': ['helmet', 'gloves', 'shoes', 'high_vis'],
            'safety_checklist': [
                'Excavation plan reviewed',
                'Soil conditions checked',
                'Barricades installed',
            ],
            'control_measures': [
                'Use shoring or sloping',
                'Keep spoil pile back from edge',
            ],
            'emergency_procedures': [
                'Stop work and evacuate trench',
                'Notify site emergency contact',
            ],
        },
        'references': [
            {'type': 'SOP', 'code': 'SOP-EX-01', 'title': 'Excavation SOP', 'url': None},
            {'type': 'HIRA', 'code': 'HIRA-EX', 'title': 'Excavation HIRA', 'url': None},
        ],
    },
    'crane_lifting': {
        'sections': [
            {
                'id': 'lifting_controls',
                'title': 'Lifting Controls',
                'category': 'required',
                'fields': [
                    {'key': 'lift_plan_reviewed', 'label': 'Lift plan reviewed', 'type': 'boolean', 'default': True, 'required': True},
                    {'key': 'rigging_inspected', 'label': 'Rigging inspected', 'type': 'boolean', 'default': True, 'required': True},
                ],
            },
            {
                'id': 'lifting_setup',
                'title': 'Lifting Setup',
                'category': 'recommended',
                'fields': [
                    {'key': 'exclusion_zone_set', 'label': 'Exclusion zone set', 'type': 'boolean', 'default': True, 'required': False},
                    {'key': 'operator_certified', 'label': 'Operator certified', 'type': 'boolean', 'default': True, 'required': False},
                ],
            },
        ],
        'prefill': {
            'ppe_requirements': ['helmet', 'gloves', 'shoes', 'high_vis'],
            'safety_checklist': [
                'Lift plan approved',
                'Load weight verified',
                'Rigging checked',
            ],
            'control_measures': [
                'Use approved lift plan',
                'Assign a signal person',
            ],
            'emergency_procedures': [
                'Stop lift and secure load',
                'Notify site emergency contact',
            ],
        },
        'references': [
            {'type': 'SOP', 'code': 'SOP-LF-01', 'title': 'Lifting SOP', 'url': None},
            {'type': 'HIRA', 'code': 'HIRA-LF', 'title': 'Lifting HIRA', 'url': None},
        ],
    },
}


class Command(BaseCommand):
    help = 'Seed PermitType.form_template defaults for common permit categories.'

    def handle(self, *args, **options):
        updated = 0
        for category, template in CATEGORY_TEMPLATES.items():
            permit_types = PermitType.objects.filter(category=category)
            for permit_type in permit_types:
                permit_type.form_template = {
                    'version': 1,
                    'sections': template['sections'],
                    'prefill': template['prefill'],
                    'references': template['references'],
                }
                permit_type.save(update_fields=['form_template'])
                updated += 1

        self.stdout.write(self.style.SUCCESS(f'Updated templates for {updated} permit types.'))
