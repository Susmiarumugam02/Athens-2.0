from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Q
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Permit, WorkflowInstance, WorkflowStep, PermitAudit
from .canonical_workflow_manager import canonical_workflow_manager
from authentication.models import CustomUser
from authentication.models_notification import Notification
import logging

User = get_user_model()
logger = logging.getLogger(__name__)

class UnifiedPTWWorkflowManager:
    """
    Unified PTW workflow manager - consolidates all workflow logic
    
    Single source of truth for:
    - Workflow transitions
    - Permission validation
    - Notification dispatch
    - Audit logging
    """
    
    WORKFLOW_STAGES = {
        'CREATED': 'created',
        'VERIFICATION': 'verification', 
        'APPROVAL': 'approval',
        'APPROVED': 'approved',
        'REJECTED': 'rejected',
        'ACTIVE': 'active'
    }
    
    def __init__(self):
        self.channel_layer = get_channel_layer()
    
    @transaction.atomic
    def initiate_workflow(self, permit, creator):
        """Initialize workflow - single entry point"""
        try:
            workflow = WorkflowInstance.objects.create(
                permit=permit,
                template=None,
                current_step=1,
                status='active'
            )
            
            WorkflowStep.objects.create(
                workflow=workflow,
                step_id='verifier_selection',
                name='Select Verifier',
                step_type='selection',
                assignee=creator,
                role='requestor',
                order=1,
                required=True,
                status='pending'
            )

            canonical_workflow_manager.transition(
                permit=permit,
                new_status='submitted',
                user=creator,
                action='initiate_workflow'
            )
            
            self._create_audit_log(permit, 'workflow_initiated', creator, 
                                 f"Permit created by {creator.get_full_name()}")
            
            return workflow
            
        except Exception as e:
            logger.error(f"Error initiating workflow for permit {permit.permit_number}: {str(e)}")
            raise

    @transaction.atomic
    def transition_status(self, permit, new_status, user, comments='', **kwargs):
        """Unified status transition with validation"""
        return canonical_workflow_manager.transition(
            permit=permit,
            new_status=new_status,
            user=user,
            comments=comments,
            metadata=kwargs
        )

    def _can_transition(self, permit, new_status, user):
        """Unified permission validation"""
        current_status = permit.status
        
        # Define valid transitions
        valid_transitions = {
            'draft': ['submitted', 'cancelled'],
            'submitted': ['under_review', 'rejected', 'draft'],
            'under_review': ['approved', 'rejected', 'submitted'],
            'approved': ['active', 'cancelled'],
            'active': ['completed', 'suspended'],
            'suspended': ['active', 'cancelled'],
            'completed': [],
            'cancelled': [],
            'expired': [],
            'rejected': ['draft']
        }
        
        if new_status not in valid_transitions.get(current_status, []):
            return False
        
        # Role-based validation
        if new_status == 'under_review' and not self._can_verify(permit, user):
            return False
        if new_status == 'approved' and not self._can_approve(permit, user):
            return False
        
        return True

    def _can_verify(self, permit, user):
        """Check if user can verify permit"""
        return user.admin_type in ['epcuser', 'clientuser'] and user.grade in ['B', 'C']

    def _can_approve(self, permit, user):
        """Check if user can approve permit"""
        return user.admin_type in ['epcuser', 'clientuser'] and user.grade in ['A', 'B']

    def _create_audit_log(self, permit, action, user, comments):
        """Unified audit logging"""
        PermitAudit.objects.create(
            permit=permit,
            action=action,
            user=user,
            comments=comments,
            timestamp=timezone.now()
        )

    def _send_transition_notifications(self, permit, old_status, new_status, user):
        """Unified notification dispatch"""
        notification_map = {
            'submitted': self._notify_verifiers,
            'under_review': self._notify_approvers,
            'approved': self._notify_requestor,
            'rejected': self._notify_requestor,
            'active': self._notify_receiver,
            'completed': self._notify_all_stakeholders
        }
        
        if new_status in notification_map:
            notification_map[new_status](permit, user)

    def _notify_verifiers(self, permit, sender):
        """Send verification notifications"""
        # Implementation for verifier notifications
        pass

    def _notify_approvers(self, permit, sender):
        """Send approval notifications"""
        # Implementation for approver notifications
        pass

    def _notify_requestor(self, permit, sender):
        """Send requestor notifications"""
        # Implementation for requestor notifications
        pass

    def _notify_receiver(self, permit, sender):
        """Send receiver notifications"""
        # Implementation for receiver notifications
        pass

    def _notify_all_stakeholders(self, permit, sender):
        """Send completion notifications to all stakeholders"""
        # Implementation for stakeholder notifications
        pass

# Singleton instance
unified_workflow_manager = UnifiedPTWWorkflowManager()
