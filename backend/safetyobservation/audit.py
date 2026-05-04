"""
Audit logging for Safety Observation module.
Tracks all changes with tenant isolation.
"""
from django.utils import timezone


def log_change(observation, user, action, field_name=None, old_value=None, new_value=None, details=None):
    """
    Log a change to a safety observation.
    
    Args:
        observation: SafetyObservation instance
        user: User who made the change
        action: Action type (created, updated, status_changed, etc.)
        field_name: Field that changed (optional)
        old_value: Previous value (optional)
        new_value: New value (optional)
        details: Additional details (optional)
    """
    from .models import SafetyObservationAudit
    
    SafetyObservationAudit.objects.create(
        observation=observation,
        athens_tenant_id=observation.athens_tenant_id,
        user=user,
        action=action,
        field_name=field_name or '',
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        details=details or '',
        timestamp=timezone.now()
    )
