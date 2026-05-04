from rest_framework import permissions

class CanManageManpower(permissions.BasePermission):
    """
    Custom permission to allow:
    1. Only adminuser (clientuser, epcuser, contractoruser) can create/edit manpower entries
    2. projectadmin can only view manpower entries (read-only access)
    3. Users can only manage manpower entries they created
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user.is_authenticated:
            return False
        
        # Read permissions are allowed to authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Master admin has full access
        if getattr(request.user, 'admin_type', None) == 'master':
            return True
        
        # Check user_type for admin users
        user_type = getattr(request.user, 'user_type', None)
        if user_type == 'adminuser':
            return True
        
        # Also check admin_type for backward compatibility
        user_admin_type = getattr(request.user, 'admin_type', None)
        if user_admin_type in ['clientuser', 'epcuser', 'contractoruser']:
            return True
        
        # Also allow users with the manage_manpower permission (for superusers)
        return request.user.has_perm('manpower.manage_manpower')
    
    def has_object_permission(self, request, view, obj):
        # Check if user is authenticated
        if not request.user.is_authenticated:
            return False
        
        # Read permissions are allowed to authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Master admin has full access
        if getattr(request.user, 'admin_type', None) == 'master':
            return True
        
        # Check user_type for admin users
        user_type = getattr(request.user, 'user_type', None)
        if user_type == 'adminuser':
            # Users can only edit manpower entries they created
            return obj.created_by == request.user
        
        # Also check admin_type for backward compatibility
        user_admin_type = getattr(request.user, 'admin_type', None)
        if user_admin_type in ['clientuser', 'epcuser', 'contractoruser']:
            # Users can only edit manpower entries they created
            return obj.created_by == request.user
        
        # Also allow users with the manage_manpower permission (for superusers)
        return request.user.has_perm('manpower.manage_manpower')
