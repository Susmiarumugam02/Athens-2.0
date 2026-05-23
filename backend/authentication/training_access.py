"""
Induction Training Access Control API
Manages mandatory training completion and module access
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_training_status(request):
    """
    Check if user has completed mandatory induction training
    Returns training status and module access permissions
    """
    user = request.user
    
    # Superadmin and MasterAdmin bypass training requirement
    if user.user_type in ['superadmin', 'masteradmin']:
        return Response({
            'training_required': False,
            'induction_completed': True,
            'induction_attended': True,
            'status': 'active',
            'module_access_enabled': True,
            'onboarding_status': 'completed',
            'training_status': 'completed',
            'access_level': 'full_access',
            'attendance_status': 'verified',
            'bypass_reason': 'Admin user - training not required'
        })
    
    # Project admins (role_type='admin') bypass training requirement
    if getattr(user, 'role_type', 'user') == 'admin':
        return Response({
            'training_required': False,
            'induction_completed': True,
            'induction_attended': True,
            'status': 'active',
            'module_access_enabled': True,
            'onboarding_status': 'completed',
            'training_status': 'completed',
            'access_level': 'full_access',
            'attendance_status': 'verified',
            'bypass_reason': 'Admin role - training not required'
        })
    
    user_status = getattr(user, 'status', 'active')
    induction_attended = getattr(user, 'induction_attended', False)
    must_change_password = getattr(user, 'must_change_password', False)
    
    return Response({
        'training_required': not induction_attended,
        'induction_completed': getattr(user, 'induction_completed', False),
        'induction_attended': induction_attended,
        'induction_completed_at': user.induction_completed_at,
        'induction_attended_at': getattr(user, 'induction_attended_at', None),
        'induction_score': user.induction_score,
        'status': user_status,
        'onboarding_status': user.onboarding_status,
        'module_access_enabled': user.module_access_enabled,
        'profile_status': getattr(user, 'profile_status', 'incomplete'),
        'workflow_approval_status': getattr(user, 'workflow_approval_status', 'pending_profile_submission'),
        'training_status': getattr(user, 'training_status', 'not_started'),
        'access_level': getattr(user, 'access_level', 'restricted'),
        'attendance_status': getattr(user, 'attendance_status', 'pending'),
        'training_progress': user.training_progress or {},
        'user_type': user.user_type,
        'role_type': getattr(user, 'role_type', None),
        'admin_type': getattr(user, 'admin_type', None),
        'must_change_password': must_change_password,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_training_complete(request):
    """
    Mark induction attendance for a user (ADMIN ONLY)
    Updates user status from 'approved_pending_induction' to 'active'
    
    Expected payload:
    {
        "user_id": 123,
        "score": 85.5,
        "remarks": "Attended offline induction on 2025-02-23"
    }
    """
    # Only admins can mark induction attendance
    if request.user.user_type not in ['superadmin', 'masteradmin'] and getattr(request.user, 'role_type', 'user') != 'admin':
        return Response({
            'error': 'Only administrators can mark induction attendance'
        }, status=status.HTTP_403_FORBIDDEN)
    
    user_id = request.data.get('user_id')
    if not user_id:
        return Response({
            'error': 'user_id is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({
            'error': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    score = request.data.get('score')
    remarks = request.data.get('remarks', '')
    
    # Validate score
    if score is not None:
        try:
            score = float(score)
            if score < 0 or score > 100:
                return Response({
                    'error': 'Score must be between 0 and 100'
                }, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({
                'error': 'Invalid score format'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    # CRITICAL: Update user status to 'active' after induction attendance
    target_user.status = 'active'
    target_user.induction_attended = True
    target_user.induction_attended_at = timezone.now()
    target_user.induction_marked_by = request.user
    target_user.induction_score = score
    target_user.onboarding_status = 'completed'
    target_user.module_access_enabled = False  # Locked until password changed
    target_user.attendance_verified = True
    target_user.modules_unlocked = False  # Locked until password changed
    target_user.access_status = 'pending_password_change'
    target_user.onboarding_completed = False  # Completed only after password change
    target_user.training_status = 'completed'
    target_user.attendance_status = 'verified'
    target_user.access_level = 'pending_password_change'  # New gate
    target_user.must_change_password = True  # Force password change
    
    # Legacy fields for backward compatibility
    target_user.induction_completed = True
    target_user.induction_completed_at = timezone.now()
    
    # Store attendance details
    training_data = target_user.training_progress or {}
    training_data['marked_by_admin_id'] = request.user.id
    training_data['marked_by_admin_email'] = request.user.email
    training_data['marked_at'] = timezone.now().isoformat()
    training_data['remarks'] = remarks
    training_data['score'] = score
    target_user.training_progress = training_data
    
    target_user.save()
    
    return Response({
        'message': 'Induction attendance marked successfully',
        'user_id': target_user.id,
        'user_email': target_user.email,
        'status': target_user.status,
        'induction_attended': True,
        'module_access_enabled': False,
        'attendance_verified': True,
        'modules_unlocked': False,
        'access_status': 'pending_password_change',
        'onboarding_completed': False,
        'onboarding_status': 'completed',
        'training_status': 'completed',
        'attendance_status': 'verified',
        'access_level': 'pending_password_change',
        'must_change_password': True,
        'attended_at': target_user.induction_attended_at,
        'score': target_user.induction_score,
        'marked_by': request.user.email,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_training_progress(request):
    """
    Update training progress without marking as complete
    Used for tracking partial completion
    
    Expected payload:
    {
        "progress": {...}
    }
    """
    user = request.user
    progress = request.data.get('progress', {})
    
    # Merge with existing progress
    current_progress = user.training_progress or {}
    current_progress.update(progress)
    
    user.training_progress = current_progress
    user.onboarding_status = 'training_in_progress'
    user.training_status = 'in_progress'
    user.save(update_fields=['training_progress', 'onboarding_status', 'training_status'])
    
    return Response({
        'message': 'Training progress updated',
        'training_progress': user.training_progress,
        'onboarding_status': user.onboarding_status,
        'training_status': user.training_status,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_accessible_modules(request):
    """
    Get list of modules accessible to the user based on training status
    """
    user = request.user
    
    # Admin users (superadmin, masteradmin, project admins) have full access
    if user.user_type in ['superadmin', 'masteradmin']:
        return Response({
            'all_modules_accessible': True,
            'restricted_modules': [],
            'accessible_modules': 'all'
        })
    
    # Project admins (role_type='admin') have full access
    if getattr(user, 'role_type', 'user') == 'admin':
        return Response({
            'all_modules_accessible': True,
            'restricted_modules': [],
            'accessible_modules': 'all',
            'bypass_reason': 'Admin role - full access'
        })
    
    # Regular users (role_type='user') must complete induction training
    user_status = getattr(user, 'status', 'active')
    induction_attended = getattr(user, 'induction_attended', False)

    if user_status == 'approved_pending_induction' and getattr(user, 'access_level', '') == 'training_only':
        return Response({
            'all_modules_accessible': False,
            'restricted_modules': [
                'dashboard', 'attendance', 'ptw', 'incident', 'safety_observation',
                'quality', 'inspection', 'financial', 'manpower',
                'mom', 'chatbox', 'ai_bot', 'leave', 'payroll',
                'followups', 'daily_planner', 'ergon', 'workforce'
            ],
            'accessible_modules': ['training', 'logout'],
            'training_required': True,
            'status': user_status,
            'access_level': 'training_only',
            'message': 'Complete assigned induction training to unlock all modules'
        })
    
    if user_status != 'active' or not induction_attended or not user.module_access_enabled:
        return Response({
            'all_modules_accessible': False,
            'restricted_modules': [
                'dashboard', 'attendance', 'ptw', 'incident', 'safety_observation',
                'quality', 'inspection', 'financial', 'manpower',
                'mom', 'chatbox', 'ai_bot', 'leave', 'payroll',
                'followups', 'daily_planner', 'ergon', 'workforce'
            ],
            'accessible_modules': ['induction_pending', 'profile', 'logout'],
            'training_required': True,
            'status': user_status,
            'access_level': getattr(user, 'access_level', 'restricted'),
            'message': 'Attend offline induction training to unlock all modules'
        })
    
    # Training completed - full access
    return Response({
        'all_modules_accessible': True,
        'restricted_modules': [],
        'accessible_modules': 'all',
        'training_completed': True
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pending_induction_users(request):
    """
    Get list of users pending induction training (admin only)
    Returns users who are approved but haven't completed induction
    """
    # Only admins can access this endpoint
    if request.user.user_type not in ['superadmin', 'masteradmin'] and getattr(request.user, 'role_type', 'user') != 'admin':
        return Response({
            'error': 'Only administrators can view pending induction users'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Get users pending induction - check both status field and legacy fields
    users = User.objects.filter(
        user_type='companyuser',
        role_type='user',
        is_active=True
    ).filter(
        models.Q(status='approved_pending_induction') |
        models.Q(approval_status='approved', induction_attended=False, status='active')  # Legacy users
    ).select_related('project', 'created_by')
    
    # Filter by project for project admins
    if request.user.user_type == 'companyuser' and getattr(request.user, 'role_type', 'user') == 'admin':
        if request.user.project:
            users = users.filter(project=request.user.project)
        elif request.user.company_id:
            users = users.filter(company_id=request.user.company_id)
    
    data = [
        {
            'id': u.id,
            'email': u.email,
            'name': u.name or u.username or u.email.split('@')[0],
            'department': u.department,
            'designation': u.designation,
            'project_name': u.project.projectName if u.project else None,
            'created_by': u.created_by.email if u.created_by else None,
            'created_at': u.created_at.isoformat(),
            'approval_status': u.approval_status,
            'onboarding_status': u.onboarding_status,
        }
        for u in users
    ]
    
    return Response({
        'count': len(data),
        'users': data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def post_induction_change_password(request):
    """
    Mandatory password change after induction training completion.
    Only callable when user has must_change_password=True.
    On success: unlocks all modules and activates account fully.

    Payload: { current_password, new_password, confirm_password }
    """
    user = request.user

    # Only regular users need this flow
    if user.user_type in ['superadmin', 'masteradmin'] or getattr(user, 'role_type', 'user') == 'admin':
        return Response({'error': 'Not applicable for admin accounts'}, status=status.HTTP_400_BAD_REQUEST)

    if not getattr(user, 'must_change_password', False):
        return Response({'error': 'Password change not required'}, status=status.HTTP_400_BAD_REQUEST)

    current_password = request.data.get('current_password', '').strip()
    new_password = request.data.get('new_password', '').strip()
    confirm_password = request.data.get('confirm_password', '').strip()

    if not all([current_password, new_password, confirm_password]):
        return Response({'error': 'All password fields are required'}, status=status.HTTP_400_BAD_REQUEST)

    if not user.check_password(current_password):
        return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)

    if new_password != confirm_password:
        return Response({'error': 'New passwords do not match'}, status=status.HTTP_400_BAD_REQUEST)

    if new_password == current_password:
        return Response({'error': 'New password must be different from the temporary password'}, status=status.HTTP_400_BAD_REQUEST)

    # Enforce password rules
    import re
    if len(new_password) < 8:
        return Response({'error': 'Password must be at least 8 characters'}, status=status.HTTP_400_BAD_REQUEST)
    if not re.search(r'[A-Z]', new_password):
        return Response({'error': 'Password must contain at least one uppercase letter'}, status=status.HTTP_400_BAD_REQUEST)
    if not re.search(r'[a-z]', new_password):
        return Response({'error': 'Password must contain at least one lowercase letter'}, status=status.HTTP_400_BAD_REQUEST)
    if not re.search(r'\d', new_password):
        return Response({'error': 'Password must contain at least one number'}, status=status.HTTP_400_BAD_REQUEST)
    if not re.search(r'[@$!%*?&#^()_\-+=]', new_password):
        return Response({'error': 'Password must contain at least one special character'}, status=status.HTTP_400_BAD_REQUEST)

    # Set new password and fully activate account
    user.set_password(new_password)
    user.must_change_password = False
    user.is_autogenerated_password = False
    user.is_temporary_password = False
    user.password_changed = True
    user.is_password_reset_required = False
    user.password_changed_at = timezone.now()
    user.module_access_enabled = True
    user.modules_unlocked = True
    user.access_status = 'active'
    user.onboarding_completed = True
    user.access_level = 'full_access'
    user.save()

    # Audit log
    from authentication.models import SecurityLog
    SecurityLog.objects.create(
        event_type=SecurityLog.EventType.PASSWORD_CHANGE,
        severity=SecurityLog.Severity.INFO,
        user=user,
        metadata={
            'event': 'post_induction_password_change',
            'user_id': user.id,
            'ip': request.META.get('REMOTE_ADDR'),
        }
    )

    return Response({
        'message': 'Password updated successfully. Your account is now fully activated.',
        'must_change_password': False,
        'is_temporary_password': False,
        'is_autogenerated_password': False,
        'password_changed': True,
        'password_changed_at': user.password_changed_at,
        'module_access_enabled': True,
        'access_level': 'full_access',
        'onboarding_completed': True,
    })
