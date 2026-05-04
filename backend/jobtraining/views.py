from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db import models
from .models import JobTraining, JobTrainingAttendance
from .serializers import (
    JobTrainingSerializer, 
    JobTrainingListSerializer, 
    JobTrainingAttendanceSerializer,
    UserSerializer
)
from worker.models import Worker
from permissions.decorators import require_permission
from authentication.tenant_scoped import TenantScopedViewSet
from authentication.tenant_scoped_utils import ensure_tenant_context, ensure_project, enforce_collaboration_read_only

User = get_user_model()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_job_training(request):
    """Create a new job training"""
    ensure_tenant_context(request)
    enforce_collaboration_read_only(request, domain='jobtraining')
    serializer = JobTrainingSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(created_by=request.user, project=ensure_project(request))
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class JobTrainingViewSet(TenantScopedViewSet):
    permission_classes = [IsAuthenticated]
    model = JobTraining  # Required for permission decorator
    collaboration_enabled = True
    collaboration_domain = 'jobtraining'
    
    def get_serializer_class(self):
        if self.action == 'list':
            return JobTrainingListSerializer
        return JobTrainingSerializer
    
    def get_queryset(self):
        return super().get_queryset().order_by('-created_at')
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, project=self.get_user_project())
    
    @action(detail=False, methods=['get'], url_path='users/list')
    def users_list(self, request):
        """
        Get a list of admin users for the conducted_by dropdown
        """
        # Get all users with user_type='adminuser'
        users = User.objects.filter(user_type='adminuser', project=self.get_user_project())
        
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
    
    @action(detail=False, methods=['get'], url_path='users/search')
    def users_search(self, request):
        """
        Search for admin users to populate the dropdown
        """
        query = request.query_params.get('q', '')
        
        # Base query: get users with user_type='adminuser'
        users_query = User.objects.filter(project=self.get_user_project())
        
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

    @action(detail=False, methods=['get'], url_path='trained-personnel')
    def trained_personnel(self, request):
        """
        Get all induction-trained personnel (both workers and users) for job training attendance.
        This includes both workers and admin users who have completed induction training.
        """
        try:
            from inductiontraining.models import InductionAttendance, InductionTraining
            from worker.models import Worker
            from worker.serializers import WorkerSerializer
            from authentication.serializers import AdminUserCommonSerializer

            # PROJECT ISOLATION: Ensure user has a project
            if not request.user.project:
                return Response({
                    'error': 'Access denied',
                    'message': 'User must be assigned to a project to access this data.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get attendance records from completed inductions in current project
            project_inductions = InductionTraining.objects.filter(
                project=request.user.project,
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
                project=request.user.project
            ).select_related('project', 'created_by')

            # Get user details
            trained_users = User.objects.filter(
                id__in=trained_user_ids,
                project=request.user.project
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
                user_serializer = AdminUserCommonSerializer(user, context={'request': request})
                user_data = user_serializer.data
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
                'workers': all_trained,  # Return all participants in workers field for compatibility
                'users': users_data,
                'all_participants': all_trained,
                'workers_count': len(workers_data),
                'users_count': len(users_data),
                'message': f'Found {len(all_trained)} trained personnel eligible for job training'
            })

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {"error": f"Failed to fetch trained personnel: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get', 'post'])
    def attendance(self, request, pk=None):
        """
        Get or submit attendance for a job training with face recognition
        Supports both workers and users who completed induction training
        """
        job_training = self.get_object()
        
        if request.method == 'GET':
            # Return existing attendance records with proper serialization
            attendances = job_training.attendances.all()
            serializer = JobTrainingAttendanceSerializer(attendances, many=True, context={'request': request})
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
        
        created_records = []
        present_participants = []
        failed_records = []
        face_recognition_results = []
        
        for record in attendance_records:
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
            
            try:
                if participant_type == 'worker':
                    # Handle worker attendance
                    worker = Worker.objects.get(id=participant_id, project=request.user.project)
                    
                    # Create or update attendance record
                    attendance, created = JobTrainingAttendance.objects.update_or_create(
                        job_training=job_training,
                        worker=worker,
                        participant_type='worker',
                        defaults={
                            'status': 'present' if face_match_result['matched'] else 'absent',
                            'attendance_photo': attendance_photo,
                            'match_score': face_match_result['confidence']
                        }
                    )
                    
                    created_records.append(attendance)
                    
                    if face_match_result['matched']:
                        present_participants.append(f"Worker: {worker.name} {worker.surname}")
                        
                elif participant_type == 'user':
                    # Handle user attendance
                    user = User.objects.get(id=participant_id, project=request.user.project)
                    
                    # Create or update attendance record for users
                    attendance, created = JobTrainingAttendance.objects.update_or_create(
                        job_training=job_training,
                        worker=None,  # No worker for users
                        participant_type='user',
                        user_id=participant_id,
                        defaults={
                            'status': 'present' if face_match_result['matched'] else 'absent',
                            'attendance_photo': attendance_photo,
                            'match_score': face_match_result['confidence'],
                            'user_name': user.get_full_name() or user.username
                        }
                    )
                    
                    created_records.append(attendance)
                    
                    if face_match_result['matched']:
                        present_participants.append(f"User: {user.get_full_name() or user.username}")
                
            except Worker.DoesNotExist:
                failed_records.append({'record': record, 'error': f'Worker with ID {participant_id} not found in project'})
                continue
            except User.DoesNotExist:
                failed_records.append({'record': record, 'error': f'User with ID {participant_id} not found in project'})
                continue
            except Exception as e:
                failed_records.append({'record': record, 'error': str(e)})
                continue
        
        # Update job training status to completed
        job_training.status = 'completed'
        if evidence_photo:
            job_training.evidence_photo = evidence_photo
        job_training.save()
        
        return Response({
            'message': 'Attendance submitted successfully with face recognition',
            'records_created': len(created_records),
            'participants_present': len(present_participants),
            'present_participants': present_participants,
            'failed_records': failed_records,
            'face_recognition_results': face_recognition_results,
            'total_submitted': len(attendance_records),
            'success_rate': f"{(len(created_records)/len(attendance_records)*100):.1f}%" if attendance_records else "0%"
        }, status=status.HTTP_201_CREATED)

    @require_permission('edit')
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    @require_permission('edit')
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)
    
    @require_permission('delete')
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)
