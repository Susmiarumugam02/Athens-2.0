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

class PTWWorkflowManager:
    """
    Manages PTW workflow with 3 stages: Requestor → Verifier → Approver
    
    Workflow Rules:
    1. Anyone can create permits (Contractor/EPC/Client)
    2. Only EPC and Client can verify and approve
    3. EPC can select EPC or Client for verify/approve
    4. Client can only select Client for verify/approve
    5. Requestor selects verifier, verifier selects approver
    6. Filter by company name for verifier/approver selection
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
        """Initialize workflow - requestor must select verifier"""
        try:
            # Create workflow instance
            workflow = WorkflowInstance.objects.create(
                permit=permit,
                template=None,  # Dynamic workflow
                current_step=1,
                status='active'
            )
            
            # Create pending verifier selection step
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

            # Update permit status via canonical manager
            canonical_workflow_manager.transition(
                permit=permit,
                target_status='submitted',
                actor=creator,
                action='initiate_workflow'
            )
            
            # Create audit log
            self._create_audit_log(permit, 'workflow_initiated', creator, 
                                 f"Permit created by {creator.get_full_name()}, awaiting verifier selection")
            
            return workflow
            
        except Exception as e:
            logger.error(f"Error initiating workflow for permit {permit.permit_number}: {str(e)}")
            raise

    
    @transaction.atomic
    def assign_verifier(self, permit, verifier, assigned_by):
        """Assign verifier to permit (requestor selects verifier)"""
        try:
            # Validate verifier selection rules
            if not self._can_select_verifier(assigned_by, verifier):
                raise ValueError(f"User {assigned_by.get_full_name()} cannot select {verifier.get_full_name()} as verifier")
            
            workflow = permit.workflow
            
            # Create verification step
            verification_step = WorkflowStep.objects.create(
                workflow=workflow,
                step_id='verification',
                name='Permit Verification',
                step_type='verification',
                assignee=verifier,
                role=f"{verifier.admin_type}_verifier",
                order=2,
                escalation_time=4,
                required=True
            )
            
            # Remove verifier selection step
            WorkflowStep.objects.filter(
                workflow=workflow,
                step_id='verifier_selection'
            ).update(status='completed')
            
            # Update workflow current step
            workflow.current_step = 2
            workflow.save()

            # Ensure verifier is set without direct status updates
            if permit.verifier_id != verifier.id:
                permit.verifier = verifier
                permit._current_user = assigned_by
                permit.save(update_fields=['verifier'])

            if permit.status == 'draft':
                canonical_workflow_manager.transition(
                    permit=permit,
                    target_status='submitted',
                    actor=assigned_by,
                    action='assign_verifier',
                    metadata={'verifier_id': verifier.id}
                )
            
            # Send notification to verifier
            self._send_verification_notifications(permit, [verifier], assigned_by)
            
            # Create audit log
            self._create_audit_log(permit, 'verifier_assigned', assigned_by,
                                 f"Verifier assigned: {verifier.get_full_name()}")
            
            return verification_step
            
        except Exception as e:
            logger.error(f"Error assigning verifier for permit {permit.permit_number}: {str(e)}")
            raise
    
    def _can_select_verifier(self, requestor, verifier):
        """Check if requestor can select the verifier based on grade rules"""
        # Only EPC and Client can be verifiers
        if verifier.admin_type not in ['epcuser', 'clientuser']:
            return False
        
        # Verifiers must be B or C grade (C for contractor permits, B preferred for EPC/Client permits)
        if verifier.grade not in ['B', 'C']:
            return False
        
        # Client can only select Client verifiers
        if requestor.admin_type == 'clientuser' and verifier.admin_type != 'clientuser':
            return False
        
        # Additional grade-specific rules
        if requestor.admin_type == 'contractoruser':
            # Contractor requestors can only select EPC B/C verifiers
            return verifier.admin_type == 'epcuser' and verifier.grade in ['B', 'C']
        elif requestor.admin_type == 'epcuser':
            # EPC C requestors can only select EPC A/B verifiers
            if requestor.grade == 'C':
                return verifier.admin_type == 'epcuser' and verifier.grade in ['A', 'B']
            # EPC B requestors can select EPC A or Client B/C verifiers
            if requestor.grade == 'B':
                if verifier.admin_type == 'epcuser':
                    return verifier.grade == 'A'
                return verifier.admin_type == 'clientuser' and verifier.grade in ['B', 'C']
            return verifier.admin_type in ['epcuser', 'clientuser'] and verifier.grade in ['B', 'C']
        elif requestor.admin_type == 'clientuser':
            # Client requestors can only select Client B verifiers
            return verifier.admin_type == 'clientuser' and verifier.grade == 'B'
        
        return True
    
    @transaction.atomic
    def verify_permit(self, permit, verifier, action, comments='', selected_approver=None):
        """Handle permit verification - verifier selects approver"""
        try:
            workflow = WorkflowInstance.objects.select_for_update().get(pk=permit.workflow_id)
            verification_step = WorkflowStep.objects.select_for_update().get(
                workflow=workflow,
                step_id='verification',
                assignee=verifier
            )
            
            if action == 'approve':
                if not selected_approver:
                    raise ValueError("Approver selection is required for verification approval.")
                # Verification approved
                verification_step.status = 'approved'
                verification_step.completed_at = timezone.now()
                verification_step.comments = comments
                verification_step.save()
                
                # Validate approver selection
                if not self._can_select_approver(verifier, selected_approver):
                    raise ValueError(f"Verifier {verifier.get_full_name()} cannot select {selected_approver.get_full_name()} as approver")
                
                # Create approval step
                approval_step = WorkflowStep.objects.create(
                    workflow=workflow,
                    step_id='approval',
                    name='Permit Approval',
                    step_type='approval',
                    assignee=selected_approver,
                    role=f"{selected_approver.admin_type}_approver",
                    order=3,
                    escalation_time=2,
                    required=True
                )
                
                # Update workflow current step
                workflow.current_step = 3
                workflow.save()
                
                # Send notification to approver
                self._send_approval_notifications(permit, [selected_approver], verifier)
                
                # Update permit status
                canonical_workflow_manager.transition(
                    permit=permit,
                    target_status='under_review',
                    actor=verifier,
                    action='verify_approve',
                    comments=comments,
                    metadata={
                        'verifier_id': verifier.id,
                        'approver_id': selected_approver.id if selected_approver else None,
                        'verification_comments': comments,
                    }
                )
                
                # Create audit log
                self._create_audit_log(permit, 'verified', verifier,
                                     f"Permit verified and sent to {selected_approver.get_full_name()} for approval")
            
            elif action == 'reject':
                # Verification rejected
                verification_step.status = 'rejected'
                verification_step.completed_at = timezone.now()
                verification_step.comments = comments
                verification_step.save()
                
                # Update permit status
                canonical_workflow_manager.transition(
                    permit=permit,
                    target_status='rejected',
                    actor=verifier,
                    action='verify_reject',
                    comments=comments
                )
                
                # Send rejection notification to creator
                self._send_rejection_notifications(permit, permit.created_by, verifier, comments)
                
                # Create audit log
                self._create_audit_log(permit, 'verification_rejected', verifier,
                                     f"Permit verification rejected: {comments}")
            
            return verification_step
            
        except Exception as e:
            logger.error(f"Error verifying permit {permit.permit_number}: {str(e)}")
            raise
    
    def _can_select_approver(self, verifier, approver):
        """Check if verifier can select the approver based on grade rules"""
        # Only EPC and Client can be approvers
        if approver.admin_type not in ['epcuser', 'clientuser']:
            return False
        
        # Approver grade rules:
        # - EPC approver can be A or B
        # - Client approver can be A or B
        if approver.admin_type == 'epcuser' and approver.grade not in ['A', 'B']:
            return False
        if approver.admin_type == 'clientuser' and approver.grade not in ['A', 'B']:
            return False
        
        # Verifier-specific selection rules
        if verifier.admin_type == 'epcuser':
            # EPC B verifiers can select EPC A or Client A/B
            if verifier.grade == 'B':
                return approver.admin_type in ['epcuser', 'clientuser']
            # EPC C verifiers can select EPC A/B or Client A/B
            if verifier.grade == 'C':
                return approver.admin_type in ['epcuser', 'clientuser'] and approver.grade in ['A', 'B']
        if verifier.admin_type == 'clientuser':
            # Client B/C verifiers can only select Client A
            return approver.admin_type == 'clientuser' and approver.grade == 'A'
        
        return False
    
    @transaction.atomic
    def assign_approver(self, permit, approver, assigned_by):
        """Assign approver to verified permit (verifier selects approver)"""
        try:
            # Validate approver selection
            if not self._can_select_approver(assigned_by, approver):
                raise ValueError(f"Verifier {assigned_by.get_full_name()} cannot select {approver.get_full_name()} as approver")
            
            workflow = permit.workflow
            
            # Create approval step
            approval_step = WorkflowStep.objects.create(
                workflow=workflow,
                step_id='approval',
                name='Permit Approval',
                step_type='approval',
                assignee=approver,
                role=f"{approver.admin_type}_approver",
                order=3,
                escalation_time=2,
                required=True
            )
            
            # Remove approver selection step
            WorkflowStep.objects.filter(
                workflow=workflow,
                step_id='approver_selection'
            ).update(status='completed')
            
            # Update workflow and permit
            workflow.current_step = 3
            workflow.save()

            if permit.status != 'under_review':
                canonical_workflow_manager.transition(
                    permit=permit,
                    target_status='under_review',
                    actor=assigned_by,
                    action='assign_approver',
                    metadata={'approver_id': approver.id}
                )
            else:
                if permit.approver_id != approver.id:
                    permit.approver = approver
                    permit._current_user = assigned_by
                    permit.save(update_fields=['approver'])
            
            # Send notification to approver
            self._send_approval_notifications(permit, [approver], assigned_by)
            
            # Create audit log
            self._create_audit_log(permit, 'approver_assigned', assigned_by,
                                 f"Approver assigned: {approver.get_full_name()}")
            
            return approval_step
            
        except Exception as e:
            logger.error(f"Error assigning approver for permit {permit.permit_number}: {str(e)}")
            raise
    
    @transaction.atomic
    def approve_permit(self, permit, approver, action, comments=''):
        """Handle permit approval - first approver wins"""
        try:
            workflow = WorkflowInstance.objects.select_for_update().get(pk=permit.workflow_id)
            
            # Check if already approved by someone else
            existing_approval = WorkflowStep.objects.select_for_update().filter(
                workflow=workflow,
                step_id='approval',
                status='approved'
            ).first()
            
            if existing_approval:
                # Already approved by someone else
                return {
                    'status': 'already_approved',
                    'approved_by': existing_approval.assignee.get_full_name(),
                    'approved_at': existing_approval.completed_at
                }
            
            # Get current user's approval step
            approval_step = WorkflowStep.objects.select_for_update().get(
                workflow=workflow,
                step_id='approval',
                assignee=approver
            )
            
            if action == 'approve':
                # Approval granted - mark all other approval steps as skipped
                WorkflowStep.objects.filter(
                    workflow=workflow,
                    step_id='approval',
                    status='pending'
                ).exclude(assignee=approver).update(status='skipped')
                
                approval_step.status = 'approved'
                approval_step.completed_at = timezone.now()
                approval_step.comments = comments
                approval_step.save()
                
                # Complete workflow
                workflow.status = 'completed'
                workflow.completed_at = timezone.now()
                workflow.save()
                
                # Update permit status
                canonical_workflow_manager.transition(
                    permit=permit,
                    target_status='approved',
                    actor=approver,
                    action='approve_approve',
                    comments=comments,
                    metadata={'approval_comments': comments}
                )
                
                # Send success notification to creator
                self._send_approval_success_notifications(permit, permit.created_by, approver)
                
                # Create audit log
                self._create_audit_log(permit, 'approved', approver,
                                     f"Permit approved: {comments}")
            
            elif action == 'reject':
                # Approval rejected
                approval_step.status = 'rejected'
                approval_step.completed_at = timezone.now()
                approval_step.comments = comments
                approval_step.save()
                
                # Update permit status
                canonical_workflow_manager.transition(
                    permit=permit,
                    target_status='rejected',
                    actor=approver,
                    action='approve_reject',
                    comments=comments
                )
                
                # Send rejection notification to creator
                self._send_rejection_notifications(permit, permit.created_by, approver, comments)
                
                # Create audit log
                self._create_audit_log(permit, 'approval_rejected', approver,
                                     f"Permit approval rejected: {comments}")
            
            return approval_step
            
        except Exception as e:
            logger.error(f"Error approving permit {permit.permit_number}: {str(e)}")
            raise
    
    def get_available_verifiers(self, project, requestor_type, requestor_grade, company_filter=None):
        """Get available verifiers based on requestor type, grade and company filter"""
        # Only EPC and Client can verify
        query = Q(project=project, is_active=True, admin_type__in=['epcuser', 'clientuser'])
        
        # Apply selection rules based on requestor type
        if requestor_type == 'clientuser':
            # Client requestors can only select Client B verifiers
            query &= Q(admin_type='clientuser', grade='B')
        elif requestor_type == 'epcuser':
            # EPC C requestors can only select EPC A/B verifiers
            if requestor_grade == 'C':
                query &= Q(admin_type='epcuser', grade__in=['A', 'B'])
            else:
                # EPC B requestors can select EPC A or Client B/C verifiers
                query &= Q(
                    Q(admin_type='epcuser', grade='A') |
                    Q(admin_type='clientuser', grade__in=['B', 'C'])
                )
        elif requestor_type == 'contractoruser':
            # Contractor requestors can only select EPC B/C verifiers
            query &= Q(admin_type='epcuser', grade__in=['B', 'C'])
        
        # Apply company filter if provided
        if company_filter:
            query &= Q(company_name__icontains=company_filter)
        
        return CustomUser.objects.filter(query).select_related('project')
    
    def get_available_approvers(self, project, verifier_type, verifier_grade, company_filter=None):
        """Get available approvers based on verifier type, grade and company filter"""
        # Base approver pool: EPC A and Client A/B
        query = Q(project=project, is_active=True) & (
            Q(admin_type='epcuser', grade='A') |
            Q(admin_type='clientuser', grade__in=['A', 'B'])
        )
        
        # Apply selection rules based on verifier type
        if verifier_type == 'clientuser':
            # Client B/C verifiers can only select Client A
            query &= Q(admin_type='clientuser', grade='A')
        elif verifier_type == 'epcuser':
            # EPC B verifiers can select EPC A or Client A/B
            if verifier_grade == 'B':
                query &= Q(admin_type__in=['epcuser', 'clientuser'])
            # EPC C verifiers can only select EPC A
            elif verifier_grade == 'C':
                query &= Q(admin_type__in=['epcuser', 'clientuser'], grade__in=['A', 'B'])
        
        # Apply company filter if provided
        if company_filter:
            query &= Q(company_name__icontains=company_filter)
        
        return CustomUser.objects.filter(query).select_related('project')

    
    def _send_verification_notifications(self, permit, users, sender):
        """Send verification notifications"""
        for user in users:
            # Create database notification
            Notification.objects.create(
                user=user,
                title='PTW Verification Required',
                message=f'Permit {permit.permit_number} requires your verification',
                notification_type='ptw_verification',
                data={
                    'permit_id': permit.id,
                    'permit_number': permit.permit_number,
                    'sender': sender.get_full_name(),
                    'location': permit.location
                },
                link=f'/dashboard/ptw/view/{permit.id}'
            )
            
            # Send real-time notification
            self._send_realtime_notification(user, {
                'type': 'ptw_verification',
                'permit_id': permit.id,
                'permit_number': permit.permit_number,
                'message': f'New permit verification required: {permit.permit_number}'
            })
    
    def _send_approval_notifications(self, permit, users, sender):
        """Send approval notifications"""
        for user in users:
            # Create database notification
            Notification.objects.create(
                user=user,
                title='PTW Approval Required',
                message=f'Permit {permit.permit_number} requires your approval',
                notification_type='ptw_approval',
                data={
                    'permit_id': permit.id,
                    'permit_number': permit.permit_number,
                    'sender': sender.get_full_name(),
                    'location': permit.location
                },
                link=f'/dashboard/ptw/view/{permit.id}'
            )
            
            # Send real-time notification
            self._send_realtime_notification(user, {
                'type': 'ptw_approval',
                'permit_id': permit.id,
                'permit_number': permit.permit_number,
                'message': f'New permit approval required: {permit.permit_number}'
            })
    
    def _send_rejection_notifications(self, permit, user, rejector, comments):
        """Send rejection notifications"""
        # Create database notification
        Notification.objects.create(
            user=user,
            title='PTW Rejected',
            message=f'Permit {permit.permit_number} has been rejected',
            notification_type='ptw_rejected',
            data={
                'permit_id': permit.id,
                'permit_number': permit.permit_number,
                'rejector': rejector.get_full_name(),
                'comments': comments
            },
            link=f'/dashboard/ptw/view/{permit.id}'
        )
        
        # Send real-time notification
        self._send_realtime_notification(user, {
            'type': 'ptw_rejected',
            'permit_id': permit.id,
            'permit_number': permit.permit_number,
            'message': f'Permit {permit.permit_number} has been rejected'
        })
    
    def _send_approval_success_notifications(self, permit, user, approver):
        """Send approval success notifications"""
        # Create database notification
        Notification.objects.create(
            user=user,
            title='PTW Approved',
            message=f'Permit {permit.permit_number} has been approved',
            notification_type='ptw_approved',
            data={
                'permit_id': permit.id,
                'permit_number': permit.permit_number,
                'approver': approver.get_full_name(),
                'approved_at': permit.approved_at.isoformat()
            },
            link=f'/dashboard/ptw/view/{permit.id}'
        )
        
        # Send real-time notification
        self._send_realtime_notification(user, {
            'type': 'ptw_approved',
            'permit_id': permit.id,
            'permit_number': permit.permit_number,
            'message': f'Permit {permit.permit_number} has been approved and is ready for work'
        })
    
    def _send_realtime_notification(self, user, data):
        """Send real-time notification via WebSocket"""
        if self.channel_layer:
            async_to_sync(self.channel_layer.group_send)(
                f"user_{user.id}",
                {
                    'type': 'notification_message',
                    'data': data
                }
            )
    
    def _create_audit_log(self, permit, action, user, comments):
        """Create audit log entry"""
        PermitAudit.objects.create(
            permit=permit,
            action=action,
            user=user,
            comments=comments,
            timestamp=timezone.now()
        )
    
    def check_expiring_permits(self):
        """Check for permits nearing expiration and send alerts"""
        from datetime import timedelta
        
        # Get permits expiring in next 2 hours
        expiring_soon = Permit.objects.filter(
            status='active',
            planned_end_time__lte=timezone.now() + timedelta(hours=2),
            planned_end_time__gt=timezone.now()
        )
        
        for permit in expiring_soon:
            # Send expiration alert
            Notification.objects.create(
                user=permit.created_by,
                title='PTW Expiring Soon',
                message=f'Permit {permit.permit_number} expires in less than 2 hours',
                notification_type='ptw_expiring',
                data={
                    'permit_id': permit.id,
                    'permit_number': permit.permit_number,
                    'expires_at': permit.planned_end_time.isoformat()
                },
                link=f'/dashboard/ptw/view/{permit.id}'
            )
            
            # Send real-time alert
            self._send_realtime_notification(permit.created_by, {
                'type': 'ptw_expiring',
                'permit_id': permit.id,
                'permit_number': permit.permit_number,
                'message': f'Permit {permit.permit_number} expires soon!'
            })
    
    def get_workflow_status(self, permit):
        """Get current workflow status"""
        try:
            workflow = permit.workflow
            current_step = workflow.steps.filter(status='pending').first()
            
            return {
                'current_stage': workflow.current_step,
                'status': workflow.status,
                'current_step': current_step.name if current_step else None,
                'assignee': current_step.assignee.get_full_name() if current_step and current_step.assignee else None,
                'steps': [
                    {
                        'name': step.name,
                        'status': step.status,
                        'assignee': step.assignee.get_full_name() if step.assignee else None,
                        'completed_at': step.completed_at,
                        'comments': step.comments
                    }
                    for step in workflow.steps.all().order_by('order')
                ]
            }
        except:
            return {'status': 'no_workflow'}

# Singleton instance
workflow_manager = PTWWorkflowManager()
