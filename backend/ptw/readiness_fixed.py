"""
Readiness utilities for PTW permits - check requirements before transitions
"""
from .validators import (
    validate_permit_requirements,
    validate_closeout_completion,
    validate_structured_isolation,
    validate_deisolation_completion
)


def get_permit_readiness(permit):
    """
    Get comprehensive readiness summary for a permit.
    
    Returns dict with:
    - requires: what this permit requires
    - readiness: what transitions are allowed
    - missing: what's blocking each transition
    - details: detailed status of each requirement
    """
    permit_type = permit.permit_type
    
    # Determine requirements
    requires = {
        'gas_testing': permit_type.requires_gas_testing,
        'structured_isolation': permit_type.requires_structured_isolation,
        'closeout': _has_closeout_template(permit),
        'deisolation': permit_type.requires_deisolation_on_closeout
    }
    
    # Check readiness for each transition
    readiness = {
        'can_verify': _can_verify(permit),
        'can_approve': _can_approve(permit),
        'can_activate': _can_activate(permit),
        'can_complete': _can_complete(permit)
    }
    
    # Get missing items for each transition
    missing = {
        'approve': _get_missing_for_approve(permit),
        'activate': _get_missing_for_activate(permit),
        'complete': _get_missing_for_complete(permit)
    }
    
    # Get detailed status
    details = {
        'gas': _get_gas_details(permit),
        'isolation': _get_isolation_details(permit),
        'ppe': _get_ppe_details(permit),
        'checklist': _get_checklist_details(permit),
        'closeout': _get_closeout_details(permit)
    }
    
    return {
        'permit_id': permit.id,
        'permit_number': permit.permit_number,
        'status': permit.status,
        'requires': requires,
        'readiness': readiness,
        'missing': missing,
        'details': details
    }


def _can_verify(permit):
    """Check if permit can be verified"""
    return permit.status in ['submitted', 'draft']


def _can_approve(permit):
    """Check if permit can be approved"""
    if permit.status not in ['under_review']:
        return False
    
    try:
        validate_permit_requirements(permit, action='approve')
        validate_structured_isolation(permit, action='approve')
        return True
    except Exception:
        return False


def _can_activate(permit):
    """Check if permit can be activated"""
    if permit.status not in ['approved']:
        return False
    
    try:
        validate_permit_requirements(permit, action='activate')
        validate_structured_isolation(permit, action='activate')
        return True
    except Exception:
        return False


def _can_complete(permit):
    """Check if permit can be completed"""
    if permit.status not in ['active', 'suspended']:
        return False
    
    try:
        validate_closeout_completion(permit)
        validate_deisolation_completion(permit)
        return True
    except Exception:
        return False


def _get_missing_for_approve(permit):
    """Get list of missing items blocking approval"""
    missing = []
    
    if permit.status not in ['under_review']:
        missing.append(f'invalid_transition_from_{permit.status}')
        return missing
    
    try:
        validate_permit_requirements(permit, action='approve')
    except Exception as e:
        if hasattr(e, 'detail'):
            for field, msg in e.detail.items():
                if field == 'gas_readings':
                    missing.append('gas_readings_missing')
                elif field == 'isolation_details':
                    missing.append('isolation_details_missing')
                elif field == 'ppe_requirements':
                    missing.append('ppe_requirements_incomplete')
                elif field == 'safety_checklist':
                    missing.append('safety_checklist_incomplete')
    
    try:
        validate_structured_isolation(permit, action='approve')
    except Exception as e:
        if hasattr(e, 'detail') and 'isolation' in e.detail:
            if 'must be assigned' in str(e.detail['isolation']):
                missing.append('isolation_points_not_assigned')
            elif 'must be verified' in str(e.detail['isolation']):
                missing.append('isolation_points_not_verified')
    
    return missing


def _get_missing_for_activate(permit):
    """Get list of missing items blocking activation"""
    missing = []
    
    if permit.status not in ['approved']:
        missing.append(f'invalid_transition_from_{permit.status}')
        return missing
    
    # Same checks as approve
    return _get_missing_for_approve(permit)


def _get_missing_for_complete(permit):
    """Get list of missing items blocking completion"""
    missing = []
    
    if permit.status not in ['active', 'suspended']:
        missing.append(f'invalid_transition_from_{permit.status}')
        return missing
    
    try:
        validate_closeout_completion(permit)
    except Exception as e:
        if hasattr(e, 'detail') and 'closeout' in e.detail:
            missing.append('closeout_incomplete')
    
    try:
        validate_deisolation_completion(permit)
    except Exception as e:
        if hasattr(e, 'detail') and 'isolation' in e.detail:
            missing.append('deisolation_required')
    
    return missing


def _has_closeout_template(permit):
    """Check if closeout template exists for this permit"""
    from .models import CloseoutChecklistTemplate
    return CloseoutChecklistTemplate.objects.filter(
        permit_type=permit.permit_type,
        is_active=True
    ).exists()


def _get_gas_details(permit):
    """Get gas testing details"""
    permit_type = permit.permit_type
    
    if not permit_type.requires_gas_testing:
        return {'required': False}
    
    safe_readings = permit.gas_readings.filter(status='safe')
    latest = safe_readings.order_by('-tested_at').first()
    
    return {
        'required': True,
        'safe': safe_readings.exists(),
        'latest': {
            'tested_at': latest.tested_at.isoformat() if latest else None,
            'tested_by': latest.tested_by.get_full_name() if latest and latest.tested_by else None
        } if latest else None
    }


def _get_isolation_details(permit):
    """Get isolation points details"""
    permit_type = permit.permit_type
    
    if not permit_type.requires_structured_isolation:
        return {'required': False}
    
    required_points = permit.isolation_points.filter(required=True)
    verified_required = required_points.filter(status='verified').count()
    pending_required = required_points.exclude(status='verified').count()
    
    return {
        'required': True,
        'required_points': required_points.count(),
        'verified_required': verified_required,
        'pending_required': pending_required
    }


def _get_ppe_details(permit):
    """Get PPE requirements details"""
    permit_type = permit.permit_type
    
    if not permit_type.mandatory_ppe:
        return {'required_items': [], 'missing_items': []}
    
    permit_ppe = [ppe.strip().lower() for ppe in (permit.ppe_requirements or [])]
    missing = []
    
    for required_ppe in permit_type.mandatory_ppe:
        if required_ppe.strip().lower() not in permit_ppe:
            missing.append(required_ppe)
    
    return {
        'required_items': permit_type.mandatory_ppe,
        'missing_items': missing
    }


def _get_checklist_details(permit):
    """Get safety checklist details"""
    permit_type = permit.permit_type
    
    if not permit_type.safety_checklist:
        return {'required': [], 'missing': []}
    
    permit_checklist = permit.safety_checklist or {}
    missing = []
    required = []
    
    # Handle case where permit_checklist is a list instead of dict
    if isinstance(permit_checklist, list):
        # Convert list to dict for compatibility
        checklist_dict = {}
        for item in permit_checklist:
            if isinstance(item, str):
                checklist_dict[item] = True
            elif isinstance(item, dict) and 'key' in item:
                checklist_dict[item['key']] = item.get('checked', True)
        permit_checklist = checklist_dict
    
    if isinstance(permit_type.safety_checklist, list):
        for item in permit_type.safety_checklist:
            if isinstance(item, dict):
                key = item.get('key')
                label = item.get('label', key)
                is_required = item.get('required', True)
                
                if is_required:
                    required.append(label)
                    if not permit_checklist.get(key):
                        missing.append(label)
            elif isinstance(item, str):
                required.append(item)
                if not permit_checklist.get(item):
                    missing.append(item)
    
    return {
        'required': required,
        'missing': missing
    }


def _get_closeout_details(permit):
    """Get closeout checklist details"""
    try:
        closeout = permit.closeout
        return {
            'template_exists': True,
            'is_complete': closeout.is_complete(),
            'missing_items': closeout.get_missing_required_items()
        }
    except AttributeError:
        # No closeout exists
        has_template = _has_closeout_template(permit)
        return {
            'template_exists': has_template,
            'is_complete': False if has_template else None,
            'missing_items': [] if not has_template else ['closeout_not_started']
        }