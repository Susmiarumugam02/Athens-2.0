"""
Digital signature validation for PTW workflow enforcement.
Ensures signatures are present before critical workflow transitions.
"""
from rest_framework import serializers
from .signature_service import signature_service


def validate_required_signatures_for_action(permit, action, user):
    """
    Validate required signatures are present before workflow actions.
    
    Args:
        permit: Permit instance
        action: 'initiate_workflow', 'verify', or 'approve'
        user: Current user performing the action
    
    Raises:
        serializers.ValidationError with signature requirements
    """
    action_map = {
        'initiate_workflow': 'submit',
        'verify': 'verify',
        'approve': 'approve',
    }
    workflow_action = action_map.get(action, action)

    try:
        signature_service.validate_signature_for_workflow(permit, workflow_action, user)
    except PTWValidationError as e:
        missing = e.details.get('missing') if isinstance(e.details, dict) else None
        required = e.details.get('required') if isinstance(e.details, dict) else None
        if not missing:
            missing = []
        if not required:
            required = missing
        raise serializers.ValidationError({
            'signature': {
                'required': required,
                'missing': missing,
                'message': str(e),
            }
        })


def validate_signature_authorization(permit, signature_type, user):
    """
    Validate user is authorized to create signature of given type.
    
    Args:
        permit: Permit instance
        signature_type: Type of signature being created
        user: User attempting to create signature
    
    Raises:
        serializers.ValidationError if unauthorized
    """
    required_user = signature_service._get_required_user_for_signature(permit, signature_type)
    if not required_user:
        raise serializers.ValidationError({
            'signature_type': f'No assigned {signature_type} for this permit'
        })
    if user.id != required_user.id:
        raise serializers.ValidationError({
            'signature_type': f'Only the assigned {signature_type} can sign this permit'
        })
