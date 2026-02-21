"""
Canonical tenant extraction utilities.

This module provides the single source of truth for extracting tenant
information from authenticated users.

USAGE:
    from authentication.tenant_utils import get_tenant_for_user
    
    tenant, error = get_tenant_for_user(request.user)
    if error:
        return Response({'error': error}, status=400)
    
    # Use tenant.id for filtering
    queryset = queryset.filter(athens_tenant_id=tenant.id)

See: docs/adr/0001-tenant-identity.md
"""
from typing import Optional, Tuple


def get_tenant_for_user(user) -> Tuple[Optional['Tenant'], Optional[str]]:
    """
    Extract tenant from authenticated user (CANONICAL METHOD).
    
    Args:
        user: Authenticated User object
    
    Returns:
        tuple: (Tenant object or None, error_message or None)
    
    User Type Behavior:
        - superadmin: Returns (None, None) - global access
        - masteradmin: Returns (user.tenant, None) - FK lookup
        - companyuser: Returns (Tenant via company_id, None) - legacy mapping
        - serviceuser: Returns (None, "Not supported") - session-based
    
    Examples:
        >>> tenant, error = get_tenant_for_user(request.user)
        >>> if error:
        ...     return Response({'error': error}, status=400)
        >>> queryset = queryset.filter(athens_tenant_id=tenant.id)
    """
    from control_plane.models import Tenant
    
    # SuperAdmin: Global access (no tenant scoping)
    if user.user_type == 'superadmin':
        return None, None
    
    # MasterAdmin: Use tenant FK (canonical)
    if user.user_type == 'masteradmin':
        if not user.tenant:
            return None, "MasterAdmin not associated with tenant"
        return user.tenant, None
    
    # CompanyUser: Map company_id to Tenant (legacy support)
    if user.user_type == 'companyuser':
        if not user.company_id:
            return None, "CompanyUser not associated with company"
        
        try:
            tenant = Tenant.objects.get(id=user.company_id)
            return tenant, None
        except Tenant.DoesNotExist:
            return None, f"Tenant not found for company_id={user.company_id}"
    
    # ServiceUser: Not supported (session-based auth)
    if user.user_type == 'serviceuser':
        return None, "ServiceUser does not have tenant scoping"
    
    return None, f"Unknown user_type: {user.user_type}"


def get_tenant_id_for_filtering(user) -> Optional[int]:
    """
    Get tenant ID for database filtering (convenience method).
    
    Args:
        user: Authenticated User object
    
    Returns:
        int: Tenant ID for filtering, or None for global access (SuperAdmin)
    
    Usage:
        >>> tenant_id = get_tenant_id_for_filtering(request.user)
        >>> if tenant_id:
        ...     queryset = queryset.filter(athens_tenant_id=tenant_id)
    """
    tenant, error = get_tenant_for_user(user)
    if error or not tenant:
        return None
    return tenant.id


def require_tenant(user) -> Tuple[Optional['Tenant'], Optional[dict]]:
    """
    Require tenant for user (returns error dict if not found).
    
    Args:
        user: Authenticated User object
    
    Returns:
        tuple: (Tenant object, error_response_dict or None)
    
    Usage:
        >>> tenant, error_response = require_tenant(request.user)
        >>> if error_response:
        ...     return Response(error_response, status=400)
    """
    tenant, error = get_tenant_for_user(user)
    if error:
        return None, {'error': error}
    if not tenant:
        return None, {'error': 'Tenant required for this operation'}
    return tenant, None
