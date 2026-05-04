"""
Validators for PermitType requirements enforcement
"""
from rest_framework import serializers


def _normalize_required_checklist_items(checklist_def):
    """Return list of required checklist item labels/keys from PermitType."""
    required_items = []
    if isinstance(checklist_def, list):
        for item in checklist_def:
            if isinstance(item, dict):
                required = item.get('required', True)
                if not required:
                    continue
                key = item.get('key') or item.get('label') or item.get('item') or item.get('text')
                if key:
                    required_items.append(str(key))
            elif isinstance(item, str):
                required_items.append(item)
    elif isinstance(checklist_def, dict):
        for key, required in checklist_def.items():
            if required or required is None:
                required_items.append(str(key))
    return required_items


def _normalize_completed_checklist_items(checklist_value):
    """Return set of completed checklist item keys from Permit."""
    completed = set()
    if isinstance(checklist_value, dict):
        for key, value in checklist_value.items():
            if isinstance(value, dict):
                done = value.get('done', value.get('checked', value.get('default_checked', False)))
                if done:
                    completed.add(str(key))
            elif value:
                completed.add(str(key))
        return completed
    if isinstance(checklist_value, list):
        for item in checklist_value:
            if isinstance(item, str):
                completed.add(item)
                continue
            if isinstance(item, dict):
                key = item.get('key') or item.get('label') or item.get('item') or item.get('text')
                if not key:
                    continue
                done = item.get('done', item.get('checked', item.get('default_checked', False)))
                if done:
                    completed.add(str(key))
        return completed
    return completed


def validate_permit_requirements(permit, action='approve'):
    """
    Validate permit meets PermitType requirements before approve/activate.
    
    Args:
        permit: Permit instance
        action: 'approve' or 'activate' (for error messages)
    
    Raises:
        serializers.ValidationError with field-specific errors
    """
    errors = {}
    permit_type = permit.permit_type
    
    # A) Gas testing requirement
    if permit_type.requires_gas_testing:
        safe_readings = permit.gas_readings.filter(status='safe').count()
        if safe_readings == 0:
            errors['gas_readings'] = f"Gas testing is required before {action}. At least one safe gas reading must be recorded."
    
    # B) Isolation requirement
    if permit_type.requires_isolation or permit.requires_isolation:
        if not permit.isolation_details or permit.isolation_details.strip() == '':
            errors['isolation_details'] = f"Isolation details are required before {action}."
    
    # C) Mandatory PPE
    if permit_type.mandatory_ppe:
        permit_ppe = [ppe.strip().lower() for ppe in (permit.ppe_requirements or [])]
        missing_ppe = []
        
        for required_ppe in permit_type.mandatory_ppe:
            required_lower = required_ppe.strip().lower()
            if required_lower not in permit_ppe:
                missing_ppe.append(required_ppe)
        
        if missing_ppe:
            errors['ppe_requirements'] = f"Missing mandatory PPE: {', '.join(missing_ppe)}"
    
    # D) Safety checklist
    if permit_type.safety_checklist:
        required_items = _normalize_required_checklist_items(permit_type.safety_checklist)
        completed_items = _normalize_completed_checklist_items(permit.safety_checklist or {})
        missing = [item for item in required_items if item not in completed_items]
        if missing:
            errors['safety_checklist'] = f"Checklist incomplete: {', '.join(missing)}"
    
    if errors:
        raise serializers.ValidationError(errors)


def validate_extension_limit(permit):
    """
    Validate permit has not exceeded max_validity_extensions.
    
    Args:
        permit: Permit instance
    
    Raises:
        serializers.ValidationError if limit exceeded
    """
    max_extensions = permit.permit_type.max_validity_extensions
    
    if max_extensions and max_extensions > 0:
        # Count existing extensions (exclude rejected)
        existing_count = permit.extensions.exclude(status='rejected').count()
        
        if existing_count >= max_extensions:
            raise serializers.ValidationError({
                'permit': f"Maximum validity extensions ({max_extensions}) already reached for this permit."
            })

def validate_closeout_completion(permit):
    """
    Validate permit closeout is completed before allowing completion status.
    
    Args:
        permit: Permit instance
    
    Raises:
        serializers.ValidationError if closeout incomplete
    """
    try:
        closeout = permit.closeout
        if not closeout.is_complete():
            missing_items = closeout.get_missing_required_items()
            raise serializers.ValidationError({
                'closeout': f"Closeout checklist incomplete. Missing: {', '.join(missing_items)}"
            })
    except AttributeError:
        # No closeout exists - check if template exists for this permit type
        from .models import CloseoutChecklistTemplate
        template = CloseoutChecklistTemplate.objects.filter(
            permit_type=permit.permit_type,
            is_active=True
        ).first()
        
        if template:
            raise serializers.ValidationError({
                'closeout': 'Closeout checklist must be completed before permit can be marked as completed.'
            })

def validate_structured_isolation(permit, action='approve'):
    """
    Validate structured isolation points are assigned and verified.
    
    Args:
        permit: Permit instance
        action: 'approve' or 'activate'
    
    Raises:
        serializers.ValidationError if isolation incomplete
    """
    permit_type = permit.permit_type
    
    # Only enforce if structured isolation is required
    if not permit_type.requires_structured_isolation:
        return
    
    # Check if isolation points are assigned
    required_points = permit.isolation_points.filter(required=True)
    
    if not required_points.exists():
        raise serializers.ValidationError({
            'isolation': f"Structured isolation is required. At least one isolation point must be assigned before {action}."
        })
    
    # Check if all required points are verified
    unverified = required_points.exclude(status='verified')
    
    if unverified.exists():
        point_names = []
        for pt in unverified:
            name = pt.point.point_code if pt.point else pt.custom_point_name
            point_names.append(f"{name} ({pt.status})")
        
        raise serializers.ValidationError({
            'isolation': f"All required isolation points must be verified before {action}. Pending: {', '.join(point_names)}"
        })

def validate_deisolation_completion(permit):
    """
    Validate all required isolation points are de-isolated before completion.
    
    Args:
        permit: Permit instance
    
    Raises:
        serializers.ValidationError if de-isolation incomplete
    """
    permit_type = permit.permit_type
    
    if not permit_type.requires_deisolation_on_closeout:
        return
    
    required_points = permit.isolation_points.filter(required=True)
    
    if not required_points.exists():
        return
    
    not_deisolated = required_points.exclude(status='deisolated')
    
    if not_deisolated.exists():
        point_names = []
        for pt in not_deisolated:
            name = pt.point.point_code if pt.point else pt.custom_point_name
            point_names.append(f"{name} ({pt.status})")
        
        raise serializers.ValidationError({
            'isolation': f"All required isolation points must be de-isolated before completion. Pending: {', '.join(point_names)}"
        })
