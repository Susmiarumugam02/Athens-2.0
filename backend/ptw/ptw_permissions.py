"""
Consolidated PTW Permission Helper - Single source of truth for all PTW permissions
"""
from django.contrib.auth import get_user_model
from rest_framework.exceptions import PermissionDenied
import logging

User = get_user_model()
logger = logging.getLogger(__name__)

class PTWPermissionHelper:
    """
    Single PTW permission helper - consolidates all permission logic
    """
    
    @classmethod
    def can_view_permit(cls, user, permit):
        """Check if user can view permit"""
        # Project scoping is mandatory
        if not cls._has_project_access(user, permit):
            return False
        
        # All authenticated users can view permits in their project
        return user.is_authenticated
    
    @classmethod
    def can_edit_permit(cls, user, permit):
        """Check if user can edit permit"""
        if not cls._has_project_access(user, permit):
            return False
        
        # Creator can edit their own permits
        if permit.created_by == user:
            return True
        
        # B grade users can edit permits
        if user.admin_type in ['epcuser', 'clientuser'] and user.grade == 'B':
            return True
        
        return False

    @classmethod
    def can_submit_permit(cls, user, permit):
        """Check if user can submit permit for workflow"""
        if not cls._has_project_access(user, permit):
            return False
        return permit.created_by == user and permit.status == 'draft'
    
    @classmethod
    def can_select_verifier(cls, user, permit):
        """Check if user can select verifier"""
        if not cls._has_project_access(user, permit):
            return False
        
        # Only permit creator can select verifier
        return permit.created_by == user
    
    @classmethod
    def can_verify(cls, user, permit):
        """Check if user can verify permit"""
        if not cls._has_project_access(user, permit):
            return False
        
        # Must be assigned as verifier
        if permit.verifier != user:
            return False
        
        # Project admins can verify assigned permits
        if getattr(user, 'user_type', None) == 'projectadmin':
            return True

        # Only EPC B/C and Client B can verify
        if user.admin_type == 'epcuser' and user.grade in ['B', 'C']:
            return True
        if user.admin_type == 'clientuser' and user.grade == 'B':
            return True
        
        return False
    
    @classmethod
    def can_approve(cls, user, permit):
        """Check if user can approve permit"""
        if not cls._has_project_access(user, permit):
            return False
        
        # Must be assigned as approver
        approver = permit.approver or permit.approved_by
        if approver != user:
            return False
        
        # Project admins can approve assigned permits
        if getattr(user, 'user_type', None) == 'projectadmin':
            return True

        # Only EPC A and Client A/B can approve
        if user.admin_type == 'epcuser' and user.grade == 'A':
            return True
        if user.admin_type == 'clientuser' and user.grade in ['A', 'B']:
            return True
        
        return False

    @classmethod
    def can_activate(cls, user, permit):
        """Check if user can activate permit"""
        if not cls._has_project_access(user, permit):
            return False
        if permit.status != 'approved':
            return False
        if permit.created_by == user:
            return True
        if permit.issuer and permit.issuer == user:
            return True
        if permit.receiver and permit.receiver == user:
            return True
        approver = permit.approver or permit.approved_by
        return approver == user

    @classmethod
    def can_complete(cls, user, permit):
        """Check if user can complete permit"""
        if not cls._has_project_access(user, permit):
            return False
        if permit.status not in ['active', 'suspended']:
            return False
        if permit.created_by == user:
            return True
        if permit.issuer and permit.issuer == user:
            return True
        if permit.receiver and permit.receiver == user:
            return True
        approver = permit.approver or permit.approved_by
        return approver == user

    @classmethod
    def can_suspend(cls, user, permit):
        """Check if user can suspend permit"""
        if not cls._has_project_access(user, permit):
            return False
        if permit.status not in ['active']:
            return False
        if permit.created_by == user:
            return True
        approver = permit.approver or permit.approved_by
        return approver == user or permit.issuer == user

    @classmethod
    def can_cancel(cls, user, permit):
        """Check if user can cancel permit"""
        if not cls._has_project_access(user, permit):
            return False
        if permit.status in ['completed', 'cancelled', 'expired']:
            return False
        if permit.created_by == user:
            return True
        approver = permit.approver or permit.approved_by
        return approver == user

    @classmethod
    def can_reject(cls, user, permit):
        """Check if user can reject permit"""
        if not cls._has_project_access(user, permit):
            return False
        if permit.status == 'submitted':
            return cls.can_verify(user, permit)
        if permit.status == 'under_review':
            return cls.can_approve(user, permit)
        return False

    @classmethod
    def can_resubmit(cls, user, permit):
        """Check if user can resubmit permit"""
        if not cls._has_project_access(user, permit):
            return False
        return permit.created_by == user and permit.status == 'rejected'
    
    @classmethod
    def can_sign(cls, user, permit, signature_type):
        """Check if user can sign permit with given signature type"""
        if not cls._has_project_access(user, permit):
            return False
        
        # Map signature types to required users
        signature_user_map = {
            'requestor': permit.created_by,
            'verifier': permit.verifier,
            'approver': permit.approver or permit.approved_by,
            'issuer': permit.issuer,
            'receiver': permit.receiver
        }
        
        required_user = signature_user_map.get(signature_type)
        if not required_user:
            return False
        
        return user == required_user

    @classmethod
    def get_available_verifiers(cls, project, user_type, grade):
        """Get available verifiers for workflow selection"""
        from .workflow_manager import workflow_manager
        return workflow_manager.get_available_verifiers(project, user_type, grade)

    @classmethod
    def get_available_approvers(cls, project, user_type, grade):
        """Get available approvers for workflow selection"""
        from .workflow_manager import workflow_manager
        return workflow_manager.get_available_approvers(project, user_type, grade)
    
    @classmethod
    def _has_project_access(cls, user, permit):
        """Check if user has access to permit's project"""
        if not permit.project:
            return False
        
        return user.project == permit.project
    
    @classmethod
    def require_permission(cls, permission_check):
        """Decorator for requiring specific permission"""
        def decorator(func):
            def wrapper(self, request, *args, **kwargs):
                permit = None
                if hasattr(self, 'get_object'):
                    try:
                        permit = self.get_object()
                    except:
                        pass
                
                if not permission_check(request.user, permit):
                    raise PermissionDenied("Insufficient permissions for this action")
                
                return func(self, request, *args, **kwargs)
            return wrapper
        return decorator

# Helper instance
ptw_permissions = PTWPermissionHelper()
