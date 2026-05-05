"""
Compatibility shim: authentication.tenant_scoped_utils
Re-exports from tenant_scoped.py and tenant_utils.py
"""
from django.core.exceptions import PermissionDenied
from rest_framework.response import Response

from .tenant_utils import get_tenant_for_user, get_tenant_id_for_filtering


def ensure_tenant_context(request):
    """Attach tenant info to request from authenticated user."""
    if not hasattr(request, 'user') or not request.user.is_authenticated:
        return
    tenant, error = get_tenant_for_user(request.user)
    if tenant:
        request.athens_tenant_id = tenant.id
        request.tenant_db = None  # single-db setup


def ensure_project(request):
    """Return the project associated with the requesting user, or None."""
    return getattr(request.user, 'project', None)


def enforce_collaboration_read_only(request):
    """Raise PermissionDenied if this is a cross-tenant write attempt."""
    collab_id = request.query_params.get('collaboration_project_id')
    if collab_id and request.method not in {'GET', 'HEAD', 'OPTIONS'}:
        raise PermissionDenied('Cross-tenant writes are not allowed.')
