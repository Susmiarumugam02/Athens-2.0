from rest_framework import permissions
from authentication.models import UserType
from authentication.tenant_utils import get_tenant_id_for_filtering


class IsMasterAdminOrSuperAdmin(permissions.BasePermission):
    """
    Permission for project management endpoints.
    Allows Superadmin (all tenants) and MasterAdmin (own tenant only).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.user_type in [UserType.SUPERADMIN, UserType.MASTERADMIN]


class IsProjectMemberOrAdmin(permissions.BasePermission):
    """
    Permission for project-member-scoped endpoints.
    Allows Superadmin, MasterAdmin, and CompanyUsers who are project members.
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
        
        # Superadmin can access all
        if user.user_type == UserType.SUPERADMIN:
            return True
        
        # MasterAdmin can access projects in their tenant
        if user.user_type == UserType.MASTERADMIN:
            tenant_id = get_tenant_id_for_filtering(user)
            return obj.company_id == tenant_id
        
        # CompanyUser can only access if they are a member
        if user.user_type == UserType.COMPANYUSER:
            return obj.memberships.filter(user=user, is_active=True).exists()
        
        return False
