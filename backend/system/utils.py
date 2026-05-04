from rest_framework.response import Response
from rest_framework import status


def get_current_tenant(user):
    """
    Extract tenant from authenticated user.
    Always returns (tenant_or_None, error_response_or_None).
    Never raises — callers decide how to handle missing tenant.
    """
    from authentication.tenant_utils import get_tenant_for_user

    try:
        tenant, error = get_tenant_for_user(user)
        if error:
            # Don't propagate errors as HTTP responses — return (None, None)
            return None, None
        return tenant, None
    except Exception:
        return None, None


def check_service_admin_permission(user):
    """
    DEPRECATED: Use authentication.permissions.IsServiceAdmin instead.
    
    Check if user has permission to manage services (Owner/Admin).
    
    Returns:
        tuple: (has_permission, error_response)
        - If allowed: (True, None)
        - If denied: (False, Response object with 403)
    """
    if user.user_type == 'masteradmin':
        return True, None
    
    if user.user_type == 'companyuser' and user.admin_type:
        return True, None
    
    return False, Response(
        {"error": "Only Owner/Admin can manage services"},
        status=status.HTTP_403_FORBIDDEN
    )
