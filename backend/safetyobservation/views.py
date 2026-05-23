from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.http import StreamingHttpResponse
from django.db.models import Count
from datetime import timedelta
import csv
from .models import SafetyObservation, SafetyObservationFile, SafetyObservationAttachment
from .serializers import SafetyObservationSerializer, SafetyObservationAttachmentSerializer
from .permissions import SafetyObservationPermission
from .audit import log_change
import logging

logger = logging.getLogger(__name__)

User = get_user_model()

# Allowed MIME types and max file size
ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
MAX_FILE_SIZE_MB = 10
MAX_ATTACHMENTS_PER_OBSERVATION = 10


def _resolve_observation_context(user):
    """
    Resolve tenant/project context for Safety Observation without relying only
    on the legacy athens_tenant_id UUID field. Newer company users commonly
    have company_id/tenant FK/project FK populated after onboarding.
    """
    project = getattr(user, 'project', None)
    tenant_id = getattr(user, 'company_id', None)

    if not tenant_id and getattr(user, 'tenant_id', None):
        tenant_id = getattr(user, 'tenant_id', None)

    if not tenant_id:
        raw_tenant_id = getattr(user, 'athens_tenant_id', None)
        if raw_tenant_id is not None and str(raw_tenant_id).isdigit():
            tenant_id = int(raw_tenant_id)

    if not tenant_id and project is not None:
        # Project.athens_tenant_id is UUID in older data; do not force it into
        # SafetyObservation.athens_tenant_id, which is an integer. Prefer
        # company/tenant IDs for integer tenant scoping.
        tenant_id = getattr(project, 'company_id', None)

    return {
        'tenant_id': tenant_id,
        'project': project,
        'has_project': project is not None,
    }

class SafetyObservationViewSet(viewsets.ModelViewSet):
    serializer_class = SafetyObservationSerializer
    permission_classes = [IsAuthenticated, SafetyObservationPermission]
    lookup_field = 'observationID'

    def get_queryset(self):
        user = self.request.user
        context = _resolve_observation_context(user)
        tenant_id = context['tenant_id']
        if not tenant_id:
            logger.info(
                'SafetyObservation queryset denied: no tenant context user_id=%s user_type=%s company_id=%s project_id=%s',
                getattr(user, 'id', None),
                getattr(user, 'user_type', None),
                getattr(user, 'company_id', None),
                getattr(getattr(user, 'project', None), 'id', None),
            )
            return SafetyObservation.objects.none()
        
        qs = SafetyObservation.objects.filter(athens_tenant_id=tenant_id).order_by('-created_at')
        
        # SLA filters
        today = timezone.localdate()
        
        if self.request.query_params.get('overdue') == 'true':
            qs = qs.filter(target_close_date__lt=today).exclude(observationStatus='closed')
        
        if self.request.query_params.get('due_soon') == 'true':
            qs = qs.filter(
                target_close_date__gte=today,
                target_close_date__lte=today + timedelta(days=7)
            ).exclude(observationStatus='closed')
        
        return qs

    def get_object(self):
        """Override to enforce tenant isolation on direct ID access"""
        obj = super().get_object()
        user = self.request.user
        tenant_id = _resolve_observation_context(user)['tenant_id']
        
        # Enforce tenant boundary - prevent cross-tenant access via URL manipulation
        if obj.athens_tenant_id != tenant_id:
            from rest_framework.exceptions import NotFound
            raise NotFound("Observation not found")
        
        return obj

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        user = self.request.user
        context = _resolve_observation_context(user)
        tenant_id = context['tenant_id']
        if not tenant_id:
            from rest_framework.exceptions import ValidationError
            logger.warning(
                'SafetyObservation create denied: no tenant context user_id=%s user_type=%s company_id=%s project_id=%s',
                getattr(user, 'id', None),
                getattr(user, 'user_type', None),
                getattr(user, 'company_id', None),
                getattr(getattr(user, 'project', None), 'id', None),
            )
            raise ValidationError("Tenant context is required")
        
        observation = serializer.save(
            created_by=user,
            athens_tenant_id=tenant_id,
            project=context['project'],
        )
        
        # Log creation
        log_change(observation, user, 'created')

        # Send assignment notification if someone is assigned
        if observation.correctiveActionAssignedTo:
            self._send_assignment_notification(observation)

        self._send_high_risk_notifications(observation)

    # @require_permission('edit')  # Disabled
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    # @require_permission('edit')  # Disabled
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            # Check if user has permission to delete
            if instance.created_by != request.user and not request.user.is_staff:
                return Response(
                    {'error': 'You do not have permission to delete this observation'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            observation_id = instance.observationID
            instance.delete()
            return Response(
                {'message': f'Safety observation {observation_id} deleted successfully'},
                status=status.HTTP_204_NO_CONTENT
            )
        except SafetyObservation.DoesNotExist:
            return Response(
                {'error': 'Safety observation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error deleting safety observation {kwargs.get('observationID', 'unknown')}: {str(e)}")
            import traceback
            logger.error(f"Delete error traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'Failed to delete safety observation: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def perform_update(self, serializer):
        # Get old instance before save
        old_instance = self.get_object()
        old_data = {
            'typeOfObservation': old_instance.typeOfObservation,
            'severity': old_instance.severity,
            'workLocation': old_instance.workLocation,
            'correctiveActionAssignedTo': old_instance.correctiveActionAssignedTo,
            'target_close_date': old_instance.target_close_date,
        }
        
        observation = serializer.save()
        
        # Log field changes
        for field, old_val in old_data.items():
            new_val = getattr(observation, field)
            if old_val != new_val:
                # Special handling for assignment changes
                if field == 'correctiveActionAssignedTo' and old_val and new_val:
                    log_change(observation, self.request.user, 'assigned', field, old_val, new_val)
                else:
                    log_change(observation, self.request.user, 'updated', field, old_val, new_val)

        # Check for status changes and send appropriate notifications
        self._handle_status_change_notifications(old_instance, observation)

    def _send_assignment_notification(self, observation):
        """Send notification when observation is assigned"""
        try:
            from authentication.notification_utils import send_safety_observation_assignment_notification

            # Find the assigned user
            assigned_user = User.objects.filter(username=observation.correctiveActionAssignedTo).first()
            if assigned_user:
                creator_name = getattr(observation.created_by, 'name', None) or observation.created_by.username

                observation_details = {
                    'typeOfObservation': observation.typeOfObservation,
                    'severity': observation.severity,
                    'workLocation': observation.workLocation,
                }

                send_safety_observation_assignment_notification(
                    assigned_user_id=assigned_user.id,
                    observation_id=observation.observationID,
                    observation_details=observation_details,
                    creator_name=creator_name,
                    sender_id=observation.created_by.id
                )
        except Exception as e:
            pass

    def _send_high_risk_notifications(self, observation):
        """Notify project safety stakeholders for newly created high-risk observations."""
        try:
            risk_score = int(observation.severity or 0) * int(observation.likelihood or 0)
            if risk_score < 8:
                return

            from authentication.models_notification import Notification

            project = getattr(observation, 'project', None)
            stakeholder_filters = {
                'is_active': True,
                'company_id': observation.athens_tenant_id,
            }
            if project is not None:
                stakeholder_filters['project'] = project

            stakeholders = User.objects.filter(**stakeholder_filters).exclude(id=getattr(observation.created_by, 'id', None))
            stakeholders = stakeholders.filter(
                user_type__in=['adminuser', 'companyuser', 'projectadmin']
            )

            safety_keywords = ['hse', 'safety', 'supervisor', 'manager', 'head']
            recipients = []
            seen = set()
            for stakeholder in stakeholders[:50]:
                designation = (getattr(stakeholder, 'designation', '') or '').lower()
                department = (getattr(stakeholder, 'department', '') or '').lower()
                role_type = (getattr(stakeholder, 'role_type', '') or '').lower()
                admin_type = (getattr(stakeholder, 'admin_type', '') or '').lower()
                should_notify = (
                    role_type == 'admin'
                    or admin_type in ['client', 'epc', 'clientuser', 'epcuser']
                    or any(keyword in designation or keyword in department for keyword in safety_keywords)
                )
                if should_notify and stakeholder.id not in seen:
                    seen.add(stakeholder.id)
                    recipients.append(stakeholder)

            if not recipients:
                return

            risk_level = 'Critical' if risk_score >= 12 else 'High'
            summary = (observation.safetyObservationFound or '')[:180]
            Notification.objects.bulk_create([
                Notification(
                    user=recipient,
                    title=f'{risk_level} safety observation reported',
                    message=f'{observation.observationID}: {summary}',
                    notification_type='safety_observation_assigned',
                    data={
                        'observation_id': observation.observationID,
                        'risk_score': risk_score,
                        'risk_level': risk_level,
                        'classification': observation.classification,
                        'work_location': observation.workLocation,
                    },
                    link=f'/dashboard/safetyobservation/{observation.observationID}',
                    sender=observation.created_by,
                )
                for recipient in recipients
            ])
            logger.info(
                'SafetyObservation high-risk notifications sent observation_id=%s risk_score=%s recipients=%s',
                observation.observationID,
                risk_score,
                len(recipients),
            )
        except Exception as e:
            logger.warning('SafetyObservation high-risk notification skipped: %s', str(e))

    def _handle_status_change_notifications(self, old_instance, new_instance):
        """Handle notifications based on status changes"""
        try:
            from authentication.notification_utils import (
                send_safety_observation_commitment_notification,
                send_safety_observation_completion_notification,
                send_safety_observation_approval_notification
            )

            # Check if commitment date was added (assigned person committed)
            logger.info(f"Checking commitment date change for {new_instance.observationID}")
            logger.info(f"Old commitment date: {old_instance.commitmentDate}")
            logger.info(f"New commitment date: {new_instance.commitmentDate}")

            if not old_instance.commitmentDate and new_instance.commitmentDate:
                logger.info(f"Commitment date was added - sending notification")
                if new_instance.created_by:
                    assigned_user = User.objects.filter(username=new_instance.correctiveActionAssignedTo).first()
                    assigned_name = getattr(assigned_user, 'name', None) or assigned_user.username if assigned_user else new_instance.correctiveActionAssignedTo

                    logger.info(f"Sending commitment notification to creator: {new_instance.created_by.username}")
                    send_safety_observation_commitment_notification(
                        creator_user_id=new_instance.created_by.id,
                        observation_id=new_instance.observationID,
                        commitment_date=new_instance.commitmentDate.strftime('%Y-%m-%d'),
                        assigned_person_name=assigned_name,
                        sender_id=assigned_user.id if assigned_user else None
                    )
                    logger.info(f"Commitment notification sent successfully")
                else:
                    logger.warning(f"No creator found for observation {new_instance.observationID}")
            else:
                logger.info(f"Commitment date condition not met - no notification sent")

            # Check if status changed to pending_verification (completion request)
            if (old_instance.observationStatus != 'pending_verification' and
                new_instance.observationStatus == 'pending_verification'):
                if new_instance.created_by:
                    assigned_user = User.objects.filter(username=new_instance.correctiveActionAssignedTo).first()
                    assigned_name = getattr(assigned_user, 'name', None) or assigned_user.username if assigned_user else new_instance.correctiveActionAssignedTo

                    send_safety_observation_completion_notification(
                        creator_user_id=new_instance.created_by.id,
                        observation_id=new_instance.observationID,
                        assigned_person_name=assigned_name,
                        sender_id=assigned_user.id if assigned_user else None
                    )

            # Check if status changed to closed (approved)
            if (old_instance.observationStatus != 'closed' and
                new_instance.observationStatus == 'closed'):
                assigned_user = User.objects.filter(username=new_instance.correctiveActionAssignedTo).first()
                if assigned_user and new_instance.created_by:
                    creator_name = getattr(new_instance.created_by, 'name', None) or new_instance.created_by.username

                    send_safety_observation_approval_notification(
                        assigned_user_id=assigned_user.id,
                        observation_id=new_instance.observationID,
                        creator_name=creator_name,
                        approved=True,
                        sender_id=new_instance.created_by.id
                    )

        except Exception as e:
            pass

    def _send_completion_notification(self, observation):
        """Send notification when fixed photos are uploaded and approval is requested"""
        try:
            logger.info(f"Starting completion notification process for {observation.observationID}")
            from authentication.notification_utils import send_safety_observation_completion_notification

            if observation.created_by:
                logger.info(f"Creator found: {observation.created_by.username} (ID: {observation.created_by.id})")
                assigned_user = User.objects.filter(username=observation.correctiveActionAssignedTo).first()
                assigned_name = getattr(assigned_user, 'name', None) or assigned_user.username if assigned_user else observation.correctiveActionAssignedTo
                logger.info(f"Assigned user: {assigned_name}")

                logger.info(f"Calling notification function with creator_user_id={observation.created_by.id}, observation_id={observation.observationID}")

                result = send_safety_observation_completion_notification(
                    creator_user_id=observation.created_by.id,
                    observation_id=observation.observationID,
                    assigned_person_name=assigned_name,
                    sender_id=assigned_user.id if assigned_user else None
                )
                logger.info(f"Notification function returned: {result}")
                logger.info(f"Completion notification sent to creator {observation.created_by.username}")
            else:
                logger.warning(f"No creator found for observation {observation.observationID}")
        except Exception as e:
            logger.error(f"Error sending completion notification: {e}")
            import traceback
            logger.error(f"Notification error traceback: {traceback.format_exc()}")

    def _send_approval_notification(self, observation, approved=True, feedback=''):
        """Send notification when observation is approved or rejected"""
        try:
            logger.info(f"Starting approval notification process for {observation.observationID}")
            from authentication.notification_utils import send_safety_observation_approval_notification

            # Send notification to assigned person
            assigned_user = User.objects.filter(username=observation.correctiveActionAssignedTo).first()
            if assigned_user:
                logger.info(f"Sending approval notification to assigned user: {assigned_user.username}")

                # Get creator name for notification
                creator_name = getattr(observation.created_by, 'name', None) or observation.created_by.username if observation.created_by else 'Creator'

                result = send_safety_observation_approval_notification(
                    assigned_user_id=assigned_user.id,
                    observation_id=observation.observationID,
                    creator_name=creator_name,
                    approved=approved,
                    sender_id=observation.created_by.id if observation.created_by else None
                )
                logger.info(f"Approval notification function returned: {result}")
            else:
                logger.warning(f"No assigned user found for observation {observation.observationID}")

        except Exception as e:
            logger.error(f"Error sending approval notification: {e}")
            import traceback
            logger.error(f"Approval notification error traceback: {traceback.format_exc()}")

    def _send_commitment_notification(self, observation):
        """Send notification when assigned person provides commitment date"""
        try:
            logger.info(f"Starting commitment notification process for {observation.observationID}")
            logger.info(f"Observation creator: {observation.created_by}")
            logger.info(f"Assigned to: {observation.correctiveActionAssignedTo}")
            logger.info(f"Commitment date: {observation.commitmentDate}")

            from authentication.notification_utils import send_safety_observation_commitment_notification

            if observation.created_by:
                assigned_user = User.objects.filter(username=observation.correctiveActionAssignedTo).first()
                assigned_name = getattr(assigned_user, 'name', None) or assigned_user.username if assigned_user else observation.correctiveActionAssignedTo

                logger.info(f"Sending commitment notification to creator: {observation.created_by.username} (ID: {observation.created_by.id})")
                logger.info(f"Assigned user: {assigned_user} (Name: {assigned_name})")

                result = send_safety_observation_commitment_notification(
                    creator_user_id=observation.created_by.id,
                    observation_id=observation.observationID,
                    commitment_date=observation.commitmentDate.strftime('%Y-%m-%d') if observation.commitmentDate else '',
                    assigned_person_name=assigned_name,
                    sender_id=assigned_user.id if assigned_user else None
                )
                logger.info(f"Commitment notification function returned: {result}")
            else:
                logger.warning(f"No creator found for observation {observation.observationID}")

        except Exception as e:
            logger.error(f"Error sending commitment notification: {e}")
            import traceback
            logger.error(f"Commitment notification error traceback: {traceback.format_exc()}")

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def update_commitment(self, request, observationID=None):
        """Update commitment date and status"""
        try:
            observation = self.get_object()
            commitment_date = request.data.get('commitmentDate')

            if not commitment_date:
                return Response(
                    {'error': 'Commitment date is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            observation.commitmentDate = commitment_date
            observation.observationStatus = 'in_progress'
            observation.save()

            # Send commitment notification to creator
            logger.info(f"Sending commitment notification for {observation.observationID}")
            try:
                self._send_commitment_notification(observation)
                logger.info(f"Commitment notification sent successfully for {observation.observationID}")
            except Exception as e:
                logger.error(f"Failed to send commitment notification: {e}")
                import traceback
                logger.error(f"Commitment notification error traceback: {traceback.format_exc()}")

            serializer = self.get_serializer(observation)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def request_approval(self, request, observationID=None):
        """Request approval after completion"""
        try:
            observation = self.get_object()

            observation.observationStatus = 'pending_verification'
            observation.save()

            serializer = self.get_serializer(observation)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def upload_fixed_photos(self, request, observationID=None):
        """Upload fixed photos for completed work"""
        try:

            observation = self.get_object()

            user = request.user

            # Debug information

            # Check if user has permission to upload fixed photos
            # ONLY the assigned person can upload fixed photos
            if observation.correctiveActionAssignedTo != user.username:
                return Response(
                    {'error': f'Only the assigned person can upload fixed photos. You are: {user.username}, but assigned to: {observation.correctiveActionAssignedTo}'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Handle file uploads
            files = request.FILES.getlist('beforePictures')

            if not files:
                return Response(
                    {'error': 'No files provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Upload fixed photos
            for i, file in enumerate(files):
                SafetyObservationFile.objects.create(
                    safety_observation=observation,
                    file=file,
                    file_name=file.name,
                    file_type='fixed',
                    uploaded_by=request.user
                )

            # Update remarks if provided
            remarks = request.data.get('remarks')
            if remarks:
                observation.remarks = remarks

            # Change status to pending_verification and save
            observation.observationStatus = 'pending_verification'
            observation.save()

            # Send completion notification to creator
            self._send_completion_notification(observation)

            return Response({
                'message': f'Successfully uploaded {len(files)} fixed photos and requested approval',
                'files_uploaded': len(files),
                'status': observation.observationStatus
            })

        except Exception as e:
            import traceback
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve_observation(self, request, observationID=None):
        """Approve and close observation or reject with feedback"""
        try:
            observation = self.get_object()
            approved = request.data.get('approved', True)
            feedback = request.data.get('feedback', '')

            if approved:
                # Approved - change status to closed (final completion)
                observation.observationStatus = 'closed'
                observation.save()

                # Send approval notification to assigned person
                self._send_approval_notification(observation, approved=True)

                logger.info(f"Observation {observation.observationID} approved and closed")
                message_text = 'Observation approved and closed successfully!'

            else:
                # Rejected - change status back to in_progress and save feedback
                observation.observationStatus = 'in_progress'
                if feedback:
                    observation.remarks = f"{observation.remarks}\n\nRejection Feedback: {feedback}" if observation.remarks else f"Rejection Feedback: {feedback}"
                observation.save()

                # Send rejection notification to assigned person
                self._send_approval_notification(observation, approved=False, feedback=feedback)

                logger.info(f"Observation {observation.observationID} rejected with feedback")
                message_text = 'Observation rejected and sent back for revision'

            serializer = self.get_serializer(observation)
            return Response({
                'message': message_text,
                'status': observation.observationStatus,
                'data': serializer.data
            })

        except Exception as e:
            logger.error(f"Error in approve_observation: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='project-users')
    def project_users(self, request):
        """Get users from the same tenant for assignment dropdown"""
        user = request.user
        context = _resolve_observation_context(user)
        tenant_id = context['tenant_id']

        logger.info(
            'SafetyObservation project-users context user_id=%s tenant_id=%s project_id=%s company_id=%s has_project=%s',
            getattr(user, 'id', None),
            tenant_id,
            getattr(context['project'], 'id', None),
            getattr(user, 'company_id', None),
            context['has_project'],
        )
        
        if not tenant_id:
            return Response({
                'error': 'Tenant access required',
                'message': 'Your account is missing tenant access. Contact your administrator.',
                'project_context': {
                    'tenant_id': None,
                    'project_id': None,
                    'project_name': None,
                    'has_project': False,
                    'department': getattr(user, 'department', '') or '',
                    'work_location': '',
                }
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get users from the same tenant
        project_users = User.objects.filter(
            is_active=True,
            company_id=tenant_id,
        ).exclude(user_type='superadmin')

        if context['project'] is not None:
            project_users = project_users.filter(project=context['project'])

        project_users = project_users.values('id', 'username', 'email', 'name', 'surname', 'department')
        
        # Format for dropdown
        users_list = []
        for user_data in project_users:
            display_name = ' '.join(
                part for part in [user_data.get('name'), user_data.get('surname')] if part
            ).strip()
            users_list.append({
                'username': user_data['username'],
                'display_name': display_name or user_data['email'] or user_data['username'],
                'department': user_data.get('department') or '',
            })
        
        return Response({
            'users': users_list,
            'count': len(users_list),
            'project_context': {
                'tenant_id': tenant_id,
                'project_id': getattr(context['project'], 'id', None),
                'project_name': getattr(context['project'], 'projectName', None),
                'has_project': context['has_project'],
                'department': getattr(user, 'department', '') or '',
                'work_location': getattr(context['project'], 'location', '') if context['project'] else '',
            }
        })

    @action(detail=True, methods=['post'], url_path='upload-attachment')
    def upload_attachment(self, request, observationID=None):
        """Upload attachment (photo/document) to observation"""
        observation = self.get_object()
        
        # Check attachment limit
        if observation.attachments.count() >= MAX_ATTACHMENTS_PER_OBSERVATION:
            return Response(
                {'error': f'Maximum {MAX_ATTACHMENTS_PER_OBSERVATION} attachments allowed per observation'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate MIME type
        mime_type = file.content_type
        if mime_type not in ALLOWED_MIME_TYPES:
            return Response(
                {'error': f'File type not allowed. Allowed types: {", ".join(ALLOWED_MIME_TYPES)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file size
        size_mb = file.size / (1024 * 1024)
        if size_mb > MAX_FILE_SIZE_MB:
            return Response(
                {'error': f'File size exceeds {MAX_FILE_SIZE_MB}MB limit'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create attachment
        attachment = SafetyObservationAttachment.objects.create(
            observation=observation,
            athens_tenant_id=observation.athens_tenant_id,
            file=file,
            file_name=file.name,
            file_type=request.data.get('file_type', 'before'),
            mime_type=mime_type,
            size_bytes=file.size,
            uploaded_by=request.user
        )
        
        # Log attachment addition
        log_change(observation, request.user, 'attachment_added', details=f"File: {attachment.file_name}")
        
        serializer = SafetyObservationAttachmentSerializer(attachment, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='attachments')
    def list_attachments(self, request, observationID=None):
        """List all attachments for observation"""
        observation = self.get_object()
        attachments = observation.attachments.all()
        serializer = SafetyObservationAttachmentSerializer(attachments, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['delete'], url_path='attachments/(?P<attachment_id>[^/.]+)')
    def delete_attachment(self, request, observationID=None, attachment_id=None):
        """Delete specific attachment"""
        observation = self.get_object()
        
        try:
            attachment = SafetyObservationAttachment.objects.get(
                id=attachment_id,
                observation=observation,
                athens_tenant_id=observation.athens_tenant_id
            )
            
            # Only creator or uploader can delete
            if attachment.uploaded_by != request.user and observation.created_by != request.user:
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
            )
            
            # Log before deletion
            log_change(observation, request.user, 'attachment_deleted', details=f"File: {attachment.file_name}")
            
            attachment.file.delete()  # Delete file from storage
            attachment.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except SafetyObservationAttachment.DoesNotExist:
            return Response({'error': 'Attachment not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='transition')
    def transition(self, request, observationID=None):
        """Transition observation status (draft→submitted→closed)"""
        observation = self.get_object()
        to_status = request.data.get('to_status')
        
        if not to_status:
            return Response({'error': 'to_status required'}, status=status.HTTP_400_BAD_REQUEST)
        
        old_status = observation.observationStatus
        
        # Validate transitions
        allowed_transitions = {
            'draft': ['submitted'],
            'submitted': ['closed', 'draft'],  # Can reopen to draft
            'closed': ['submitted']  # Can reopen
        }
        
        if to_status not in allowed_transitions.get(old_status, []):
            return Response(
                {'error': f'Cannot transition from {old_status} to {to_status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Permission checks
        if to_status == 'submitted' and observation.created_by != request.user:
            return Response({'error': 'Only creator can submit'}, status=status.HTTP_403_FORBIDDEN)
        
        if to_status == 'closed' and not (request.user.is_staff or observation.created_by == request.user):
            return Response({'error': 'Only owner/admin can close'}, status=status.HTTP_403_FORBIDDEN)
        
        # Update status and timestamps
        observation.observationStatus = to_status
        
        if to_status == 'submitted':
            observation.submitted_at = timezone.now()
        elif to_status == 'closed':
            observation.closed_at = timezone.now()
            observation.closed_by = request.user
        
        observation.save()
        
        # Log status change
        log_change(observation, request.user, 'status_changed', 'observationStatus', old_status, to_status)
        
        serializer = self.get_serializer(observation)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='export')
    def export_csv(self, request):
        """Export observations to CSV with current filters applied"""
        # Get filtered queryset (respects tenant + filters)
        qs = self.get_queryset()
        
        # Optimize query
        qs = qs.select_related('created_by').annotate(
            attachment_count=Count('attachments')
        )
        
        # CSV generator for streaming
        def csv_generator():
            # CSV writer setup
            class Echo:
                def write(self, value):
                    return value
            
            writer = csv.writer(Echo())
            
            # Header row
            yield writer.writerow([
                'ID',
                'Status',
                'Severity',
                'Type',
                'Location',
                'Assigned To',
                'Created By',
                'Created At',
                'Target Close Date',
                'Days Until Due',
                'Is Overdue',
                'Is Due Soon',
                'Submitted At',
                'Closed At',
                'Attachment Count'
            ])
            
            # Data rows
            for obs in qs.iterator(chunk_size=100):
                yield writer.writerow([
                    obs.observationID,
                    obs.observationStatus,
                    obs.get_severity_display() if hasattr(obs, 'get_severity_display') else obs.severity,
                    obs.typeOfObservation,
                    obs.workLocation,
                    obs.correctiveActionAssignedTo or '',
                    obs.created_by.username if obs.created_by else '',
                    obs.created_at.strftime('%Y-%m-%d %H:%M:%S') if obs.created_at else '',
                    obs.target_close_date.strftime('%Y-%m-%d') if obs.target_close_date else '',
                    obs.days_until_due if obs.days_until_due is not None else '',
                    'Yes' if obs.is_overdue else 'No',
                    'Yes' if obs.is_due_soon else 'No',
                    obs.submitted_at.strftime('%Y-%m-%d %H:%M:%S') if obs.submitted_at else '',
                    obs.closed_at.strftime('%Y-%m-%d %H:%M:%S') if obs.closed_at else '',
                    obs.attachment_count
                ])
        
        # Generate filename with current date
        filename = f"safety_observations_{timezone.now().strftime('%Y-%m-%d')}.csv"
        
        # Create streaming response
        response = StreamingHttpResponse(csv_generator(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
    
    @action(detail=True, methods=['get'], url_path='audit-logs')
    def audit_logs(self, request, observationID=None):
        """Get audit trail for observation with pagination"""
        observation = self.get_object()
        
        # Pagination params
        limit = min(int(request.query_params.get('limit', 50)), 200)  # Cap at 200
        offset = int(request.query_params.get('offset', 0))
        
        # Get logs with tenant isolation
        logs = observation.audit_logs.filter(
            athens_tenant_id=observation.athens_tenant_id
        ).select_related('user')[offset:offset + limit]
        
        total_count = observation.audit_logs.filter(
            athens_tenant_id=observation.athens_tenant_id
        ).count()
        
        data = [{
            'id': log.id,
            'user': log.user.get_full_name() if log.user and hasattr(log.user, 'get_full_name') else (log.user.username if log.user else 'System'),
            'action': log.get_action_display(),
            'field_name': log.field_name,
            'old_value': log.old_value,
            'new_value': log.new_value,
            'details': log.details,
            'timestamp': log.timestamp.isoformat()
        } for log in logs]
        
        return Response({
            'results': data,
            'count': len(data),
            'total': total_count,
            'limit': limit,
            'offset': offset
        })
