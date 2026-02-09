"""
PTW status helpers for legacy-to-canonical mapping.
"""

LEGACY_PERMIT_STATUS_MAP = {
    'pending_verification': 'submitted',
    'verified': 'under_review',
    'pending_approval': 'under_review',
    'in_progress': 'active',
    'closed': 'completed',
}

LEGACY_WORKFLOW_STEP_STATUS_MAP = {
    'obsolete': 'skipped',
}

CANONICAL_PERMIT_STATUSES = {
    'draft',
    'submitted',
    'under_review',
    'approved',
    'active',
    'suspended',
    'completed',
    'cancelled',
    'expired',
    'rejected',
}


def normalize_permit_status(value):
    if not value:
        return value
    normalized = value.strip()
    return LEGACY_PERMIT_STATUS_MAP.get(normalized, normalized)


def normalize_workflow_step_status(value):
    if not value:
        return value
    normalized = value.strip()
    return LEGACY_WORKFLOW_STEP_STATUS_MAP.get(normalized, normalized)
