from django.contrib.auth import get_user_model
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied
from .ptw_permissions import ptw_permissions
import logging

User = get_user_model()
logger = logging.getLogger(__name__)

class UnifiedPTWPermissions:
    """
    Unified PTW permission system - single source of truth for all PTW permissions
    
    Consolidates:
    - Role-based permissions
    - Grade-based permissions  
    - Status-based permissions
    - Action-based permissions
    """
    
    # Permission matrix: role -> grade -> allowed actions
    PERMISSION_MATRIX = {
        'contractoruser': {
            'A': ['create', 'view', 'edit_own'],
            'B': ['create', 'view', 'edit_own'],
            'C': ['create', 'view', 'edit_own']
        },
        'epcuser': {
            'A': ['create', 'view', 'edit', 'verify', 'approve', 'manage'],
            'B': ['create', 'view', 'edit', 'verify', 'approve'],
            'C': ['create', 'view', 'edit', 'verify']
        },
        'clientuser': {
            'A': ['create', 'view', 'edit', 'verify', 'approve', 'manage'],
            'B': ['create', 'view', 'edit', 'verify'],
            'C': ['create', 'view', 'edit']
        }
    }
    
    # Status-based action restrictions
    STATUS_RESTRICTIONS = {
        'draft': ['create', 'view', 'edit', 'delete'],
        'submitted': ['view', 'verify', 'reject'],
        'under_review': ['view', 'approve', 'reject'],
        'approved': ['view', 'activate'],
        'active': ['view', 'complete', 'suspend'],
        'completed': ['view'],
        'cancelled': ['view'],
        'rejected': ['view', 'edit', 'resubmit']
    }
    
    @classmethod
    def can_perform_action(cls, user, permit, action):
        """
        Unified permission check for any PTW action
        
        Args:
            user: User attempting action
            permit: Permit object (or None for create)
            action: Action being attempted
            
        Returns:
            bool: True if allowed, False otherwise
        """
        try:
            if permit is not None:
                action_map = {
                    'view': ptw_permissions.can_view_permit,
                    'edit': ptw_permissions.can_edit_permit,
                    'submit': ptw_permissions.can_submit_permit,
                    'verify': ptw_permissions.can_verify,
                    'approve': ptw_permissions.can_approve,
                    'activate': ptw_permissions.can_activate,
                    'complete': ptw_permissions.can_complete,
                    'suspend': ptw_permissions.can_suspend,
                    'cancel': ptw_permissions.can_cancel,
                    'reject': ptw_permissions.can_reject,
                    'resubmit': ptw_permissions.can_resubmit,
                }
                checker = action_map.get(action)
                if checker is not None:
                    return checker(user, permit)

            # Check basic role permissions
            if not cls._has_role_permission(user, action):
                return False
            
            # Check status-based restrictions
            if permit and not cls._has_status_permission(permit, action):
                return False
            
            # Check ownership restrictions
            if permit and not cls._has_ownership_permission(user, permit, action):
                return False
            
            # Check project isolation
            if permit and not cls._has_project_permission(user, permit):
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Permission check error: {str(e)}")
            return False
    
    @classmethod
    def _has_role_permission(cls, user, action):
        """Check if user's role/grade allows action"""
        user_permissions = cls.PERMISSION_MATRIX.get(user.admin_type, {}).get(user.grade, [])
        return action in user_permissions
    
    @classmethod
    def _has_status_permission(cls, permit, action):
        """Check if permit status allows action"""
        allowed_actions = cls.STATUS_RESTRICTIONS.get(permit.status, [])
        return action in allowed_actions
    
    @classmethod
    def _has_ownership_permission(cls, user, permit, action):
        """Check ownership-based permissions"""
        # Own permits can be edited by creator
        if action in ['edit_own', 'delete'] and permit.created_by == user:
            return True
        
        # Verifier can verify assigned permits
        if action == 'verify' and permit.verifier == user:
            return True
        
        # Approver can approve assigned permits
        if action == 'approve' and hasattr(permit, 'approver') and permit.approver == user:
            return True
        
        return True  # Default allow for non-ownership actions
    
    @classmethod
    def _has_project_permission(cls, user, permit):
        """Check project isolation"""
        return user.project == permit.project
    
    @classmethod
    def get_allowed_actions(cls, user, permit=None):
        """Get list of actions user can perform on permit"""
        actions = []
        
        # Get base actions for user role/grade
        base_actions = cls.PERMISSION_MATRIX.get(user.admin_type, {}).get(user.grade, [])
        
        for action in base_actions:
            if cls.can_perform_action(user, permit, action):
                actions.append(action)
        
        return actions
    
    @classmethod
    def require_permission(cls, action):
        """Decorator for requiring specific permission"""
        def decorator(func):
            def wrapper(self, request, *args, **kwargs):
                permit = None
                if hasattr(self, 'get_object'):
                    try:
                        permit = self.get_object()
                    except:
                        pass
                
                if not cls.can_perform_action(request.user, permit, action):
                    raise PermissionDenied(f"Insufficient permissions for action: {action}")
                
                return func(self, request, *args, **kwargs)
            return wrapper
        return decorator


class CanCreatePermits(BasePermission):
    """Permission class for permit creation"""
    def has_permission(self, request, view):
        return UnifiedPTWPermissions.can_perform_action(request.user, None, 'create')


class CanEditPermits(BasePermission):
    """Permission class for permit editing"""
    def has_object_permission(self, request, view, obj):
        return UnifiedPTWPermissions.can_perform_action(request.user, obj, 'edit')


class CanVerifyPermits(BasePermission):
    """Permission class for permit verification"""
    def has_object_permission(self, request, view, obj):
        return UnifiedPTWPermissions.can_perform_action(request.user, obj, 'verify')


class CanApprovePermits(BasePermission):
    """Permission class for permit approval"""
    def has_object_permission(self, request, view, obj):
        return UnifiedPTWPermissions.can_perform_action(request.user, obj, 'approve')


class CanManagePermits(BasePermission):
    """Permission class for permit management"""
    def has_permission(self, request, view):
        return UnifiedPTWPermissions.can_perform_action(request.user, None, 'manage')
