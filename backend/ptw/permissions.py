from rest_framework import permissions
from .ptw_permissions import ptw_permissions

class CanManagePermits(permissions.BasePermission):
    """
    Enhanced PTW permission system:
    - CREATE: contractoruser (any grade), clientuser (B/C grade), epcuser (B/C grade)
    - UPDATE: clientuser (B grade), epcuser (B grade), permit creators
    - DELETE: projectadmins, permit creators
    - VIEW: All authenticated users
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
            
        # Allow read access to all authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # CREATE: contractoruser (any grade), clientuser/epcuser (B/C grade)
        if request.method == 'POST':
            if (hasattr(request.user, 'django_user_type') and request.user.django_user_type == 'adminuser'):
                if hasattr(request.user, 'admin_type') and request.user.admin_type == 'contractoruser':
                    return True
                if (hasattr(request.user, 'admin_type') and request.user.admin_type in ['clientuser', 'epcuser'] and
                    hasattr(request.user, 'grade') and request.user.grade in ['B', 'C']):
                    return True
            return False
                
        # UPDATE: clientuser/epcuser (B grade), permit creators
        if request.method in ['PUT', 'PATCH']:
            if (hasattr(request.user, 'django_user_type') and request.user.django_user_type == 'adminuser' and
                hasattr(request.user, 'admin_type') and request.user.admin_type in ['clientuser', 'epcuser'] and
                hasattr(request.user, 'grade') and request.user.grade == 'B'):
                return True
            return False
                
        # DELETE: projectadmins
        if request.method == 'DELETE':
            if (hasattr(request.user, 'django_user_type') and request.user.django_user_type == 'projectadmin'):
                return True
                
        return False
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # UPDATE: B grade users or permit creators
        if request.method in ['PUT', 'PATCH']:
            # Allow creators to edit their own permits
            if obj.created_by == request.user:
                return True
            # Allow B grade users to edit
            if (hasattr(request.user, 'django_user_type') and request.user.django_user_type == 'adminuser' and
                hasattr(request.user, 'admin_type') and request.user.admin_type in ['clientuser', 'epcuser'] and
                hasattr(request.user, 'grade') and request.user.grade == 'B'):
                return True
            return False
                    
        # DELETE: projectadmins or permit creators
        if request.method == 'DELETE':
            if obj.created_by == request.user:
                return True
            if (hasattr(request.user, 'django_user_type') and request.user.django_user_type == 'projectadmin'):
                return True
                    
        return False

class CanApprovePermits(permissions.BasePermission):
    """
    Enhanced approval permissions:
    - Client C/B/A grade: approve contractor and client permits
    - EPC A grade: approve EPC permits
    - All authenticated users: view permits
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        # Allow client users (C/B/A grade) and EPC A grade to approve
        if (hasattr(request.user, 'django_user_type') and request.user.django_user_type == 'adminuser'):
            if (hasattr(request.user, 'admin_type') and request.user.admin_type == 'clientuser' and
                hasattr(request.user, 'grade') and request.user.grade in ['A', 'B', 'C']):
                return True
            if (hasattr(request.user, 'admin_type') and request.user.admin_type == 'epcuser' and
                hasattr(request.user, 'grade') and request.user.grade == 'A'):
                return True

        return False
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return ptw_permissions.can_approve(request.user, obj)

class CanVerifyPermits(permissions.BasePermission):
    """
    Enhanced verification permissions:
    - EPC C/B grade: verify contractor and EPC permits
    - Client B grade: verify client permits
    - All authenticated users: view permits
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
            
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # Allow EPC C/B grade and Client B grade to verify
        if (hasattr(request.user, 'django_user_type') and request.user.django_user_type == 'adminuser'):
            if (hasattr(request.user, 'admin_type') and request.user.admin_type == 'epcuser' and
                hasattr(request.user, 'grade') and request.user.grade in ['B', 'C']):
                return True
            if (hasattr(request.user, 'admin_type') and request.user.admin_type == 'clientuser' and
                hasattr(request.user, 'grade') and request.user.grade == 'B'):
                return True
                
        return False
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return ptw_permissions.can_verify(request.user, obj)
