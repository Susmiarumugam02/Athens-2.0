import copy
from typing import Any, Dict, List, Optional

DEFAULT_TEMPLATE_VERSION = 1


def _merge_list(base_list: List[Any], override: Any) -> Any:
    if isinstance(override, dict) and override.get('replace') is True:
        items = override.get('items')
        if isinstance(items, list):
            return copy.deepcopy(items)
    if isinstance(override, list):
        merged = list(base_list)
        for item in override:
            if item not in merged:
                merged.append(item)
        return merged
    return copy.deepcopy(override)


def deep_merge(base: Any, override: Any) -> Any:
    if override is None:
        return copy.deepcopy(base)
    if isinstance(base, dict) and isinstance(override, dict):
        result = copy.deepcopy(base)
        for key, value in override.items():
            if key in result:
                result[key] = deep_merge(result[key], value)
            else:
                result[key] = copy.deepcopy(value)
        return result
    if isinstance(base, list):
        return _merge_list(base, override)
    return copy.deepcopy(override)


def _default_references(permit_type) -> List[Dict[str, Any]]:
    category_code = (permit_type.category or 'GEN')[:3].upper()
    name = permit_type.name or 'Permit'
    return [
        {
            'type': 'SOP',
            'code': f'SOP-{category_code}-001',
            'title': f'{name} SOP',
            'url': None,
        },
        {
            'type': 'HIRA',
            'code': f'HIRA-{category_code}-001',
            'title': f'{name} HIRA',
            'url': None,
        },
    ]


def _category_sections(category: str) -> List[Dict[str, Any]]:
    sections = {
        'hot_work': {
            'id': 'hot_work_controls',
            'title': 'Hot Work Controls',
            'category': 'required',
            'fields': [
                {
                    'key': 'hot_work_area_cleared',
                    'label': 'Hot work area cleared of combustibles',
                    'type': 'boolean',
                    'default': True,
                    'required': True,
                    'help': 'Confirm the hot work area is free of ignition sources.',
                },
                {
                    'key': 'fire_watch_assigned',
                    'label': 'Fire watch assigned',
                    'type': 'boolean',
                    'default': True,
                    'required': True,
                    'help': 'Assign a trained fire watch for the task.',
                },
                {
                    'key': 'spark_containment_in_place',
                    'label': 'Spark containment in place',
                    'type': 'boolean',
                    'default': True,
                    'required': True,
                    'help': 'Use screens, blankets, or barriers as needed.',
                },
            ],
        },
        'confined_space': {
            'id': 'confined_space_entry',
            'title': 'Confined Space Entry',
            'category': 'required',
            'fields': [
                {
                    'key': 'entry_supervisor_assigned',
                    'label': 'Entry supervisor assigned',
                    'type': 'boolean',
                    'default': True,
                    'required': True,
                    'help': 'Confirm supervisory oversight for entry.',
                },
                {
                    'key': 'attendant_assigned',
                    'label': 'Attendant assigned',
                    'type': 'boolean',
                    'default': True,
                    'required': True,
                    'help': 'Ensure a standby attendant is present.',
                },
                {
                    'key': 'rescue_plan_confirmed',
                    'label': 'Rescue plan confirmed',
                    'type': 'boolean',
                    'default': True,
                    'required': True,
                    'help': 'Verify rescue arrangements before entry.',
                },
            ],
        },
        'electrical': {
            'id': 'electrical_controls',
            'title': 'Electrical Controls',
            'category': 'required',
            'fields': [
                {
                    'key': 'lockout_tagout_applied',
                    'label': 'Lockout/tagout applied',
                    'type': 'boolean',
                    'default': True,
                    'required': True,
                    'help': 'Verify energy isolation controls are applied.',
                },
                {
                    'key': 'voltage_verified',
                    'label': 'Zero energy verified',
                    'type': 'boolean',
                    'default': True,
                    'required': True,
                    'help': 'Confirm equipment is de-energized.',
                },
                {
                    'key': 'insulated_tools_used',
                    'label': 'Insulated tools used',
                    'type': 'boolean',
                    'default': True,
                    'required': False,
                    'help': 'Use insulated tools where applicable.',
                },
            ],
        },
        'height': {
            'id': 'work_at_height',
            'title': 'Work at Height',
            'category': 'required',
            'fields': [
                {
                    'key': 'fall_protection_inspected',
                    'label': 'Fall protection inspected',
                    'type': 'boolean',
                    'default': True,
                    'required': True,
                    'help': 'Verify harnesses, lanyards, and anchors.',
                },
                {
                    'key': 'drop_zone_established',
                    'label': 'Drop zone established',
                    'type': 'boolean',
                    'default': True,
                    'required': True,
                    'help': 'Set exclusion areas below the work zone.',
                },
            ],
        },
        'excavation': {
            'id': 'excavation_controls',
            'title': 'Excavation Controls',
            'category': 'required',
            'fields': [
                {
                    'key': 'utilities_located',
                    'label': 'Underground utilities located',
                    'type': 'boolean',
                    'default': True,
                    'required': True,
                    'help': 'Confirm utility marking before digging.',
                },
                {
                    'key': 'shoring_or_sloping_in_place',
                    'label': 'Shoring or sloping in place',
                    'type': 'boolean',
                    'default': True,
                    'required': True,
                    'help': 'Ensure trench protection is applied.',
                },
            ],
        },
        'crane_lifting': {
            'id': 'lifting_controls',
            'title': 'Lifting Operations',
            'category': 'required',
            'fields': [
                {
                    'key': 'lift_plan_reviewed',
                    'label': 'Lift plan reviewed',
                    'type': 'boolean',
                    'default': True,
                    'required': True,
                    'help': 'Confirm the lift plan is reviewed and approved.',
                },
                {
                    'key': 'rigging_inspected',
                    'label': 'Rigging inspected',
                    'type': 'boolean',
                    'default': True,
                    'required': True,
                    'help': 'Verify slings and hardware condition.',
                },
                {
                    'key': 'exclusion_zone_set',
                    'label': 'Exclusion zone set',
                    'type': 'boolean',
                    'default': True,
                    'required': True,
                    'help': 'Keep non-essential personnel clear of the lift.',
                },
            ],
        },
    }
    if not category:
        return []
    return [sections[category]] if category in sections else []


def build_minimal_template(permit_type) -> Dict[str, Any]:
    requires_gas = bool(getattr(permit_type, 'requires_gas_testing', False))
    requires_fire_watch = bool(getattr(permit_type, 'requires_fire_watch', False))
    requires_isolation = bool(getattr(permit_type, 'requires_isolation', False) or getattr(permit_type, 'requires_structured_isolation', False))
    requires_training = bool(getattr(permit_type, 'requires_training_verification', False))
    requires_medical = bool(getattr(permit_type, 'requires_medical_surveillance', False))

    sections = [
        {
            'id': 'general_requirements',
            'title': 'General Requirements',
            'category': 'required',
            'fields': [
                {
                    'key': 'work_scope_defined',
                    'label': 'Work scope defined',
                    'type': 'boolean',
                    'default': True,
                    'required': True,
                    'help': 'Confirm the scope is clear and agreed.',
                },
                {
                    'key': 'work_area_checked',
                    'label': 'Work area checked',
                    'type': 'boolean',
                    'default': True,
                    'required': True,
                    'help': 'Inspect the work area before starting.',
                },
                {
                    'key': 'tools_inspected',
                    'label': 'Tools and equipment inspected',
                    'type': 'boolean',
                    'default': True,
                    'required': True,
                    'help': 'Verify tools are safe and fit for use.',
                },
            ],
        },
        {
            'id': 'hazard_controls',
            'title': 'Hazard Controls',
            'category': 'recommended',
            'fields': [
                {
                    'key': 'hazards_reviewed',
                    'label': 'Hazards reviewed',
                    'type': 'boolean',
                    'default': True,
                    'required': False,
                    'help': 'Confirm hazards were reviewed with the team.',
                },
                {
                    'key': 'controls_applied',
                    'label': 'Controls applied',
                    'type': 'boolean',
                    'default': True,
                    'required': False,
                    'help': 'Verify agreed controls are in place.',
                },
            ],
        },
        {
            'id': 'authorization',
            'title': 'Authorization',
            'category': 'required',
            'fields': [
                {
                    'key': 'permit_displayed',
                    'label': 'Permit displayed at worksite',
                    'type': 'boolean',
                    'default': True,
                    'required': True,
                    'help': 'Keep the permit available at the job site.',
                },
                {
                    'key': 'authorization_confirmed',
                    'label': 'Authorization confirmed',
                    'type': 'boolean',
                    'default': True,
                    'required': True,
                    'help': 'Confirm authorization from responsible roles.',
                },
            ],
        },
        {
            'id': 'emergency_preparedness',
            'title': 'Emergency Preparedness',
            'category': 'required',
            'fields': [
                {
                    'key': 'emergency_contacts_available',
                    'label': 'Emergency contacts available',
                    'type': 'boolean',
                    'default': True,
                    'required': True,
                    'help': 'Ensure emergency contacts are known and reachable.',
                },
                {
                    'key': 'evacuation_route_known',
                    'label': 'Evacuation route known',
                    'type': 'boolean',
                    'default': True,
                    'required': True,
                    'help': 'Confirm evacuation routes are understood.',
                },
            ],
        },
    ]

    sections.extend(_category_sections(getattr(permit_type, 'category', '')))

    if requires_gas:
        sections.append({
            'id': 'gas_testing',
            'title': 'Gas Testing',
            'category': 'required',
            'fields': [
                {
                    'key': 'gas_testing_required',
                    'label': 'Gas testing required',
                    'type': 'boolean',
                    'default': True,
                    'required': True,
                    'help': 'Record gas testing before work starts.',
                },
                {
                    'key': 'continuous_monitoring',
                    'label': 'Continuous monitoring in place',
                    'type': 'boolean',
                    'default': True,
                    'required': False,
                    'help': 'Use continuous monitoring where needed.',
                },
            ],
        })

    if requires_isolation:
        sections.append({
            'id': 'isolation_controls',
            'title': 'Isolation & Energy Control',
            'category': 'required',
            'fields': [
                {
                    'key': 'isolation_required',
                    'label': 'Isolation required',
                    'type': 'boolean',
                    'default': True,
                    'required': True,
                    'help': 'Confirm isolation requirements for this work.',
                },
                {
                    'key': 'isolation_verified',
                    'label': 'Isolation verified',
                    'type': 'boolean',
                    'default': False,
                    'required': True,
                    'help': 'Verify isolation before starting work.',
                },
            ],
        })

    if requires_fire_watch:
        sections.append({
            'id': 'fire_watch',
            'title': 'Fire Watch',
            'category': 'required',
            'fields': [
                {
                    'key': 'fire_watch_required',
                    'label': 'Fire watch required',
                    'type': 'boolean',
                    'default': True,
                    'required': True,
                    'help': 'Assign fire watch where ignition risk exists.',
                },
            ],
        })

    if requires_training or requires_medical:
        sections.append({
            'id': 'competency_requirements',
            'title': 'Competency Requirements',
            'category': 'required',
            'fields': [
                {
                    'key': 'training_verified',
                    'label': 'Training verified',
                    'type': 'boolean',
                    'default': requires_training,
                    'required': requires_training,
                    'help': 'Confirm training requirements for the team.',
                },
                {
                    'key': 'medical_surveillance_confirmed',
                    'label': 'Medical surveillance confirmed',
                    'type': 'boolean',
                    'default': requires_medical,
                    'required': requires_medical,
                    'help': 'Confirm medical surveillance requirements.',
                },
            ],
        })

    template = {
        'version': DEFAULT_TEMPLATE_VERSION,
        'sections': sections,
        'prefill': {
            'ppe_requirements': getattr(permit_type, 'mandatory_ppe', []) or [],
            'safety_checklist': getattr(permit_type, 'safety_checklist', []) or [],
            'control_measures': getattr(permit_type, 'control_measures', []) or [],
            'risk_factors': getattr(permit_type, 'risk_factors', []) or [],
            'emergency_procedures': getattr(permit_type, 'emergency_procedures', []) or [],
        },
        'references': _default_references(permit_type),
    }

    return template


def resolve_permit_type_template(permit_type, project: Optional[Any] = None, override_model=None) -> Dict[str, Any]:
    base_template = permit_type.form_template or {}
    if not base_template:
        base_template = build_minimal_template(permit_type)

    resolved_template = copy.deepcopy(base_template)

    base_prefill = {
        'ppe_requirements': permit_type.mandatory_ppe or [],
        'safety_checklist': permit_type.safety_checklist or [],
        'control_measures': permit_type.control_measures or [],
        'risk_factors': permit_type.risk_factors or [],
        'emergency_procedures': permit_type.emergency_procedures or [],
    }

    template_prefill = {}
    if isinstance(resolved_template, dict):
        template_prefill = resolved_template.get('prefill') or {}
    resolved_prefill = deep_merge(base_prefill, template_prefill)

    if project and getattr(permit_type, 'project_overrides_enabled', False) and override_model:
        override = override_model.objects.filter(
            project=project,
            permit_type=permit_type,
            is_active=True,
        ).first()
        if override:
            resolved_template = deep_merge(resolved_template, override.override_template or {})
            resolved_prefill = deep_merge(resolved_prefill, override.override_prefill or {})

    if isinstance(resolved_template, dict):
        resolved_template.setdefault('version', DEFAULT_TEMPLATE_VERSION)
        resolved_template.setdefault('sections', [])
        resolved_template.setdefault('references', [])

    resolved_flags = {
        'requires_gas_testing': permit_type.requires_gas_testing,
        'requires_fire_watch': permit_type.requires_fire_watch,
        'requires_isolation': permit_type.requires_isolation,
        'requires_structured_isolation': permit_type.requires_structured_isolation,
        'requires_deisolation_on_closeout': permit_type.requires_deisolation_on_closeout,
        'requires_medical_surveillance': permit_type.requires_medical_surveillance,
        'requires_training_verification': permit_type.requires_training_verification,
        'validity_hours': permit_type.validity_hours,
        'escalation_time_hours': permit_type.escalation_time_hours,
        'min_personnel_required': permit_type.min_personnel_required,
        'requires_approval_levels': permit_type.requires_approval_levels,
    }

    return {
        'resolved_template': resolved_template,
        'resolved_prefill': resolved_prefill,
        'resolved_flags': resolved_flags,
    }
