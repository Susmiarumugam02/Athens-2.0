from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models
from django.contrib.auth import get_user_model
from .models import ToolboxTalk, ToolboxTalkAttendance
from .serializers import ToolboxTalkSerializer, ToolboxTalkAttendanceSerializer, UserSerializer
from .permissions import IsCreatorOrReadOnly
# from permissions.decorators import require_permission  # Removed to avoid authentication issues
from worker.models import Worker
from worker.serializers import WorkerSerializer
from authentication.tenant_scoped_utils import ensure_tenant_context, ensure_project, enforce_collaboration_read_only
from authentication.tenant_scoped import TenantScopedViewSet
import logging
import base64
from django.core.files.base import ContentFile

User = get_user_model()
logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_toolbox_talk(request):
    """Create a new toolbox talk"""
    ensure_tenant_context(request)
    enforce_collaboration_read_only(request, domain='tbt')
    serializer = ToolboxTalkSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save(created_by=request.user, project=ensure_project(request))
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ToolboxTalkViewSet(TenantScopedViewSet):
    """
    API endpoint for Toolbox Talks
    """
    serializer_class = ToolboxTalkSerializer
    permission_classes = [permissions.IsAuthenticated, IsCreatorOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'date', 'created_by']
    search_fields = ['title', 'location', 'conducted_by']
    ordering_fields = ['date', 'title', 'created_at', 'status']
    ordering = ['-date']
    model = ToolboxTalk  # Required for permission decorator
    collaboration_enabled = True
    collaboration_domain = 'tbt'
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, project=self.get_user_project())

    def get_queryset(self):
        """
        Filter toolbox talks based on user's project and permissions
        """
        user = self.request.user
        if not user.is_authenticated:
            return ToolboxTalk.objects.none()
            
        # For superusers or admin users, show all TBTs
        if user.is_superuser:
            return ToolboxTalk.objects.all()

        return super().get_queryset()
    
    @action(detail=True, methods=['get', 'post'])
    def attendance(self, request, pk=None):
        """
        Get or submit attendance for a toolbox talk with face recognition
        """
        toolbox_talk = self.get_object()
        
        if request.method == 'GET':
            # Return attendance records for the toolbox talk
            attendance_records = ToolboxTalkAttendance.objects.filter(toolbox_talk=toolbox_talk)
            serializer = ToolboxTalkAttendanceSerializer(attendance_records, many=True)
            return Response(serializer.data)
        
        # POST method - submit attendance with face recognition
        attendance_records = request.data.get('attendance_records', [])
        evidence_photo = request.data.get('evidence_photo')
        
        if not attendance_records:
            return Response(
                {"error": "No attendance records provided"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Import face recognition utility
        from shared.training_face_recognition import compare_training_faces, get_participant_photo_path
        
        # Clear existing attendance records
        ToolboxTalkAttendance.objects.filter(toolbox_talk=toolbox_talk).delete()
        
        # Create new attendance records with face recognition
        created_records = []
        face_recognition_results = []
        failed_records = []
        
        for record in attendance_records:
            try:
                participant_type = record.get('participant_type', 'worker')
                participant_id = record.get('participant_id') or record.get('worker_id')
                attendance_photo = record.get('attendance_photo', '')
                
                if not participant_id:
                    failed_records.append({'record': record, 'error': 'Missing participant_id'})
                    continue
                
                # Perform face recognition if attendance photo is provided
                face_match_result = {'matched': True, 'confidence': 1.0, 'message': 'No photo verification'}
                
                if attendance_photo:
                    profile_photo_path = get_participant_photo_path(participant_type, participant_id)
                    if profile_photo_path:
                        face_match_result = compare_training_faces(profile_photo_path, attendance_photo)
                        face_recognition_results.append({
                            'participant_id': participant_id,
                            'participant_type': participant_type,
                            'face_result': face_match_result
                        })
                    else:
                        face_match_result = {'matched': False, 'confidence': 0.0, 'message': 'Profile photo not found'}
                
                if participant_type == 'worker':
                    worker = Worker.objects.get(id=participant_id, project=request.user.project)
                    
                    # Create attendance record
                    attendance = ToolboxTalkAttendance.objects.create(
                        toolbox_talk=toolbox_talk,
                        worker=worker,
                        status='present' if face_match_result['matched'] else 'absent',
                        match_score=face_match_result['confidence']
                    )
                    
                    # Save attendance photo if provided
                    if attendance_photo and attendance_photo.startswith('data:image'):
                        format, imgstr = attendance_photo.split(';base64,')
                        ext = format.split('/')[-1]
                        attendance_photo_file = ContentFile(
                            base64.b64decode(imgstr),
                            name=f"attendance_{worker.id}_{toolbox_talk.id}.{ext}"
                        )
                        attendance.attendance_photo = attendance_photo_file
                        attendance.save()
                    
                    created_records.append(attendance)
                    
                elif participant_type == 'user':
                    # Handle user attendance (log for now)
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    user = User.objects.get(id=participant_id, project=request.user.project)
                    logger.info(f"User attendance for toolbox talk: {user.username} - Face match: {face_match_result['matched']}")
                    
            except Worker.DoesNotExist:
                failed_records.append({'record': record, 'error': f'Worker with ID {participant_id} not found in project'})
                continue
            except Exception as e:
                logger.error(f"Error processing attendance record: {e}")
                failed_records.append({'record': record, 'error': str(e)})
                continue
        
        # Update toolbox talk status to completed
        toolbox_talk.status = 'completed'
        if evidence_photo and evidence_photo.startswith('data:image'):
            format, imgstr = evidence_photo.split(';base64,')
            ext = format.split('/')[-1]
            evidence_photo_file = ContentFile(
                base64.b64decode(imgstr),
                name=f"evidence_{toolbox_talk.id}.{ext}"
            )
            toolbox_talk.evidence_photo = evidence_photo_file
        toolbox_talk.save()
        
        return Response({
            'message': 'Attendance submitted successfully with face recognition',
            'records_created': len(created_records),
            'failed_records': failed_records,
            'face_recognition_results': face_recognition_results,
            'total_submitted': len(attendance_records),
            'success_rate': f"{(len(created_records)/len(attendance_records)*100):.1f}%" if attendance_records else "0%"
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def attendance_old(self, request, pk=None):
        """
        Get attendance records for a toolbox talk
        """
        toolbox_talk = self.get_object()
        attendance_records = ToolboxTalkAttendance.objects.filter(toolbox_talk=toolbox_talk)
        serializer = ToolboxTalkAttendanceSerializer(attendance_records, many=True)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_list(request):
    """
    Get a list of admin users for the conducted_by dropdown
    """
    ensure_tenant_context(request)
    user_project = ensure_project(request)
    # Get all users with user_type='adminuser'
    users = User.objects.filter(user_type='adminuser', project=user_project)
    
    # Format the response to match the expected format in the frontend
    user_data = []
    for user in users:
        user_data.append({
            'id': user.id,
            'username': user.username,
            'name': f"{getattr(user, 'name', '')} {getattr(user, 'surname', '')}".strip() or user.username,
            'email': user.email or ''
        })
    
    return Response(user_data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_search(request):
    """
    Search for admin users to populate the dropdown
    """
    ensure_tenant_context(request)
    user_project = ensure_project(request)
    query = request.query_params.get('q', '')
    
    # Base query: get users with user_type='adminuser'
    users_query = User.objects.filter(project=user_project)
    
    # Check if the user_type field exists before filtering on it
    if hasattr(User, 'user_type'):
        users_query = users_query.filter(user_type='adminuser')
    
    # If search query is provided, filter further
    if query:
        users_query = users_query.filter(
            models.Q(username__icontains=query) | 
            models.Q(email__icontains=query) |
            models.Q(name__icontains=query) |
            models.Q(surname__icontains=query)
        )
    
    # Limit to 10 results
    users = users_query[:10]
    
    # Format the response to match the expected format in the frontend
    user_data = []
    for user in users:
        user_data.append({
            'id': user.id,
            'username': user.username,
            'name': f"{getattr(user, 'name', '')} {getattr(user, 'surname', '')}".strip() or user.username,
            'email': getattr(user, 'email', '') or ''
        })
    
    return Response(user_data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def trained_personnel(request):
    """
    Get all induction-trained personnel (both workers and users) for toolbox talk attendance.
    This includes both workers and admin users who have completed induction training.
    """
    try:
        from inductiontraining.models import InductionAttendance, InductionTraining
        from worker.models import Worker
        from worker.serializers import WorkerSerializer
        from authentication.serializers import AdminUserCommonSerializer

        ensure_tenant_context(request)
        user_project = ensure_project(request)
        
        # Get attendance records from completed inductions in current project
        project_inductions = InductionTraining.objects.filter(
            project=user_project,
            status='completed'
        )
        
        trained_attendance = InductionAttendance.objects.filter(
            induction__in=project_inductions,
            status='present'
        ).select_related('induction').order_by('-induction__date', 'worker_name')

        # Separate workers and users
        worker_records = trained_attendance.filter(participant_type='worker', worker_id__gt=0)
        user_records = trained_attendance.filter(participant_type='user', worker_id__lt=0)

        # Get unique worker IDs and user IDs
        trained_worker_ids = list(worker_records.values_list('worker_id', flat=True).distinct())
        trained_user_ids = [-id for id in user_records.values_list('worker_id', flat=True).distinct()]

        # Get worker details
        trained_workers = Worker.objects.filter(
            id__in=trained_worker_ids,
            project=user_project
        ).select_related('project', 'created_by')

        # Get user details
        trained_users = User.objects.filter(
            id__in=trained_user_ids,
            project=user_project
        ).select_related('project')

        # Prepare worker data
        workers_data = []
        for worker in trained_workers:
            worker_serializer = WorkerSerializer(worker, context={'request': request})
            worker_data = worker_serializer.data
            worker_data['participant_type'] = 'worker'
            worker_data['participant_id'] = worker.id
            
            # Fix photo URLs
            if worker_data.get('photo') and not worker_data['photo'].startswith('http'):
                worker_data['photo'] = request.build_absolute_uri(worker_data['photo'])
            
            workers_data.append(worker_data)

        # Prepare user data
        users_data = []
        for user in trained_users:
            try:
                from authentication.serializers import AdminUserCommonSerializer
                user_serializer = AdminUserCommonSerializer(user, context={'request': request})
                user_data = user_serializer.data
            except:
                # Fallback if AdminUserCommonSerializer doesn't exist
                user_data = {
                    'id': user.id,
                    'name': user.name or '',
                    'surname': user.surname or '',
                    'email': user.email or '',
                    'username': user.username,
                    'phone_number': getattr(user, 'phone_number', ''),
                    'department': getattr(user, 'department', ''),
                    'designation': getattr(user, 'designation', ''),
                }
            
            user_data['participant_type'] = 'user'
            user_data['participant_id'] = user.id
            
            # Add photo from user_detail if available
            try:
                if hasattr(user, 'user_detail') and user.user_detail and user.user_detail.photo:
                    photo_url = user.user_detail.photo.url
                    if not photo_url.startswith('http'):
                        user_data['photo'] = request.build_absolute_uri(photo_url)
                    else:
                        user_data['photo'] = photo_url
            except:
                user_data['photo'] = None
            
            users_data.append(user_data)

        # Combine all trained personnel
        all_trained = workers_data + users_data

        return Response({
            'count': len(all_trained),
            'workers': workers_data,
            'users': users_data,
            'all_participants': all_trained,
            'workers_count': len(workers_data),
            'users_count': len(users_data),
            'message': f'Found {len(all_trained)} trained personnel eligible for toolbox talks'
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {"error": f"Failed to fetch trained personnel: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_attendance(request):
    """
    Submit attendance records for a toolbox talk with face recognition
    """
    ensure_tenant_context(request)
    enforce_collaboration_read_only(request, domain='tbt')
    toolbox_talk_id = request.data.get('toolbox_talk_id')
    attendance_records = request.data.get('attendance_records', [])
    evidence_photo = request.data.get('evidence_photo')
    
    if not toolbox_talk_id:
        return Response({'error': 'Toolbox talk ID is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        toolbox_talk = ToolboxTalk.objects.get(id=toolbox_talk_id)
    except ToolboxTalk.DoesNotExist:
        return Response({'error': 'Toolbox talk not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Import face recognition utility
    from shared.training_face_recognition import compare_training_faces, get_participant_photo_path
    
    # Clear existing attendance records
    ToolboxTalkAttendance.objects.filter(toolbox_talk=toolbox_talk).delete()
    
    # Create new attendance records with face recognition
    created_records = []
    face_recognition_results = []
    failed_records = []
    
    for record in attendance_records:
        try:
            participant_type = record.get('participant_type', 'worker')
            participant_id = record.get('participant_id') or record.get('worker_id')
            attendance_photo = record.get('attendance_photo', '')
            
            if not participant_id:
                failed_records.append({'record': record, 'error': 'Missing participant_id'})
                continue
            
            # Perform face recognition if attendance photo is provided
            face_match_result = {'matched': True, 'confidence': 1.0, 'message': 'No photo verification'}
            
            if attendance_photo:
                profile_photo_path = get_participant_photo_path(participant_type, participant_id)
                if profile_photo_path:
                    face_match_result = compare_training_faces(profile_photo_path, attendance_photo)
                    face_recognition_results.append({
                        'participant_id': participant_id,
                        'participant_type': participant_type,
                        'face_result': face_match_result
                    })
                else:
                    face_match_result = {'matched': False, 'confidence': 0.0, 'message': 'Profile photo not found'}
            
            if participant_type == 'worker':
                worker = Worker.objects.get(id=participant_id)
                
                # Create attendance record
                attendance = ToolboxTalkAttendance.objects.create(
                    toolbox_talk=toolbox_talk,
                    worker=worker,
                    status='present' if face_match_result['matched'] else 'absent',
                    match_score=face_match_result['confidence']
                )
                
                # Save attendance photo if provided
                if attendance_photo:
                    # Convert base64 to file if needed
                    if attendance_photo.startswith('data:image'):
                        format, imgstr = attendance_photo.split(';base64,')
                        ext = format.split('/')[-1]
                        attendance_photo_file = ContentFile(
                            base64.b64decode(imgstr),
                            name=f"attendance_{worker.id}_{toolbox_talk.id}.{ext}"
                        )
                        attendance.attendance_photo = attendance_photo_file
                        attendance.save()
                
                created_records.append(attendance)
                
            elif participant_type == 'user':
                # Handle user attendance (extend model if needed)
                from django.contrib.auth import get_user_model
                User = get_user_model()
                user = User.objects.get(id=participant_id)
                
                # For now, create a worker-like record for users
                # Note: You may need to extend ToolboxTalkAttendance model to support users
                logger.info(f"User attendance for toolbox talk: {user.username} - Face match: {face_match_result['matched']}")
                
        except Worker.DoesNotExist:
            failed_records.append({'record': record, 'error': f'Worker with ID {participant_id} not found'})
            continue
        except Exception as e:
            logger.error(f"Error processing attendance record: {e}")
            failed_records.append({'record': record, 'error': str(e)})
            continue
    
    # Update toolbox talk status to completed
    toolbox_talk.status = 'completed'
    if evidence_photo:
        # Handle evidence photo if provided
        if evidence_photo.startswith('data:image'):
            format, imgstr = evidence_photo.split(';base64,')
            ext = format.split('/')[-1]
            evidence_photo_file = ContentFile(
                base64.b64decode(imgstr),
                name=f"evidence_{toolbox_talk.id}.{ext}"
            )
            toolbox_talk.evidence_photo = evidence_photo_file
    toolbox_talk.save()
    
    return Response({
        'message': 'Attendance submitted successfully with face recognition',
        'records_created': len(created_records),
        'failed_records': failed_records,
        'face_recognition_results': face_recognition_results,
        'total_submitted': len(attendance_records),
        'success_rate': f"{(len(created_records)/len(attendance_records)*100):.1f}%" if attendance_records else "0%"
    }, status=status.HTTP_201_CREATED)
