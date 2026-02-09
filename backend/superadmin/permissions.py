from rest_framework import permissions
from authentication.models import UserType
from django.core.cache import cache


class IsSuperAdmin(permissions.BasePermission):
    """Only superadmin users can access"""
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.user_type == UserType.SUPERADMIN
        )


class HasSuperAdminPermission(permissions.BasePermission):
    """Check if user has specific superadmin permission"""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.user_type != UserType.SUPERADMIN:
            return False
        
        # Get required permission from view
        required_permission = getattr(view, 'required_permission', None)
        if not required_permission:
            return True
        
        # Check permission
        return has_permission(request.user, required_permission)


def has_permission(user, permission_codename):
    """Check if user has a specific permission (with caching)"""
    cache_key = f"superadmin_perms_{user.id}"
    user_permissions = cache.get(cache_key)
    
    if user_permissions is None:
        from superadmin.models import UserRole, RolePermission
        
        # Get all permissions for user's roles
        user_permissions = set(
            RolePermission.objects.filter(
                role__userrole__user=user
            ).values_list('permission__codename', flat=True)
        )
        
        # Cache for 5 minutes
        cache.set(cache_key, user_permissions, 300)
    
    return permission_codename in user_permissions


def clear_user_permissions_cache(user_id):
    """Clear cached permissions for a user"""
    cache_key = f"superadmin_perms_{user_id}"
    cache.delete(cache_key)


def get_user_permissions(user):
    """Get all permissions for a user"""
    cache_key = f"superadmin_perms_{user.id}"
    user_permissions = cache.get(cache_key)
    
    if user_permissions is None:
        from superadmin.models import UserRole, RolePermission, Permission
        
        permission_ids = RolePermission.objects.filter(
            role__userrole__user=user
        ).values_list('permission_id', flat=True)
        
        user_permissions = list(
            Permission.objects.filter(id__in=permission_ids).values(
                'codename', 'name', 'module', 'action'
            )
        )
        
        cache.set(cache_key, user_permissions, 300)
    
    return user_permissions
