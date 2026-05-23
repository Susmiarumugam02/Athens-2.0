from django.core.management.base import BaseCommand
from inspection.models import InspectionTemplate


EHS_REP_TEMPLATE = {
    "name": "EHS Representative Inspection Checklist",
    "category": "ehs",
    "description": (
        "Environmental, Health and Safety (EHS) Representative Inspection Checklist. "
        "Permission to use/nationally from NAIA-ASTEC (1080). "
        "Covers Aisles/Exits, Compressed Gas, Emergency Info, Fire Safety, PPE, and Hazard Communication."
    ),
    "version": "1.0",
    "header_fields": [
        {"key": "inspector_name", "label": "Inspector Name", "type": "text", "required": True},
        {"key": "lab_print", "label": "Lab/Print", "type": "text", "required": False},
        {"key": "building", "label": "Building", "type": "text", "required": True},
        {"key": "date", "label": "Date", "type": "date", "required": True},
    ],
    "sections": [
        {
            "section": "Aisles / Exits / Egress",
            "items": [
                {
                    "id": "ae_1",
                    "text": "Minimum width of any aisle leading to an exit is at least 44 inches wide.",
                    "hint": "",
                },
                {
                    "id": "ae_2",
                    "text": "Are all aisles/walkways free of debris and readily accessible at all times?",
                    "hint": "",
                },
                {
                    "id": "ae_3",
                    "text": "Is emergency lighting operating? (Test by pushing the test button if you can do so from the ground.)",
                    "hint": "",
                },
                {
                    "id": "ae_4",
                    "text": "Can you see emergency exit signs from your area?",
                    "hint": "",
                },
                {
                    "id": "ae_5",
                    "text": "Are all corridors/passageways kept free of obstructions with trip hazards minimized to permit visibility and movement?",
                    "hint": "",
                },
                {
                    "id": "ae_6",
                    "text": "Are doors not used for egress (closets, offices, etc.) that could incorrectly be thought to be an exit marked 'NOT AN EXIT'?",
                    "hint": "",
                },
                {
                    "id": "ae_7",
                    "text": "Are floor surfaces clean, dry, level, not slippery or sticky and in good condition?",
                    "hint": "",
                },
            ],
        },
        {
            "section": "Compressed Gas Cylinders",
            "items": [
                {
                    "id": "cg_8",
                    "text": "Are cylinders legibly marked to clearly identify the gas contained?",
                    "hint": "",
                },
                {
                    "id": "cg_9",
                    "text": "Are cylinders stored away from heat source and do they have separation between flammables and oxidizers?",
                    "hint": "",
                },
                {
                    "id": "cg_10",
                    "text": "Are cylinders located or stored in a manner to prevent them from creating a hazard by tipping, falling, or rolling? The cylinders should be stored upright and chained with protective cap in place (lined firmly against containers).",
                    "hint": "",
                },
                {
                    "id": "cg_11",
                    "text": "Are valve protector caps placed on cylinders when not in use?",
                    "hint": "",
                },
                {
                    "id": "cg_12",
                    "text": "Are flammables and combustibles stored properly?",
                    "hint": "",
                },
            ],
        },
        {
            "section": "Emergency, Health and Safety Information",
            "items": [
                {
                    "id": "eh_13",
                    "text": "Is there an emergency hazard sign visible, legible, understandable and in compliance with regulations?",
                    "hint": "",
                },
                {
                    "id": "eh_14",
                    "text": "Are procedures established for alerting employees of an emergency in the workplace (i.e., fire and shelter)?",
                    "hint": "",
                },
                {
                    "id": "eh_15",
                    "text": "Are fire alarm pull station locations marked and unobstructed?",
                    "hint": "",
                },
                {
                    "id": "eh_16",
                    "text": "Are signs for emergency numbers, fire extinguishers, and eyewash posted?",
                    "hint": "",
                },
                {
                    "id": "eh_17",
                    "text": "Are the Evacuation Coordinators and PI/Safety Designates assigned?",
                    "hint": "",
                },
                {
                    "id": "eh_18",
                    "text": "Do employees know their Evacuation Coordinators and PI/Safety Designates?",
                    "hint": "Record Evacuation Coordinator and Alternate Number in remarks.",
                },
                {
                    "id": "eh_19",
                    "text": "Does the Evacuation Coordinators have their numbers readily available, functional?",
                    "hint": "",
                },
                {
                    "id": "eh_20",
                    "text": "Is a copy of the Evacuation Action Plan (EAP) for the area available for the employees to read?",
                    "hint": "",
                },
                {
                    "id": "eh_21",
                    "text": "Are employees trained on emergency procedures (primary and secondary routes)? Do they know where to go?",
                    "hint": "",
                },
                {
                    "id": "eh_22",
                    "text": "Does the EAP include a way to alert employees, including disabled workers, to evacuate, take other action and include instructions on how to report emergencies?",
                    "hint": "",
                },
            ],
        },
        {
            "section": "Fire Safety",
            "items": [
                {
                    "id": "fs_23",
                    "text": "Are fire extinguishers mounted, located, and identified so that they are readily accessible to employees without subjecting them to possible injury?",
                    "hint": "",
                },
                {
                    "id": "fs_24",
                    "text": "Are fire extinguishers fully charged and in operable condition?",
                    "hint": "",
                },
                {
                    "id": "fs_25",
                    "text": "Are fire extinguishers inspected monthly (check tag)?",
                    "hint": "",
                },
                {
                    "id": "fs_26",
                    "text": "Is there at least 18 inches of clearance below sprinkler heads?",
                    "hint": "",
                },
                {
                    "id": "fs_27",
                    "text": "Are sprinkler heads free of paint, corrosion, or physical damage?",
                    "hint": "",
                },
                {
                    "id": "fs_28",
                    "text": "Are combustible materials stored away from heat sources?",
                    "hint": "",
                },
            ],
        },
        {
            "section": "Personal Protective Equipment (PPE)",
            "items": [
                {
                    "id": "ppe_29",
                    "text": "Is appropriate PPE available and accessible for the tasks being performed?",
                    "hint": "",
                },
                {
                    "id": "ppe_30",
                    "text": "Are employees using required PPE correctly?",
                    "hint": "",
                },
                {
                    "id": "ppe_31",
                    "text": "Is PPE in good condition (no damage, expiry checked)?",
                    "hint": "",
                },
                {
                    "id": "ppe_32",
                    "text": "Are eyewash stations accessible and functional?",
                    "hint": "",
                },
            ],
        },
        {
            "section": "Hazard Communication",
            "items": [
                {
                    "id": "hc_33",
                    "text": "Are all chemical containers properly labeled with identity and hazard warnings?",
                    "hint": "",
                },
                {
                    "id": "hc_34",
                    "text": "Are Safety Data Sheets (SDS) readily accessible to employees for all hazardous chemicals in the workplace?",
                    "hint": "",
                },
                {
                    "id": "hc_35",
                    "text": "Have employees been trained on the hazardous chemicals in their work area?",
                    "hint": "",
                },
                {
                    "id": "hc_36",
                    "text": "Are hazardous materials stored properly and segregated as required?",
                    "hint": "",
                },
            ],
        },
    ],
}


MONTHLY_EHS_TEMPLATE = {
    "name": "Monthly EHS Checklist",
    "category": "monthly_audit",
    "description": (
        "Monthly Environmental, Health and Safety (EHS) Checklist for systematic "
        "departmental safety audits. Covers Housekeeping, Electrical Safety, PPE, "
        "Fire Protection, Chemical Storage, Waste Management, Machine Safety, and Emergency Preparedness."
    ),
    "version": "1.0",
    "header_fields": [
        {"key": "department", "label": "Department", "type": "text", "required": True},
        {"key": "work_area", "label": "Work Area", "type": "text", "required": True},
        {"key": "date", "label": "Date", "type": "date", "required": True},
        {"key": "auditor_name", "label": "Auditor Name", "type": "text", "required": True},
    ],
    "sections": [
        {
            "section": "Housekeeping",
            "items": [
                {
                    "id": "hk_1",
                    "text": "Work areas are clean and free from unnecessary materials.",
                    "hint": "Check floors, benches, and storage areas.",
                },
                {
                    "id": "hk_2",
                    "text": "Waste bins are available, clearly labelled, and not overflowing.",
                    "hint": "",
                },
                {
                    "id": "hk_3",
                    "text": "Walkways and aisles are clear and unobstructed.",
                    "hint": "",
                },
                {
                    "id": "hk_4",
                    "text": "Spills are cleaned up promptly and spill kits are available.",
                    "hint": "",
                },
                {
                    "id": "hk_5",
                    "text": "Materials and tools are stored properly after use.",
                    "hint": "",
                },
                {
                    "id": "hk_6",
                    "text": "Any other observation (Housekeeping).",
                    "hint": "Record any additional observations.",
                },
            ],
        },
        {
            "section": "Electrical Safety",
            "items": [
                {
                    "id": "es_7",
                    "text": "Electrical panels are accessible, labelled, and not blocked.",
                    "hint": "Minimum 36-inch clearance required.",
                },
                {
                    "id": "es_8",
                    "text": "Extension cords are used properly (not daisy-chained, not under rugs).",
                    "hint": "",
                },
                {
                    "id": "es_9",
                    "text": "All electrical equipment is in good condition (no frayed cords, exposed wires).",
                    "hint": "",
                },
                {
                    "id": "es_10",
                    "text": "LOTO (Lockout/Tagout) procedures are posted and followed.",
                    "hint": "",
                },
                {
                    "id": "es_11",
                    "text": "Any other observation (Electrical Safety).",
                    "hint": "",
                },
            ],
        },
        {
            "section": "PPE Compliance",
            "items": [
                {
                    "id": "ppe_12",
                    "text": "Employees are wearing required PPE for their tasks.",
                    "hint": "Helmet, gloves, safety shoes, goggles, vest as applicable.",
                },
                {
                    "id": "ppe_13",
                    "text": "PPE is in good condition and properly maintained.",
                    "hint": "",
                },
                {
                    "id": "ppe_14",
                    "text": "PPE storage areas are clean and organised.",
                    "hint": "",
                },
                {
                    "id": "ppe_15",
                    "text": "Any other observation (PPE Compliance).",
                    "hint": "",
                },
            ],
        },
        {
            "section": "Fire Protection",
            "items": [
                {
                    "id": "fp_16",
                    "text": "Fire extinguishers are present, charged, and inspection tags are current.",
                    "hint": "",
                },
                {
                    "id": "fp_17",
                    "text": "Fire exits and escape routes are clearly marked and unobstructed.",
                    "hint": "",
                },
                {
                    "id": "fp_18",
                    "text": "Fire alarm system is functional (test monthly).",
                    "hint": "",
                },
                {
                    "id": "fp_19",
                    "text": "No smoking policy is enforced in designated areas.",
                    "hint": "",
                },
                {
                    "id": "fp_20",
                    "text": "Any other observation (Fire Protection).",
                    "hint": "",
                },
            ],
        },
        {
            "section": "Chemical Storage",
            "items": [
                {
                    "id": "cs_21",
                    "text": "All chemicals are properly labelled with GHS/SDS labels.",
                    "hint": "",
                },
                {
                    "id": "cs_22",
                    "text": "Incompatible chemicals are segregated.",
                    "hint": "Flammables away from oxidisers, acids away from bases.",
                },
                {
                    "id": "cs_23",
                    "text": "Chemical storage areas are ventilated and secondary containment is in place.",
                    "hint": "",
                },
                {
                    "id": "cs_24",
                    "text": "SDS sheets are accessible for all chemicals on site.",
                    "hint": "",
                },
                {
                    "id": "cs_25",
                    "text": "Any other observation (Chemical Storage).",
                    "hint": "",
                },
            ],
        },
        {
            "section": "Waste Management",
            "items": [
                {
                    "id": "wm_26",
                    "text": "Waste is segregated at source (general, hazardous, recyclable).",
                    "hint": "",
                },
                {
                    "id": "wm_27",
                    "text": "Hazardous waste containers are labelled and stored correctly.",
                    "hint": "",
                },
                {
                    "id": "wm_28",
                    "text": "Waste disposal records are maintained and up to date.",
                    "hint": "",
                },
                {
                    "id": "wm_29",
                    "text": "Any other observation (Waste Management).",
                    "hint": "",
                },
            ],
        },
        {
            "section": "Machine Safety",
            "items": [
                {
                    "id": "ms_30",
                    "text": "All machine guards are in place and functioning.",
                    "hint": "",
                },
                {
                    "id": "ms_31",
                    "text": "Emergency stop buttons are accessible and clearly marked.",
                    "hint": "",
                },
                {
                    "id": "ms_32",
                    "text": "Machines are maintained per schedule and maintenance records are available.",
                    "hint": "",
                },
                {
                    "id": "ms_33",
                    "text": "Operators are trained and authorised for the equipment they operate.",
                    "hint": "",
                },
                {
                    "id": "ms_34",
                    "text": "Any other observation (Machine Safety).",
                    "hint": "",
                },
            ],
        },
        {
            "section": "Emergency Preparedness",
            "items": [
                {
                    "id": "ep_35",
                    "text": "Emergency contact numbers are posted and visible.",
                    "hint": "",
                },
                {
                    "id": "ep_36",
                    "text": "First aid kits are stocked, accessible, and inspection records are current.",
                    "hint": "",
                },
                {
                    "id": "ep_37",
                    "text": "Emergency evacuation plan is posted and employees are aware of muster points.",
                    "hint": "",
                },
                {
                    "id": "ep_38",
                    "text": "Emergency drills have been conducted in the last 6 months.",
                    "hint": "",
                },
                {
                    "id": "ep_39",
                    "text": "Any other observation (Emergency Preparedness).",
                    "hint": "",
                },
            ],
        },
    ],
}


class Command(BaseCommand):
    help = 'Seed EHS inspection sample templates into the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Re-seed even if templates already exist (updates existing records)',
        )

    def handle(self, *args, **options):
        force = options['force']
        templates = [EHS_REP_TEMPLATE, MONTHLY_EHS_TEMPLATE]
        created_count = 0
        updated_count = 0

        for tpl in templates:
            obj, created = InspectionTemplate.objects.update_or_create(
                name=tpl['name'],
                defaults={
                    'category': tpl['category'],
                    'description': tpl['description'],
                    'sections': tpl['sections'],
                    'header_fields': tpl['header_fields'],
                    'version': tpl['version'],
                    'is_sample': True,
                    'is_active': True,
                },
            ) if force else InspectionTemplate.objects.get_or_create(
                name=tpl['name'],
                defaults={
                    'category': tpl['category'],
                    'description': tpl['description'],
                    'sections': tpl['sections'],
                    'header_fields': tpl['header_fields'],
                    'version': tpl['version'],
                    'is_sample': True,
                    'is_active': True,
                },
            )

            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  Created: {obj.name}'))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f'  Already exists (skipped): {obj.name}'))

        self.stdout.write(
            self.style.SUCCESS(
                f'\nDone. {created_count} created, {updated_count} skipped. '
                f'Use --force to update existing templates.'
            )
        )
