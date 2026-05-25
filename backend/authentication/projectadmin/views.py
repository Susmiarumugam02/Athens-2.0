from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import parser_classes
from authentication.models import User, UserType, SecurityLog
from authentication.permissions import IsCompanyUser
from django.utils import timezone
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.db import models
import random, string
import re


class IsProjectAdmin(IsCompanyUser):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and bool(getattr(request.user, 'admin_type', None))


def _gen_password(length=12):
    return ''.join(random.choices(string.ascii_letters + string.digits + '!@#$%', k=length))


def _normalize_phone(value):
    if not value:
        return ''
    clean = re.sub(r'[^0-9]', '', str(value))
    if clean.startswith('0091') and len(clean) == 14:
        clean = clean[4:]
    elif clean.startswith('91') and len(clean) == 12:
        clean = clean[2:]
    elif clean.startswith('0') and len(clean) == 11:
        clean = clean[1:]
    return clean if re.fullmatch(r'[6-9]\d{9}', clean) else ''


def _is_valid_phone(value):
    return bool(_normalize_phone(value))


def _workflow_state(u):
    access_level = getattr(u, 'access_level', '')
    if not access_level:
        if u.status == 'active' and u.module_access_enabled:
            access_level = 'full_access'
        elif u.status == 'approved_pending_induction':
            access_level = 'training_only'
        elif u.status == 'pending_approval':
            access_level = 'verification_pending'
        else:
            access_level = 'restricted'
    return {
        'profile_status': getattr(u, 'profile_status', 'submitted' if u.profile_completed else 'incomplete'),
        'workflow_approval_status': getattr(u, 'workflow_approval_status', 'approved' if u.approval_status == 'approved' else 'waiting_admin_approval'),
        'training_status': getattr(u, 'training_status', 'completed' if u.induction_attended else 'pending_induction' if u.status == 'approved_pending_induction' else 'not_started'),
        'access_level': access_level,
        'attendance_status': getattr(u, 'attendance_status', 'verified' if u.induction_attended else 'pending'),
    }


def _user_dict(u):
    if u.induction_attended:
        induction_status = 'completed'
    elif u.status == 'approved_pending_induction':
        induction_status = 'pending'
    else:
        induction_status = 'not_assigned'

    extra = u.training_progress or {}
    state = _workflow_state(u)
    return {
        'id': u.id,
        'username': u.username,
        'email': u.email,
        'name': u.name or '',
        'surname': u.surname or '',
        'department': u.department or '',
        'designation': u.designation or '',
        'phone_number': u.phone_number or '',
        'employee_id': u.employee_id or '',
        'emergency_contact': u.emergency_contact or '',
        'blood_group': u.blood_group or '',
        'address': u.address or '',
        'safety_experience': u.safety_experience or '',
        'skills': u.skills or '',
        'language_preference': u.language_preference or 'en',
        # Extended fields from training_progress JSON
        'dob': extra.get('dob', ''),
        'gender': extra.get('gender', ''),
        'marital_status': extra.get('marital_status', ''),
        'nationality': extra.get('nationality', ''),
        'alternate_phone': extra.get('alternate_phone', ''),
        'emergency_relation': extra.get('emergency_relation', ''),
        'reporting_manager': extra.get('reporting_manager', ''),
        'joining_date': extra.get('joining_date', ''),
        'work_location': extra.get('work_location', ''),
        'employment_type': extra.get('employment_type', ''),
        'aadhaar_number': extra.get('aadhaar_number', ''),
        'pan_number': extra.get('pan_number', ''),
        'passport_number': extra.get('passport_number', ''),
        'years_experience': extra.get('years_experience', ''),
        'safety_certifications': extra.get('safety_certifications', ''),
        'ppe_experience': extra.get('ppe_experience', ''),
        'equipment_experience': extra.get('equipment_experience', ''),
        'high_risk_experience': extra.get('high_risk_experience', ''),
        'allergies': extra.get('allergies', ''),
        'medical_conditions': extra.get('medical_conditions', ''),
        'fitness_declaration': extra.get('fitness_declaration', ''),
        'known_languages': extra.get('known_languages', ''),
        'read_write_capability': extra.get('read_write_capability', ''),
        # Workflow state
        'company_type': u.company_type,
        'approval_status': u.approval_status,
        'status': u.status,
        'induction_status': induction_status,
        'profile_completed': u.profile_completed,
        'profile_submitted_at': u.profile_submitted_at.isoformat() if u.profile_submitted_at else None,
        'approved_at': u.approved_at.isoformat() if u.approved_at else None,
        'approved_by': u.approved_by.email if u.approved_by else None,
        'induction_attended': u.induction_attended,
        'induction_attended_at': u.induction_attended_at.isoformat() if u.induction_attended_at else None,
        'module_access_enabled': u.module_access_enabled,
        'attendance_verified': getattr(u, 'attendance_verified', u.attendance_status == 'verified'),
        'modules_unlocked': getattr(u, 'modules_unlocked', u.module_access_enabled),
        'access_status': getattr(u, 'access_status', 'active' if u.module_access_enabled else 'restricted'),
        'onboarding_completed': getattr(u, 'onboarding_completed', u.onboarding_status == 'completed'),
        'is_first_login': u.is_first_login,
        'is_active': u.is_active,
        'created_at': u.created_at.isoformat(),
        'profile_photo': u.profile_photo.url if u.profile_photo else None,
        'id_document': u.id_document.url if u.id_document else None,
        # Password status — never expose the hash, only the flags
        'is_temporary_password': getattr(u, 'is_temporary_password', False),
        'password_changed': getattr(u, 'password_changed', False),
        'must_change_password': getattr(u, 'must_change_password', False),
        'is_autogenerated_password': getattr(u, 'is_autogenerated_password', False),
        **state,
    }


# ── User Management ──────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsProjectAdmin])
def users_list_create(request):
    admin = request.user
    if request.method == 'GET':
        qs = User.objects.filter(created_by=admin, role_type='user').order_by('-created_at')
        return Response([_user_dict(u) for u in qs])

    d = request.data

    # Accept both legacy 'username' and new minimal-fields flow
    full_name = (d.get('full_name') or d.get('name') or '').strip()
    employee_code = (d.get('employee_code') or '').strip()
    mobile = (d.get('mobile') or d.get('phone_number') or '').strip()
    email = (d.get('email') or '').strip()
    department = (d.get('department') or '').strip()
    designation = (d.get('designation') or '').strip()
    role = (d.get('role') or 'user').strip()
    temp_password = (d.get('temp_password') or '').strip()

    # Legacy support
    username = (d.get('username') or employee_code or '').strip()
    required = {
        'employee_code': employee_code,
        'full_name': full_name,
        'mobile': mobile,
        'email': email,
        'department': department,
        'designation': designation,
        'role': role,
        'temp_password': temp_password,
    }
    missing = [label for label, value in required.items() if not value]
    if missing:
        return Response({'error': f"Missing required fields: {', '.join(missing)}"}, status=400)

    try:
        validate_email(email)
    except ValidationError:
        return Response({'error': 'Enter a valid email address'}, status=400)

    mobile_clean = _normalize_phone(mobile)
    if not mobile_clean:
        return Response({'error': 'Enter a valid 10-digit mobile number'}, status=400)

    if not username:
        username = email.split('@')[0]

    # Uniqueness checks
    if User.objects.filter(username=username).exists():
        return Response({'error': 'Username already exists'}, status=400)
    if User.objects.filter(email=email).exists():
        return Response({'error': 'Email already exists'}, status=400)
    if employee_code and User.objects.filter(
        employee_id=employee_code,
        company_id=admin.company_id,
    ).exists():
        return Response({'error': 'Employee code already exists in this company'}, status=400)

    password = temp_password if temp_password else _gen_password()
    user = User.objects.create(
        username=username,
        email=email,
        name=full_name,
        phone_number=mobile_clean,
        department=department,
        designation=designation,
        employee_id=employee_code,
        user_type=UserType.COMPANYUSER,
        role_type='user',
        company_type=admin.admin_type,
        admin_type=None,
        project=admin.project,
        tenant=admin.tenant,
        company_id=admin.company_id,
        athens_tenant_id=admin.athens_tenant_id,
        created_by=admin,
        approval_status='pending',
        status='pending_profile',
        is_first_login=True,
        profile_completed=False,
        is_autogenerated_password=not bool(temp_password),
        is_temporary_password=True,
        password_changed=False,
        must_change_password=True,
        profile_status='incomplete',
        workflow_approval_status='pending_profile_submission',
        training_status='not_started',
        access_level='restricted',
        attendance_status='pending',
        module_access_enabled=False,
        is_active=True,
    )
    user.set_password(password)
    user.save()
    SecurityLog.objects.create(
        event_type=SecurityLog.EventType.MASTER_CREATED,
        severity=SecurityLog.Severity.INFO,
        user=admin,
        metadata={'event': 'projectadmin.create_user', 'created_user_id': user.id}
    )
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'password': password,
        'employee_code': employee_code,
        'full_name': full_name,
        'mobile': mobile,
        'department': department,
        'designation': designation,
        'company_type': user.company_type,
        'approval_status': user.approval_status,
        'status': user.status,
        'profile_status': user.profile_status,
        'workflow_approval_status': user.workflow_approval_status,
        'training_status': user.training_status,
        'access_level': user.access_level,
        'message': 'Restricted user account created. Send the returned temporary credentials via the configured email/SMS channel.',
    }, status=201)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsProjectAdmin])
def user_delete(request, user_id):
    try:
        User.objects.get(id=user_id, created_by=request.user, role_type='user').delete()
        return Response(status=204)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsProjectAdmin])
def user_reset_password(request, user_id):
    try:
        user = User.objects.get(id=user_id, created_by=request.user, role_type='user')
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    password = _gen_password()
    user.set_password(password)
    user.is_autogenerated_password = True
    user.is_temporary_password = True
    user.password_changed = False
    user.must_change_password = True
    user.is_password_reset_required = True
    user.save(update_fields=[
        'password', 'is_autogenerated_password', 'is_temporary_password',
        'password_changed', 'must_change_password', 'is_password_reset_required',
    ])
    SecurityLog.objects.create(
        event_type=SecurityLog.EventType.PASSWORD_CHANGE,
        severity=SecurityLog.Severity.INFO,
        user=request.user,
        metadata={'event': 'admin_reset_password', 'target_user_id': user.id, 'ip': request.META.get('REMOTE_ADDR')}
    )
    # Return password ONCE — never stored in plain text after this response
    return Response({
        'message': 'Password reset. Share this temporary password with the user once.',
        'temporary_password': password,
        'must_change_password': True,
    })


# ── Approval Workflow ─────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsProjectAdmin])
def pending_approvals(request):
    """Users awaiting approval — includes both profile-submitted and legacy users."""
    qs = User.objects.filter(
        created_by=request.user,
        role_type='user',
        approval_status='waiting_admin_approval',
        status='pending_approval',
        profile_completed=True,
    ).order_by('-created_at')
    return Response([_user_dict(u) for u in qs])


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsProjectAdmin])
def all_users_status(request):
    """Dashboard counts by workflow stage."""
    admin = request.user
    base = User.objects.filter(created_by=admin, role_type='user')
    return Response({
        'total': base.count(),
        'pending_profile': base.filter(status='pending_profile').count(),
        'pending_approval': base.filter(approval_status='waiting_admin_approval', status='pending_approval').count(),
        'approved_pending_induction': base.filter(status='approved_pending_induction').count(),
        'active': base.filter(status='active').count(),
        'rejected': base.filter(approval_status='rejected').count(),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsProjectAdmin])
def approve_user(request, user_id):
    try:
        user = User.objects.get(id=user_id, created_by=request.user, role_type='user')
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    if not user.profile_completed or user.status != 'pending_approval' or user.approval_status != 'waiting_admin_approval':
        return Response({'error': 'User profile must be submitted before approval.'}, status=400)

    user.approval_status = 'approved'
    user.approved_by = request.user
    user.approved_at = timezone.now()
    user.is_active = True
    user.status = 'approved_pending_induction'
    user.module_access_enabled = False
    user.profile_status = 'verified'
    user.workflow_approval_status = 'approved'
    user.training_status = 'pending_induction'
    user.access_level = 'training_only'
    user.attendance_status = 'pending'
    user.onboarding_status = 'pending_training'
    user.save(update_fields=[
        'approval_status', 'approved_by', 'approved_at', 'status', 'is_active',
        'module_access_enabled', 'profile_status', 'workflow_approval_status',
        'training_status', 'access_level', 'attendance_status', 'onboarding_status',
    ])
    return Response({
        'message': 'User approved. Induction training required before module access.',
        'approval_status': 'approved',
        'status': 'approved_pending_induction',
        'training_status': 'pending_induction',
        'access_level': 'training_only',
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsProjectAdmin])
def reject_user(request, user_id):
    try:
        user = User.objects.get(id=user_id, created_by=request.user, role_type='user')
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    reason = request.data.get('reason', '')
    user.approval_status = 'rejected'
    user.workflow_approval_status = 'rejected'
    user.access_level = 'restricted'
    user.rejected_at = timezone.now()
    user.is_active = False
    user.save(update_fields=['approval_status', 'workflow_approval_status', 'access_level', 'rejected_at', 'is_active'])
    return Response({'message': 'User rejected.', 'approval_status': 'rejected', 'reason': reason})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsProjectAdmin])
def request_corrections(request, user_id):
    try:
        user = User.objects.get(id=user_id, created_by=request.user, role_type='user')
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    reason = (request.data.get('reason') or '').strip()
    extra = user.training_progress or {}
    extra['correction_requested_at'] = timezone.now().isoformat()
    extra['correction_reason'] = reason
    user.training_progress = extra
    user.profile_status = 'correction_requested'
    user.workflow_approval_status = 'correction_requested'
    user.status = 'pending_profile'
    user.profile_completed = False
    user.is_first_login = True
    user.access_level = 'restricted'
    user.save(update_fields=[
        'training_progress', 'profile_status', 'workflow_approval_status',
        'status', 'profile_completed', 'is_first_login', 'access_level',
    ])
    return Response({'message': 'Corrections requested.', 'status': user.status, 'reason': reason})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsProjectAdmin])
def mark_induction_attendance(request, user_id):
    """Admin marks induction attendance → activates user."""
    try:
        user = User.objects.get(id=user_id, created_by=request.user, role_type='user')
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    if user.status not in ('approved_pending_induction', 'active'):
        return Response({'error': f'User cannot be inducted at this stage (status: {user.status})'}, status=400)

    user.induction_attended = True
    user.induction_attended_at = timezone.now()
    user.induction_marked_by = request.user
    user.induction_completed = True
    user.induction_completed_at = timezone.now()
    user.status = 'active'
    # Gate: if user still has a temporary password, force change before granting module access
    has_temp_password = getattr(user, 'is_temporary_password', False) or getattr(user, 'is_autogenerated_password', False)
    user.module_access_enabled = not has_temp_password
    user.attendance_verified = True
    user.modules_unlocked = not has_temp_password
    user.access_status = 'pending_password_change' if has_temp_password else 'active'
    user.onboarding_completed = not has_temp_password
    user.onboarding_status = 'completed'
    user.training_status = 'completed'
    user.attendance_status = 'verified'
    user.access_level = 'pending_password_change' if has_temp_password else 'full_access'
    user.must_change_password = has_temp_password
    user.save(update_fields=[
        'induction_attended', 'induction_attended_at', 'induction_marked_by',
        'induction_completed', 'induction_completed_at',
        'status', 'module_access_enabled', 'attendance_verified',
        'modules_unlocked', 'access_status', 'onboarding_completed', 'onboarding_status',
        'training_status', 'attendance_status', 'access_level', 'must_change_password',
    ])
    return Response({
        'message': 'Induction attendance marked. User is now fully active.' if not has_temp_password else 'Induction attendance marked. User must change password before accessing modules.',
        'status': 'active',
        'module_access_enabled': not has_temp_password,
        'attendance_verified': True,
        'modules_unlocked': not has_temp_password,
        'access_status': 'pending_password_change' if has_temp_password else 'active',
        'onboarding_completed': not has_temp_password,
        'onboarding_status': 'completed',
        'induction_status': 'completed',
        'training_status': 'completed',
        'attendance_status': 'verified',
        'access_level': 'pending_password_change' if has_temp_password else 'full_access',
        'must_change_password': has_temp_password,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsProjectAdmin])
def suspend_user(request, user_id):
    try:
        user = User.objects.get(id=user_id, created_by=request.user, role_type='user')
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)
    user.is_active = False
    user.save(update_fields=['is_active'])
    return Response({'message': 'User suspended.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsProjectAdmin])
def activate_user(request, user_id):
    try:
        user = User.objects.get(id=user_id, created_by=request.user, role_type='user')
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)
    user.is_active = True
    user.save(update_fields=['is_active'])
    return Response({'message': 'User activated.'})


# ── Profile Completion (regular user first login) ─────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_profile(request):
    """Return current user's profile data for pre-filling the verification form."""
    u = request.user
    return Response({
        'name': u.name or '',
        'surname': u.surname or '',
        'phone_number': u.phone_number or '',
        'department': u.department or '',
        'designation': u.designation or '',
        'employee_id': u.employee_id or '',
        'emergency_contact': u.emergency_contact or '',
        'blood_group': u.blood_group or '',
        'address': u.address or '',
        'safety_experience': u.safety_experience or '',
        'skills': u.skills or '',
        'language_preference': u.language_preference or 'en',
        'email': u.email,
        'profile_completed': u.profile_completed,
        'profile_submitted_at': u.profile_submitted_at.isoformat() if u.profile_submitted_at else None,
        'status': u.status,
        'approval_status': u.approval_status,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def complete_profile(request):
    """User submits full profile verification form."""
    user = request.user
    if user.role_type != 'user':
        return Response({'error': 'Only regular users can complete profile'}, status=403)
    # Allow resubmission only if corrections were requested; otherwise lock
    if user.profile_completed and user.status == 'pending_approval' and user.profile_status not in ('correction_requested', 'draft'):
        return Response({'error': 'Profile already submitted and is awaiting admin approval.'}, status=400)

    d = request.data

    save_as_draft = str(d.get('draft', '')).lower() in ('1', 'true', 'yes')

    # Required fields
    name = (d.get('name') or '').strip()
    phone = (d.get('phone') or d.get('phone_number') or '').strip()
    department = (d.get('department') or '').strip()
    designation = (d.get('designation') or '').strip()
    personal_email = (d.get('personal_email') or d.get('email') or '').strip()
    employee_id = (d.get('employee_id') or '').strip()
    pan_number = (d.get('pan_number') or '').strip()

    required_fields = {
        'full name': name,
        'mobile number': phone,
        'department': department,
        'designation': designation,
        'employee ID': employee_id,
        'date of birth': (d.get('dob') or '').strip(),
        'gender': (d.get('gender') or '').strip(),
        'blood group': (d.get('blood_group') or '').strip(),
        'nationality': (d.get('nationality') or '').strip(),
        'marital status': (d.get('marital_status') or '').strip(),
        'address': (d.get('address') or '').strip(),
        'emergency contact name': (d.get('emergency_contact_name') or '').strip(),
        'emergency contact number': (d.get('emergency_contact') or '').strip(),
        'joining date': (d.get('joining_date') or '').strip(),
        'work location': (d.get('work_location') or '').strip(),
        'aadhaar number': (d.get('aadhaar_number') or '').strip(),
        'PAN number': pan_number,
        'experience': (d.get('years_experience') or d.get('safety_experience') or '').strip(),
        'PPE knowledge': (d.get('ppe_experience') or '').strip(),
        'equipment knowledge': (d.get('equipment_experience') or '').strip(),
        'risk work experience': (d.get('high_risk_experience') or '').strip(),
        'fitness declaration': (d.get('fitness_declaration') or '').strip(),
    }
    if not save_as_draft:
        missing = [label for label, value in required_fields.items() if not value]
        existing_extra = user.training_progress or {}
        required_uploads = {
            'employee photo': request.FILES.get('employee_photo') or request.FILES.get('profile_photo') or user.profile_photo,
            'aadhaar upload': request.FILES.get('id_document') or user.id_document,
            'PAN upload': request.FILES.get('pan_document') or existing_extra.get('pan_document_name') or existing_extra.get('pan_number'),
        }
        missing.extend([label for label, value in required_uploads.items() if not value])
        if missing:
            return Response({'error': f"Missing required fields: {', '.join(missing[:6])}"}, status=400)
    phone_clean = _normalize_phone(phone)
    if phone and not phone_clean:
        return Response({'error': 'Enter a valid mobile number.'}, status=400)
    emergency_contact = (d.get('emergency_contact') or '').strip()
    emergency_contact_clean = _normalize_phone(emergency_contact)
    if emergency_contact and not emergency_contact_clean:
        return Response({'error': 'Emergency Contact Number is invalid.'}, status=400)
    if personal_email:
        try:
            validate_email(personal_email)
        except ValidationError:
            return Response({'error': 'Enter a valid personal email address.'}, status=400)
    aadhaar = (d.get('aadhaar_number') or '').replace(' ', '').strip()
    if aadhaar and not re.fullmatch(r'\d{12}', aadhaar):
        return Response({'error': 'Aadhaar Number must be 12 digits.'}, status=400)
    if pan_number and not re.fullmatch(r'[A-Z]{5}[0-9]{4}[A-Z]', pan_number.upper()):
        return Response({'error': 'PAN Number is invalid.'}, status=400)
    if employee_id and User.objects.filter(
        company_id=user.company_id,
        employee_id=employee_id,
    ).exclude(id=user.id).exists():
        return Response({'error': 'Employee ID already registered in this company.'}, status=400)

    # Aadhaar duplicate check (across same company)
    if aadhaar:
        existing = User.objects.filter(
            company_id=user.company_id,
        ).exclude(id=user.id)
        for u in existing:
            if (u.training_progress or {}).get('aadhaar_number') == aadhaar:
                return Response({'error': 'Aadhaar number already registered in this company.'}, status=400)

    # Section 1 — Personal
    user.name = name
    user.surname = (d.get('surname') or '').strip()
    user.blood_group = (d.get('blood_group') or '').strip()

    # Section 2 — Contact
    user.phone_number = phone_clean
    user.emergency_contact = emergency_contact_clean
    user.address = (d.get('address') or '').strip()

    # Section 3 — Employment
    user.department = department
    user.designation = designation
    user.employee_id = employee_id

    # Section 5 — Safety & Training
    user.safety_experience = (d.get('safety_experience') or '').strip()
    user.skills = (d.get('skills') or '').strip()

    # Section 7 — Language
    user.language_preference = (d.get('language_preference') or 'en').strip()

    # Extended fields stored in training_progress JSON (no new migration needed)
    extra = user.training_progress or {}
    for key in [
        'dob', 'gender', 'marital_status', 'nationality',
        'alternate_phone', 'personal_email', 'emergency_contact_name', 'emergency_relation',
        'reporting_manager', 'joining_date', 'work_location', 'employment_type',
        'aadhaar_number', 'pan_number', 'passport_number',
        'safety_certifications', 'ppe_experience', 'equipment_experience',
        'high_risk_experience', 'years_experience',
        'allergies', 'medical_conditions', 'fitness_declaration',
        'known_languages', 'read_write_capability',
    ]:
        val = (d.get(key) or '').strip()
        if val:
            extra[key] = val
    user.training_progress = extra

    # File uploads
    if 'profile_photo' in request.FILES:
        user.profile_photo = request.FILES['profile_photo']
    if 'employee_photo' in request.FILES:
        user.profile_photo = request.FILES['employee_photo']
        extra['employee_photo_name'] = request.FILES['employee_photo'].name
    if 'id_document' in request.FILES:
        user.id_document = request.FILES['id_document']
    if 'pan_document' in request.FILES:
        extra['pan_document_name'] = request.FILES['pan_document'].name
    if 'passport_photo' in request.FILES:
        extra['passport_photo_name'] = request.FILES['passport_photo'].name

    if save_as_draft:
        user.profile_status = 'draft'
        user.workflow_approval_status = 'pending_profile_submission'
        user.access_level = 'restricted'
        user.save()
        return Response({
            'message': 'Draft saved.',
            'profile_status': user.profile_status,
            'status': user.status,
        })

    user.is_first_login = False
    user.profile_completed = True
    user.profile_submitted_at = timezone.now()
    user.status = 'pending_approval'
    user.approval_status = 'waiting_admin_approval'
    user.profile_status = 'submitted'
    user.workflow_approval_status = 'waiting_admin_approval'
    user.access_level = 'restricted'
    user.training_status = 'not_started'
    user.module_access_enabled = False
    user.save()

    return Response({
        'message': 'Profile verification submitted. Waiting for admin approval.',
        'approval_status': user.approval_status,
        'status': user.status,
        'profile_completed': True,
        'profile_status': user.profile_status,
        'workflow_approval_status': user.workflow_approval_status,
        'training_status': user.training_status,
        'access_level': user.access_level,
        'submitted_at': user.profile_submitted_at.isoformat(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_status(request):
    u = request.user
    return Response({
        'role_type': u.role_type,
        'approval_status': u.approval_status,
        'status': u.status,
        'is_first_login': u.is_first_login,
        'profile_completed': u.profile_completed,
        'company_type': u.company_type,
        'admin_type': u.admin_type,
        'induction_attended': u.induction_attended,
        'module_access_enabled': u.module_access_enabled,
        **_workflow_state(u),
    })
