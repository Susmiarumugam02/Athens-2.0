from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.http import Http404
from .models import Permit, WorkflowStep, WorkflowInstance
from .canonical_workflow_manager import canonical_workflow_manager
from .ptw_permissions import ptw_permissions
from .api_errors import ptw_api_errors
from .serializers import PermitSerializer, WorkflowStepSerializer, AssignVerifierSerializer
from .signature_service import signature_service
from .workflow_manager import workflow_manager
from .unified_error_handling import PTWValidationError, PTWPermissionError, PTWWorkflowError
from authentication.models import CustomUser
# from authentication.serializers import AdminUserCommonSerializer  # Optional - lazy import if needed
from .status_utils import normalize_permit_status
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def initiate_workflow(request, permit_id):
    """Initiate workflow for a permit"""
    try:
        permit = get_object_or_404(Permit, id=permit_id, project=request.user.project)
        
        # Check if user can initiate workflow
        if not ptw_permissions.can_submit_permit(request.user, permit):
            return Response(
                {'error': 'Only permit creator can initiate workflow'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if permit.status != 'draft':
            return Response(
                {'error': 'Workflow can only be initiated for draft permits'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get creator's admin profile
        try:
            creator = request.user
        except Exception:
            return Response(
                {'error': 'User profile not found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate required signatures before initiating workflow
        signature_service.validate_signature_for_workflow(permit, 'submit', request.user)
        
        # Initiate workflow using unified manager (creates steps + status)
        workflow = workflow_manager.initiate_workflow(permit, creator)
        permit.refresh_from_db()
        
        # Send notification
        from .notification_utils import notify_permit_submitted
        notify_permit_submitted(permit)
        
        return Response({
            'message': 'Workflow initiated successfully',
            'workflow_id': workflow.id,
            'permit_status': permit.status,
            'next_step': 'verification' if creator.user_type == 'contractor' else 'select_verifier'
        }, status=status.HTTP_200_OK)
        
    except ValueError as e:
        return ptw_api_errors.validation_error(str(e))
    except PTWPermissionError as e:
        return ptw_api_errors.permission_error(str(e))
    except (PTWValidationError, PTWWorkflowError) as e:
        return ptw_api_errors.validation_error(str(e))
    except Exception as e:
        logger.error(f"Error initiating workflow: {str(e)}")
        return Response(
            {'error': 'Failed to initiate workflow'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def assign_verifier(request, permit_id):
    """Assign verifier to permit (for EPC/Client created permits)"""
    try:
        permit = get_object_or_404(Permit, id=permit_id, project=request.user.project)
        
        # Handle both verifier_id and verifier fields for backward compatibility
        verifier_id = request.data.get('verifier_id') or request.data.get('verifier')
        if not verifier_id:
            return Response(
                {'error': 'Verifier ID is required', 'field': 'verifier_id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        current_status = normalize_permit_status(permit.status)
        if current_status not in ['draft', 'submitted']:
            return Response(
                {'error': 'Cannot change verifier after verification is completed', 'field': 'status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check permissions - only permit creator can assign verifier
        if permit.created_by != request.user:
            return Response(
                {'error': 'Only permit creator can assign verifier'},
                status=status.HTTP_403_FORBIDDEN
            )

        verifier = CustomUser.objects.filter(id=verifier_id, project=permit.project).first()
        if not verifier:
            return Response(
                {'error': 'Verifier not found for this project', 'field': 'verifier_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Assign verifier directly to permit
        permit.verifier = verifier
        permit.save(update_fields=['verifier'])
        
        # Ensure workflow exists and update it
        try:
            workflow = permit.workflow
        except WorkflowInstance.DoesNotExist:
            workflow = WorkflowInstance.objects.create(
                permit=permit,
                current_step=1,
                status='active'
            )
        
        # Update or create verification step
        verification_step, created = WorkflowStep.objects.get_or_create(
            workflow=workflow,
            step_id='verification',
            defaults={
                'name': 'Verification',
                'step_type': 'approval',
                'assignee': verifier,
                'role': 'verifier',
                'order': 1,
                'required': True,
                'status': 'pending'
            }
        )
        if not created:
            verification_step.assignee = verifier
            verification_step.status = 'pending'
            verification_step.save(update_fields=['assignee', 'status'])
        
        return Response({
            'message': 'Verifier assigned successfully',
            'verifier': {
                'id': verifier.id,
                'username': verifier.username,
                'name': verifier.name,
                'surname': verifier.surname,
                'email': verifier.email
            },
            'permit_status': permit.status
        }, status=status.HTTP_200_OK)
        
    except Http404:
        return Response(
            {'error': 'Permit not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error assigning verifier: {str(e)}")
        return Response(
            {'error': 'Failed to assign verifier'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def verify_permit(request, permit_id):
    """Verify permit (approve/reject verification)"""
    try:
        permit = get_object_or_404(Permit, id=permit_id, project=request.user.project)
        action = request.data.get('action')  # 'approve' or 'reject'
        comments = request.data.get('comments', '')
        approver_id = request.data.get('approver_id')  # Required for approve action
        
        if action not in ['approve', 'reject']:
            return Response(
                {'error': 'Action must be either "approve" or "reject"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get verifier's admin profile
        try:
            verifier = request.user
        except Exception:
            return Response(
                {'error': 'User profile not found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user is assigned as verifier
        verification_step = WorkflowStep.objects.filter(
            workflow__permit=permit,
            step_id='verification',
            assignee=verifier,
            status='pending'
        ).first()
        
        if not verification_step:
            return Response(
                {'error': 'You are not assigned as verifier for this permit'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        selected_approver = None
        if action == 'approve':
            if not approver_id:
                return Response(
                    {'error': 'Approver ID is required to approve verification'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            selected_approver = get_object_or_404(CustomUser, id=approver_id, project=request.user.project)
        
        # Validate required signatures before verification
        if action == 'approve':
            signature_service.validate_signature_for_workflow(permit, 'verify', request.user)
        
        # Verify permit using workflow manager (updates steps + status)
        verification_step = workflow_manager.verify_permit(
            permit=permit,
            verifier=verifier,
            action=action,
            comments=comments,
            selected_approver=selected_approver
        )
        permit.refresh_from_db()
        
        # Send notifications
        from .notification_utils import notify_approver_assigned, notify_permit_rejected
        if action == 'approve' and selected_approver:
            notify_approver_assigned(permit, selected_approver.id)
        elif action == 'reject':
            notify_permit_rejected(permit, verifier.id, comments)
        
        response_data = {
            'message': f'Permit {action}d successfully',
            'permit_status': permit.status,
            'verification_step': WorkflowStepSerializer(verification_step).data
        }
        
        if selected_approver:
            response_data['approver'] = AdminUserCommonSerializer(selected_approver).data
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except ValueError as e:
        return ptw_api_errors.validation_error(str(e))
    except PTWPermissionError as e:
        return ptw_api_errors.permission_error(str(e))
    except (PTWValidationError, PTWWorkflowError) as e:
        return ptw_api_errors.validation_error(str(e))
    except Exception as e:
        logger.error(f"Error verifying permit: {str(e)}")
        return Response(
            {'error': 'Failed to verify permit'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def assign_approver(request, permit_id):
    """Assign approver to verified permit"""
    try:
        permit = get_object_or_404(Permit, id=permit_id, project=request.user.project)
        approver_id = request.data.get('approver_id')
        
        if not approver_id:
            return Response(
                {'error': 'Approver ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get approver
        approver = get_object_or_404(CustomUser, id=approver_id, project=request.user.project)
        
        # Get assigner's admin profile
        try:
            assigner = request.user
        except Exception:
            return Response(
                {'error': 'User profile not found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user can assign approver (must be verifier)
        verification_step = WorkflowStep.objects.filter(
            workflow__permit=permit,
            step_id='verification',
            assignee=assigner,
            status='approved'
        ).first()
        
        if not verification_step:
            return Response(
                {'error': 'Only the verifier can assign approver'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Assign approver using workflow manager (updates steps + status)
        approval_step = workflow_manager.assign_approver(permit, approver, assigner)
        permit.refresh_from_db()
        
        return Response({
            'message': 'Approver assigned successfully',
            'approver': AdminUserCommonSerializer(approver).data,
            'permit_status': permit.status
        }, status=status.HTTP_200_OK)
        
    except ValueError as e:
        return ptw_api_errors.validation_error(str(e))
    except PTWPermissionError as e:
        return ptw_api_errors.permission_error(str(e))
    except (PTWValidationError, PTWWorkflowError) as e:
        return ptw_api_errors.validation_error(str(e))
    except Exception as e:
        logger.error(f"Error assigning approver: {str(e)}")
        return Response(
            {'error': 'Failed to assign approver'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def approve_permit(request, permit_id):
    """Approve permit (final approval)"""
    from rest_framework.exceptions import ValidationError as DRFValidationError
    from .validators import validate_permit_requirements
    
    try:
        permit = get_object_or_404(Permit, id=permit_id, project=request.user.project)
        action = request.data.get('action')  # 'approve' or 'reject'
        comments = request.data.get('comments', '')
        
        if action not in ['approve', 'reject']:
            return Response(
                {'error': 'Action must be either "approve" or "reject"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get approver's admin profile
        try:
            approver = request.user
        except Exception:
            return Response(
                {'error': 'User profile not found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user is assigned as approver
        approval_step = WorkflowStep.objects.filter(
            workflow__permit=permit,
            step_id='approval',
            assignee=approver,
            status='pending'
        ).first()
        
        if not approval_step:
            return Response(
                {'error': 'You are not assigned as approver for this permit'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate permit requirements before approval
        if action == 'approve':
            try:
                validate_permit_requirements(permit, action='approval')
            except DRFValidationError as e:
                return Response(
                    e.detail,
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Validate required signatures before approval
        if action == 'approve':
            signature_service.validate_signature_for_workflow(permit, 'approve', request.user)
        
        # Approve permit using workflow manager (updates steps + status)
        approval_step = workflow_manager.approve_permit(
            permit=permit,
            approver=approver,
            action=action,
            comments=comments
        )
        permit.refresh_from_db()
        
        # Send notifications
        from .notification_utils import notify_permit_approved, notify_permit_rejected
        if action == 'approve':
            notify_permit_approved(permit, approver.id)
        else:
            notify_permit_rejected(permit, approver.id, comments)
        
        return Response({
            'message': f'Permit {action}d successfully',
            'permit_status': permit.status,
            'approval_step': WorkflowStepSerializer(approval_step).data
        }, status=status.HTTP_200_OK)
        
    except ValueError as e:
        return ptw_api_errors.validation_error(str(e))
    except PTWPermissionError as e:
        return ptw_api_errors.permission_error(str(e))
    except (PTWValidationError, PTWWorkflowError) as e:
        return ptw_api_errors.validation_error(str(e))
    except Exception as e:
        logger.error(f"Error approving permit: {str(e)}")
        return Response(
            {'error': 'Failed to approve permit'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_available_verifiers(request):
    """Get available verifiers for permit verification"""
    try:
        user_type = request.GET.get('user_type')  # 'epc' or 'client'
        grade = request.GET.get('grade')  # 'a', 'b', or 'c'
        
        # Get available verifiers using permission helper
        verifiers = ptw_permissions.get_available_verifiers(
            project=request.user.project,
            user_type=user_type,
            grade=grade
        )
        
        return Response({
            'verifiers': AdminUserCommonSerializer(verifiers, many=True).data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting verifiers: {str(e)}")
        return Response(
            {'error': 'Failed to get verifiers'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_available_approvers(request):
    """Get available approvers for permit approval"""
    try:
        user_type = request.GET.get('user_type')  # 'epc' or 'client'
        grade = request.GET.get('grade')  # 'a', 'b', or 'c'
        
        # Get available approvers using permission helper
        approvers = ptw_permissions.get_available_approvers(
            project=request.user.project,
            user_type=user_type,
            grade=grade
        )
        
        return Response({
            'approvers': AdminUserCommonSerializer(approvers, many=True).data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting approvers: {str(e)}")
        return Response(
            {'error': 'Failed to get approvers'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_workflow_status(request, permit_id):
    """Get workflow status for a permit"""
    try:
        permit = get_object_or_404(Permit, id=permit_id, project=request.user.project)
        
        # Get workflow status from permit model
        workflow_status = {
            'status': permit.status,
            'current_step': permit.workflow.current_step if hasattr(permit, 'workflow') else None,
            'steps': list(permit.workflow.steps.values('step_id', 'status', 'assignee__username')) if hasattr(permit, 'workflow') else []
        }
        
        return Response({
            'permit_id': permit.id,
            'permit_number': permit.permit_number,
            'workflow_status': workflow_status
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting workflow status: {str(e)}")
        return Response(
            {'error': 'Failed to get workflow status'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_workflow_tasks(request):
    """Get workflow tasks assigned to current user"""
    try:
        # Get user's admin profile
        try:
            admin_user = request.user
        except Exception:
            return Response(
                {'error': 'User profile not found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get pending workflow steps assigned to user
        pending_steps = WorkflowStep.objects.filter(
            assignee=admin_user,
            status='pending',
            workflow__permit__project=request.user.project
        ).select_related('workflow__permit', 'workflow__permit__permit_type')
        
        tasks = []
        for step in pending_steps:
            permit = step.workflow.permit
            tasks.append({
                'step_id': step.id,
                'step_type': step.step_type,
                'step_name': step.name,
                'permit_id': permit.id,
                'permit_number': permit.permit_number,
                'permit_type': permit.permit_type.name,
                'location': permit.location,
                'created_by': permit.created_by.get_full_name(),
                'created_at': permit.created_at,
                'escalation_time': step.escalation_time,
                'order': step.order
            })
        
        return Response({
            'tasks': tasks,
            'count': len(tasks)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting workflow tasks: {str(e)}")
        return Response(
            {'error': 'Failed to get workflow tasks'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def resubmit_permit(request, permit_id):
    """Resubmit rejected permit"""
    try:
        permit = get_object_or_404(Permit, id=permit_id, project=request.user.project)
        
        # Check if user can resubmit
        if permit.created_by != request.user:
            return Response(
                {'error': 'Only permit creator can resubmit'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if permit.status != 'rejected':
            return Response(
                {'error': 'Only rejected permits can be resubmitted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get creator's admin profile
        try:
            creator = request.user
        except Exception:
            return Response(
                {'error': 'User profile not found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Delete old workflow
        if hasattr(permit, 'workflow'):
            permit.workflow.delete()

        # Reset status via canonical manager then re-initiate workflow
        canonical_workflow_manager.transition(
            permit=permit,
            new_status='draft',
            user=creator,
            action='resubmit_workflow'
        )

        workflow = workflow_manager.initiate_workflow(permit, creator)
        
        return Response({
            'message': 'Permit resubmitted successfully',
            'workflow_id': workflow.id,
            'permit_status': permit.status
        }, status=status.HTTP_200_OK)
        
    except ValueError as e:
        return ptw_api_errors.validation_error(str(e))
    except PTWPermissionError as e:
        return ptw_api_errors.permission_error(str(e))
    except (PTWValidationError, PTWWorkflowError) as e:
        return ptw_api_errors.validation_error(str(e))
    except Exception as e:
        logger.error(f"Error resubmitting permit: {str(e)}")
        return Response(
            {'error': 'Failed to resubmit permit'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
