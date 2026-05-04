"""
Canonical PTW Workflow Manager - Single source of truth for all status transitions
"""
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import Permit, PermitAudit
from .validators import (
    validate_permit_requirements,
    validate_structured_isolation,
    validate_closeout_completion,
    validate_deisolation_completion,
)
from .unified_error_handling import PTWWorkflowError, PTWValidationError, PTWPermissionError
from .status_utils import normalize_permit_status
from .ptw_permissions import ptw_permissions
import logging

User = get_user_model()
logger = logging.getLogger(__name__)

class CanonicalWorkflowManager:
    """
    Canonical workflow manager - ALL status transitions must go through this
    """
    
    VALID_TRANSITIONS = {
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
    
    @transaction.atomic
    def transition(
        self,
        permit=None,
        new_status=None,
        user=None,
        *,
        target_status=None,
        actor=None,
        action=None,
        comments=None,
        context=None,
        metadata=None,
        system=False,
    ):
        """
        Canonical status transition method - ONLY entry point for status changes
        
        Args:
            permit: Permit instance
            new_status: Target status (canonical)
            user: User performing transition
            target_status: Legacy alias for new_status
            actor: Legacy alias for user
            action: Action being performed (for signature validation)
            comments: Optional comments
            context: Optional context dict (legacy)
            metadata: Optional metadata dict
            system: Allow system-triggered transitions (skip permission checks)
            
        Returns:
            Updated permit instance
            
        Raises:
            PTWWorkflowError: Invalid transition
            PTWValidationError: Validation failed
            PTWPermissionError: Permission denied
        """
        from .signature_service import signature_service

        if permit is None:
            raise PTWWorkflowError("Permit is required for transition")

        if new_status is None:
            new_status = target_status
        if user is None:
            user = actor
        if not new_status:
            raise PTWWorkflowError("Target status is required")

        normalized_status = normalize_permit_status(new_status)

        # Lock permit row during transition to prevent race conditions
        permit = Permit.objects.select_for_update().get(pk=permit.pk)

        if not self._can_transition_to(permit, normalized_status):
            raise PTWWorkflowError(
                f"Invalid transition from {permit.status} to {normalized_status}",
                current_status=permit.status,
                target_status=normalized_status,
            )
        
        if not self._has_permission(permit, normalized_status, user, system=system):
            raise PTWPermissionError(
                f"User {getattr(user, 'username', 'system')} cannot transition permit to {normalized_status}",
                action=f"transition_to_{normalized_status}",
            )
        
        # Enforce digital signature requirements
        signature_action = self._get_signature_action(permit.status, normalized_status, action)
        if signature_action:
            try:
                if user is None:
                    raise PTWValidationError(
                        "User is required for signature-gated actions",
                        field="user",
                        details={"action": signature_action},
                    )
                signature_service.validate_signature_for_workflow(permit, signature_action, user)
            except Exception as e:
                if 'Missing required signatures' in str(e):
                    raise PTWValidationError(
                        str(e),
                        field='signatures',
                        details={'code': 'signature_required', 'action': signature_action},
                    )
                raise
        
        # Apply validators based on target status
        self._validate_transition(permit, normalized_status, user)
        
        # Store old status for audit
        old_status = permit.status
        
        # Apply metadata updates before saving
        merged_metadata = {}
        if context:
            merged_metadata.update(context)
        if metadata:
            merged_metadata.update(metadata)
        if merged_metadata:
            self._apply_metadata(permit, merged_metadata)

        # Apply transition
        permit.status = normalized_status
        self._update_timestamps(permit, normalized_status, user=user)
        permit._current_user = user
        permit._skip_audit_log = True
        permit.save()
        
        # Create audit log
        self._create_audit_log(permit, normalized_status, user, comments, old_status)
        
        # Trigger notifications/webhooks
        self._trigger_notifications(permit, old_status, normalized_status, user, merged_metadata)
        
        logger.info(
            "Status transition: %s -> %s for permit %s by %s",
            old_status,
            normalized_status,
            permit.permit_number,
            getattr(user, "username", "system"),
        )
        
        return permit
    
    def _get_signature_action(self, current_status, new_status, action):
        """Map status transition to signature action"""
        current_status = normalize_permit_status(current_status)
        new_status = normalize_permit_status(new_status)

        if action in ['submit', 'verify', 'approve']:
            return action

        action_map = {
            'initiate_workflow': 'submit',
            'verify_approve': 'verify',
            'approve_approve': 'approve',
        }
        if action in action_map:
            return action_map[action]

        if current_status == 'draft' and new_status == 'submitted':
            return 'submit'
        if current_status == 'submitted' and new_status == 'under_review':
            return 'verify'
        if current_status == 'under_review' and new_status == 'approved':
            return 'approve'
        return None

    def _apply_metadata(self, permit, metadata):
        """Apply metadata updates such as verifier/approver assignment."""
        verifier_id = metadata.get('verifier_id')
        if verifier_id and permit.verifier_id != verifier_id:
            permit.verifier_id = verifier_id

        approver_id = metadata.get('approver_id')
        if approver_id and permit.approver_id != approver_id:
            permit.approver_id = approver_id

        approval_comments = metadata.get('approval_comments')
        if approval_comments:
            permit.approval_comments = approval_comments

        verification_comments = metadata.get('verification_comments')
        if verification_comments:
            permit.verification_comments = verification_comments

    def _can_transition_to(self, permit, target_status):
        normalized_status = normalize_permit_status(target_status)
        return permit.can_transition_to(normalized_status)
    
    def _has_permission(self, permit, target_status, actor, system=False):
        if system:
            return True
        if actor is None:
            return False
        if not ptw_permissions.can_view_permit(actor, permit):
            return False

        if target_status == 'submitted':
            return actor == permit.created_by
        if target_status == 'under_review':
            return ptw_permissions.can_verify(actor, permit)
        if target_status == 'approved':
            return ptw_permissions.can_approve(actor, permit)
        if target_status == 'rejected':
            if permit.status == 'submitted':
                return ptw_permissions.can_verify(actor, permit)
            if permit.status == 'under_review':
                return ptw_permissions.can_approve(actor, permit)
            return actor == permit.created_by
        if target_status == 'draft':
            return actor == permit.created_by
        if target_status == 'active':
            return ptw_permissions.can_activate(actor, permit)
        if target_status == 'completed':
            return ptw_permissions.can_complete(actor, permit)
        if target_status == 'suspended':
            return ptw_permissions.can_suspend(actor, permit)
        if target_status == 'cancelled':
            return ptw_permissions.can_cancel(actor, permit)
        if target_status == 'expired':
            return False
        return False
    
    def _validate_transition(self, permit, target_status, actor):
        """Apply validation rules for transition"""
        try:
            if target_status in ['approved', 'active']:
                validate_permit_requirements(permit, action='approve' if target_status == 'approved' else 'activate')
                validate_structured_isolation(permit, action='approve' if target_status == 'approved' else 'activate')
            
            elif target_status == 'completed':
                validate_closeout_completion(permit)
                validate_deisolation_completion(permit)
                
        except Exception as e:
            raise PTWValidationError(str(e), details={'target_status': target_status})
    
    def _update_timestamps(self, permit, target_status, user=None):
        """Update relevant timestamps"""
        now = timezone.now()
        
        if target_status == 'submitted':
            permit.submitted_at = now
        elif target_status == 'under_review':
            permit.verified_at = now
            if permit.verifier_id is None and user is not None:
                permit.verifier = user
        elif target_status == 'approved':
            permit.approved_at = now
            if user is not None:
                permit.approved_by = user
        elif target_status == 'active':
            permit.actual_start_time = now
        elif target_status == 'completed':
            permit.actual_end_time = now
    
    def _create_audit_log(self, permit, action, user, comments, old_status):
        """Create audit log entry"""
        PermitAudit.objects.create(
            permit=permit,
            action=action,
            user=user,
            comments=comments or f"Status changed from {old_status} to {action}",
            old_values={'status': old_status},
            new_values={'status': action},
            timestamp=timezone.now()
        )
    
    def _trigger_notifications(self, permit, old_status, new_status, actor, context):
        """Trigger notifications and webhooks"""
        try:
            from .notification_utils import create_ptw_notification
            
            # Notify based on new status
            if new_status == 'submitted':
                if permit.verifier:
                    create_ptw_notification(
                        user_id=permit.verifier.id,
                        event_type='ptw_verification',
                        permit=permit,
                        sender_id=actor.id
                    )
            
            elif new_status == 'under_review':
                if permit.approver:
                    create_ptw_notification(
                        user_id=permit.approver.id,
                        event_type='ptw_approval',
                        permit=permit,
                        sender_id=actor.id
                    )
            
            elif new_status == 'approved':
                create_ptw_notification(
                    user_id=permit.created_by.id,
                    event_type='ptw_approved',
                    permit=permit,
                    sender_id=actor.id
                )
            
            elif new_status == 'rejected':
                create_ptw_notification(
                    user_id=permit.created_by.id,
                    event_type='ptw_rejected',
                    permit=permit,
                    sender_id=actor.id
                )
            
            # Trigger webhooks
            from .webhook_dispatcher import trigger_webhooks
            trigger_webhooks(f'permit_{new_status}', permit)
            
        except Exception as e:
            logger.error(f"Notification/webhook error: {str(e)}")
            # Don't fail the transition for notification errors

# Singleton instance
canonical_workflow_manager = CanonicalWorkflowManager()
