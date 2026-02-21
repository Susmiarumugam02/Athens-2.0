from rest_framework.response import Response
from rest_framework import status
from authentication.tenant_utils import get_tenant_for_user


def get_current_tenant(user):
    """
    Extract tenant from authenticated user using canonical helper.
    
    Returns:
        tuple: (tenant, error_response)
        - If successful: (Tenant object, None)
        - If failed: (None, Response object with error)
    """
    # Use canonical tenant helper
    tenant, error = get_tenant_for_user(user)
    
    if error:
        return None, Response(
            {"error": error},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if tenant is None:
        # SuperAdmin or user without tenant
        return None, Response(
            {"error": "User type not supported for tenant operations"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    return tenant, None


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
