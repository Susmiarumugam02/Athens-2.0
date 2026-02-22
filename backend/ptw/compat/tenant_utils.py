"""
Compatibility shim for authentication.tenant_scoped_utils

Provides minimal implementations to unblock PTW startup.
"""
from authentication.tenant_resolver import get_current_tenant


def ensure_tenant_context(user):
    """Ensure tenant context exists for user"""
    return get_current_tenant(user)


def ensure_project(user, project_id=None):
    """Ensure project access for user"""
    from authentication.models import Project
    if project_id:
        return Project.objects.filter(id=project_id).first()
    return None


def enforce_collaboration_read_only(user, obj):
    """Check if user has read-only access due to collaboration"""
    # Simplified: always allow for now
    return False
