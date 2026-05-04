"""
Simplified Workflow Manager for PTW
Handles permit state transitions and workflow logic
"""
from django.db import transaction
from django.utils import timezone
from .models import Permit, WorkflowInstance, WorkflowStep, PermitAudit


class WorkflowManager:
    """Manages permit workflow state transitions"""
    
    VALID_TRANSITIONS = {
        'draft': ['submitted', 'cancelled'],
        'submitted': ['under_review', 'rejected', 'draft'],
        'under_review': ['approved', 'rejected'],
        'approved': ['active', 'cancelled'],
        'active': ['completed', 'suspended', 'expired'],
        'suspended': ['active', 'cancelled'],
        'completed': [],
        'cancelled': [],
        'expired': [],
        'rejected': ['draft']
    }
    
    def can_transition(self, permit, new_status):
        """Check if transition is valid"""
        current = permit.status
        return new_status in self.VALID_TRANSITIONS.get(current, [])
    
    @transaction.atomic
    def transition(self, permit, new_status, user, comments=''):
        """Execute state transition with audit logging"""
        if not self.can_transition(permit, new_status):
            raise ValueError(f"Cannot transition from {permit.status} to {new_status}")
        
        old_status = permit.status
        permit.status = new_status
        
        # Update timestamps
        if new_status == 'submitted':
            permit.submitted_at = timezone.now()
        elif new_status == 'approved':
            permit.approved_at = timezone.now()
        elif new_status == 'active':
            permit.actual_start_time = timezone.now()
        elif new_status == 'completed':
            permit.actual_end_time = timezone.now()
        
        permit.save()
        
        # Create audit log
        PermitAudit.objects.create(
            permit=permit,
            action=new_status,
            user=user,
            comments=comments,
            old_values={'status': old_status},
            new_values={'status': new_status}
        )
        
        return permit
    
    def get_next_actions(self, permit):
        """Get available actions for current status"""
        return self.VALID_TRANSITIONS.get(permit.status, [])


workflow_manager = WorkflowManager()
