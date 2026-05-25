import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.db.models import Q
from django.db import transaction
from django.utils import timezone
from django.http import Http404

from .models import Training, TrainingAttendance, TrainingQRSession
from .serializers import (
    TrainingSerializer, TrainingAttendanceSerializer,
    UserTrainingSerializer, MarkAttendanceSerializer, BulkMarkAttendanceSerializer,
)
from .ownership import get_training_queryset
from authentication.models import User
from authentication.tenant_utils import get_tenant_id_for_filtering
from control_plane.models import Tenant

logger = logging.getLogger(__name__)


class TrainingViewSet(viewsets.ModelViewSet):
    """Training management for admins."""
    serializer_class = TrainingSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if getattr(self.request.user, 'role_type', 'user') == 'user':
            return UserTrainingSerializer
        return TrainingSerializer

    def _is_training_admin(self):
        user = self.request.user
        return user.user_type in ['superadmin', 'masteradmin'] or getattr(user, 'role_type', 'user') == 'admin'

    def create(self, request, *args, **kwargs):
        if not self._is_training_admin():
            return Response({'error': 'Only admins can create training'}, status=status.HTTP_403_FORBIDDEN)
        logger.info(
            'Training create request user_id=%s payload=%s',
            getattr(request.user, 'id', None),
            request.data,
        )
        try:
            return super().create(request, *args, **kwargs)
        except ValidationError as exc:
            logger.warning(
                'Training create validation failed user_id=%s errors=%s payload=%s',
                getattr(request.user, 'id', None),
                exc.detail,
                request.data,
            )
            raise
        except Exception:
            logger.exception(
                'Training create failed user_id=%s payload=%s',
                getattr(request.user, 'id', None),
                request.data,
            )
            raise

    def update(self, request, *args, **kwargs):
        if not self._is_training_admin():
            return Response({'error': 'Only admins can update training'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not self._is_training_admin():
            return Response({'error': 'Only admins can update training'}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not self._is_training_admin():
            return Response({'error': 'Only admins can delete training'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    def get_queryset(self):
        return get_training_queryset(self.request.user).order_by('-training_date', '-created_at')

    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)
        try:
            return super().get_object()
        except Http404:
            if lookup_value and Training.objects.filter(pk=lookup_value).exists():
                raise PermissionDenied('Forbidden')
            raise

    def perform_create(self, serializer):
        with transaction.atomic():
            tenant_id = get_tenant_id_for_filtering(self.request.user)
            tenant = getattr(self.request.user, 'tenant', None)
            if not tenant and tenant_id:
                tenant = Tenant.objects.filter(pk=tenant_id).first()
            company = tenant or (
                Tenant.objects.filter(pk=self.request.user.company_id).first()
                if getattr(self.request.user, 'company_id', None) else None
            )
            project = serializer.validated_data.get('project') or getattr(self.request.user, 'project', None)
            if not project:
                raise ValidationError({'project': 'A project is required to create training.'})
            user_ids = serializer.validated_data.get('assigned_user_ids') or []
            training = serializer.save(
                created_by=self.request.user,
                tenant=tenant,
                company=company,
                project=project,
                assigned_user_ids=user_ids,
            )
            # Auto-create attendance records for assigned users.
            if user_ids:
                users = User.objects.filter(id__in=user_ids, is_active=True, approval_status='approved', role_type='user')
                if project:
                    users = users.filter(project=project)
                for user in users:
                    TrainingAttendance.objects.get_or_create(
                        training=training, user=user,
                        defaults={'attendance_status': 'pending'}
                    )
            if training.training_type in Training.INDUCTION_TYPES:
                TrainingQRSession.generate_for(training, self.request.user, valid_hours=24)

    def perform_update(self, serializer):
        training = serializer.save()
        # Sync attendance records for newly assigned users
        user_ids = serializer.validated_data.get('assigned_user_ids') or []
        if user_ids:
            users = User.objects.filter(id__in=user_ids, is_active=True, approval_status='approved', role_type='user')
            if training.project:
                users = users.filter(project=training.project)
            for user in users:
                TrainingAttendance.objects.get_or_create(
                    training=training, user=user,
                    defaults={'attendance_status': 'pending'}
                )

    @action(detail=True, methods=['get'])
    def attendances(self, request, pk=None):
        training = self.get_object()
        serializer = TrainingAttendanceSerializer(training.attendances.all(), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def mark_attendance(self, request, pk=None):
        training = self.get_object()

        if request.user.role_type != 'admin' and request.user.user_type not in ['superadmin', 'masteradmin']:
            return Response({'error': 'Only admins can mark attendance'}, status=status.HTTP_403_FORBIDDEN)

        if 'attendances' in request.data:
            serializer = BulkMarkAttendanceSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            results = [
                self._mark_single(training, d, request.user)
                for d in serializer.validated_data['attendances']
            ]
            return Response({'message': f'Marked {len(results)} users', 'results': results})

        serializer = MarkAttendanceSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        return Response(self._mark_single(training, serializer.validated_data, request.user))

    def _mark_single(self, training, data, marked_by):
        try:
            user = User.objects.get(id=data['user_id'])
        except User.DoesNotExist:
            return {'user_id': data['user_id'], 'success': False, 'error': 'User not found'}

        if not _get_training_scoped_users(marked_by).filter(id=user.id).exists():
            return {'user_id': data['user_id'], 'success': False, 'error': 'User is outside your training scope'}

        att_status = data['attendance_status']
        now = timezone.now()

        attendance, _ = TrainingAttendance.objects.get_or_create(
            training=training, user=user,
            defaults={'attendance_status': att_status, 'remarks': data.get('remarks', ''),
                      'marked_by': marked_by, 'marked_at': now}
        )
        if attendance.attendance_status != att_status:
            attendance.attendance_status = att_status
            attendance.remarks = data.get('remarks', '')
            attendance.marked_by = marked_by
            attendance.marked_at = now
            if att_status in ('present', 'completed'):
                attendance.completed_at = now
            attendance.save()

        user.refresh_from_db()
        return {
            'user_id': user.id,
            'user_email': user.email,
            'success': True,
            'attendance_status': att_status,
            'user_activated': user.status == User.STATUS_ACTIVE,
            'user_status': user.status,
        }

    @action(detail=True, methods=['post'])
    def add_attendees(self, request, pk=None):
        training = self.get_object()  # get_object() uses get_queryset() — already ownership-scoped
        user_ids = request.data.get('user_ids', [])
        if not user_ids:
            return Response({'error': 'user_ids required'}, status=status.HTTP_400_BAD_REQUEST)

        # Only allow adding users that belong to this admin's scope
        scoped_user_ids = _get_training_scoped_users(request.user).filter(
            id__in=user_ids
        ).values_list('id', flat=True)
        users = User.objects.filter(id__in=scoped_user_ids)
        created = sum(
            1 for u in users
            if TrainingAttendance.objects.get_or_create(
                training=training, user=u,
                defaults={'attendance_status': 'pending'}
            )[1]
        )
        return Response({'message': f'Added {created} attendees', 'total': training.attendances.count()})


class TrainingAttendanceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TrainingAttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Reuse the same ownership-scoped training queryset so attendance
        # records never leak across admin boundaries.
        owned_training_ids = get_training_queryset(user).values_list('id', flat=True)
        if getattr(user, 'role_type', 'user') == 'admin' or user.user_type in ('superadmin', 'masteradmin'):
            return TrainingAttendance.objects.filter(
                training_id__in=owned_training_ids
            ).select_related('training', 'user', 'marked_by').distinct()
        # Regular users: only their own attendance records
        return TrainingAttendance.objects.filter(user=user).select_related('training')


def _get_training_scoped_users(admin_user):
    """Return user accounts allowed for training assignment dropdown."""
    qs = User.objects.filter(
        role_type='user',
        is_active=True,
        approval_status='approved',
    )

    if admin_user.user_type == 'superadmin':
        return qs

    if admin_user.user_type == 'masteradmin' or getattr(admin_user, 'role_type', None) == 'admin':
        return qs.filter(created_by=admin_user)

    return qs.none()


def _same_employee_scope(training, user):
    """Tenant/project guard for assigned_user_ids fallback lookups."""
    user_project_id = getattr(user, 'project_id', None)
    if user_project_id and getattr(training, 'project_id', None) == user_project_id:
        return True

    user_tenant_id = (
        getattr(user, 'tenant_id', None)
        or getattr(getattr(user, 'tenant', None), 'id', None)
        or getattr(user, 'company_id', None)
    )
    training_tenant_id = (
        getattr(training, 'tenant_id', None)
        or getattr(training, 'company_id', None)
    )
    try:
        return bool(user_tenant_id and training_tenant_id and int(user_tenant_id) == int(training_tenant_id))
    except (TypeError, ValueError):
        return False


def _get_user_induction_assignments(user):
    """
    Return induction trainings assigned to a user and repair missing pending
    attendance rows. Some admin flows persist assigned_user_ids first; the
    employee page should still show the assignment immediately.
    """
    attendance_training_ids = set(
        TrainingAttendance.objects.filter(user=user).values_list('training_id', flat=True)
    )

    user_tenant_id = (
        getattr(user, 'tenant_id', None)
        or getattr(getattr(user, 'tenant', None), 'id', None)
        or getattr(user, 'company_id', None)
    )
    candidate_filter = Q(id__in=attendance_training_ids)
    if getattr(user, 'project_id', None):
        candidate_filter |= Q(project_id=user.project_id)
    if user_tenant_id:
        candidate_filter |= Q(tenant_id=user_tenant_id) | Q(company_id=user_tenant_id)

    candidates = Training.objects.filter(
        candidate_filter,
        training_type__in=Training.INDUCTION_TYPES,
    ).select_related('project', 'tenant', 'company', 'created_by').prefetch_related(
        'attendances', 'qr_sessions',
    ).distinct()

    assigned_ids = set()
    user_id_values = {user.id, str(user.id)}

    with transaction.atomic():
        for training in candidates:
            assigned_user_ids = getattr(training, 'assigned_user_ids', None) or []
            assigned_user_values = set()
            for assigned_id in assigned_user_ids:
                assigned_user_values.add(assigned_id)
                assigned_user_values.add(str(assigned_id))
            is_attendance_assigned = training.id in attendance_training_ids
            is_explicitly_assigned = bool(user_id_values & assigned_user_values)

            if not is_attendance_assigned and not is_explicitly_assigned:
                continue
            if not is_attendance_assigned and not _same_employee_scope(training, user):
                continue

            assigned_ids.add(training.id)
            if not is_attendance_assigned:
                TrainingAttendance.objects.get_or_create(
                    training=training,
                    user=user,
                    defaults={'attendance_status': TrainingAttendance.STATUS_PENDING},
                )

    return Training.objects.filter(id__in=assigned_ids).order_by('-training_date', '-created_at')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def project_users(request):
    """
    Returns users for training assignment.
    Only users in the current admin's scope are returned.
    """
    user = request.user
    if getattr(user, 'role_type', 'user') == 'user' and user.user_type not in ['superadmin', 'masteradmin']:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    qs = _get_training_scoped_users(user)
    search_term = (request.GET.get('q') or '').strip()
    if search_term:
        qs = qs.filter(
            Q(name__icontains=search_term) |
            Q(email__icontains=search_term) |
            Q(username__icontains=search_term) |
            Q(employee_id__icontains=search_term)
        )

    data = [{
        'id': u.id,
        'email': u.email,
        'name': u.get_full_name() or u.email,
        'employee_code': u.employee_id or '',
        'department': u.department or '',
        'designation': u.designation or '',
        'profile_photo': u.profile_photo.url if u.profile_photo else None,
        'status': u.status,
    } for u in qs]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_induction_trainings(request):
    """
    User-facing endpoint: returns induction trainings assigned to this user
    scoped by tenant_id. Used by the user panel training page.
    """
    user = request.user
    if getattr(user, 'role_type', 'user') != 'user':
        return Response({'error': 'Only regular users can complete induction training'}, status=status.HTTP_403_FORBIDDEN)
    # Accept any approved user regardless of access_level — access_level may be
    # 'restricted' or 'verification_pending' when admin approves but hasn't set
    # it to 'training_only' explicitly. The training assignment is the real gate.
    if getattr(user, 'approval_status', None) != 'approved':
        return Response({'error': 'Admin approval is required before induction training access'}, status=status.HTTP_403_FORBIDDEN)
    qs = _get_user_induction_assignments(user)

    serializer = UserTrainingSerializer(qs, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attendance_status(request):
    """User-facing attendance summary for the assigned induction flow."""
    user = request.user
    assigned_training_ids = _get_user_induction_assignments(user).values_list('id', flat=True)
    attendances = TrainingAttendance.objects.filter(
        user=user,
        training_id__in=assigned_training_ids,
    ).select_related('training').order_by('-created_at')
    active = attendances.first()
    return Response({
        'employee_id': user.id,
        'employee_status': getattr(user, 'approval_status', None),
        'training_required': not getattr(user, 'induction_attended', False),
        'training_completed': getattr(user, 'induction_attended', False),
        'access_unlocked': getattr(user, 'module_access_enabled', False),
        'attendance_status': getattr(user, 'attendance_status', 'pending'),
        'assigned_trainings': attendances.count(),
        'latest_training': {
            'id': active.training.id,
            'title': active.training.title,
            'attendance_status': active.attendance_status,
            'attendance_method': active.attendance_method,
            'completed_at': active.completed_at,
        } if active else None,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_online_training(request, training_id):
    """
    User self-completes an online induction training.
    Sets attendance_status='completed' which triggers user activation via model.save().
    """
    user = request.user

    try:
        training = get_training_queryset(user).get(id=training_id, training_type__in=Training.INDUCTION_TYPES)
    except Training.DoesNotExist:
        if Training.objects.filter(id=training_id).exists():
            return Response({'error': 'You are not assigned to this training'}, status=status.HTTP_403_FORBIDDEN)
        return Response({'error': 'Training not found'}, status=status.HTTP_404_NOT_FOUND)

    if training.mode != Training.MODE_ONLINE:
        return Response({'error': 'This training requires offline attendance marking'}, status=status.HTTP_400_BAD_REQUEST)

    # Verify user is assigned
    try:
        attendance = TrainingAttendance.objects.get(training=training, user=user)
    except TrainingAttendance.DoesNotExist:
        return Response({'error': 'You are not assigned to this training'}, status=status.HTTP_403_FORBIDDEN)

    if attendance.attendance_status == TrainingAttendance.STATUS_COMPLETED:
        return Response({'message': 'Already completed', 'user_status': user.status})

    now = timezone.now()
    attendance.attendance_status = TrainingAttendance.STATUS_COMPLETED
    attendance.completed_at = now
    attendance.marked_at = now
    attendance.save()

    user.refresh_from_db()
    return Response({
        'message': 'Training completed. Full access granted.',
        'user_status': user.status,
        'module_access_enabled': user.module_access_enabled,
    })
