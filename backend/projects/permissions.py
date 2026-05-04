from rest_framework import permissions
from authentication.models import UserType
from authentication.permissions import (
    IsSuperAdminOrMasterAdmin,
    TenantScopedPermissionMixin,
    check_tenant_access,
)
from authentication.tenant_utils import get_tenant_id_for_filtering


# DEPRECATED: Use authentication.permissions.IsSuperAdminOrMasterAdmin instead
class IsMasterAdminOrSuperAdmin(IsSuperAdminOrMasterAdmin):
    """
    DEPRECATED: This class is an alias for canonical IsSuperAdminOrMasterAdmin.
    Use authentication.permissions.IsSuperAdminOrMasterAdmin directly.
    
    Permission for project management endpoints.
    Allows Superadmin (all tenants) and MasterAdmin (own tenant only).
    """
    pass


class IsProjectMemberOrAdmin(TenantScopedPermissionMixin, permissions.BasePermission):
    """
    Permission for project-member-scoped endpoints.
    Allows Superadmin, MasterAdmin, and CompanyUsers who are project members.
    
    Uses TenantScopedPermissionMixin for tenant-based object access.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.user_type in [
            UserType.SUPERADMIN,
            UserType.MASTERADMIN,
            UserType.COMPANYUSER
        ]
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Use mixin for tenant check (handles SuperAdmin + tenant matching)
        if not super().has_object_permission(request, view, obj):
            return False
        
        # CompanyUser needs additional membership check
        if user.user_type == UserType.COMPANYUSER:
            return obj.memberships.filter(user=user, is_active=True).exists()
        
        # SuperAdmin and MasterAdmin (same tenant) are allowed
        return True
