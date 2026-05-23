"""
Admin Attendance views — Master Admin monitoring dashboard.

ROOT CAUSE FIX:
  Admins clock in via workforce.UserAttendance, NOT admin_attendance.AdminAttendance.
  This module now reads UserAttendance as the single source of truth.
  AdminAttendance is kept for manual corrections only.
"""
from django.utils import timezone
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from authentication.models import User
from workforce.models import UserAttendance
from .models import AdminAttendance
from .serializers import (
    AdminAttendanceSerializer,
    ManualAttendanceSerializer,
    AttendanceCorrectionSerializer,
    ForceCheckoutSerializer,
)

# Only subordinate project-level admin roles — excludes masteradmin, owner, superadmin
SUBORDINATE_ADMIN_ROLES = ('client', 'epc', 'contractor', 'project_admin')

ROLE_LABELS = {
    'client': 'Client Admin',
    'epc': 'EPC Admin',
    'contractor': 'Contractor Admin',
    'project_admin': 'Project Admin',
}


def _is_masteradmin_or_superadmin(user):
    return getattr(user, 'user_type', None) in ('masteradmin', 'superadmin')


def _tenant_uuid(user):
    """Return the UUID tenant_id for the user (may be None for superadmin)."""
    return getattr(user, 'athens_tenant_id', None)


def _admin_users_qs(requesting_user):
    """
    Return queryset of subordinate project admins only.
    Excludes masteradmin, owner, superadmin.
    """
    qs = User.objects.filter(
        admin_type__in=SUBORDINATE_ADMIN_ROLES,
        is_active=True,
    )
    if requesting_user.user_type == 'masteradmin':
        tenant_id = _tenant_uuid(requesting_user)
        if tenant_id:
            qs = qs.filter(athens_tenant_id=tenant_id)
    return qs


def _user_attendance_qs(requesting_user, target_date):
    """
    Return UserAttendance queryset for all admins on target_date,
    scoped to the requesting user's tenant.
    """
    admin_ids = _admin_users_qs(requesting_user).values_list('id', flat=True)
    qs = UserAttendance.objects.filter(
        user_id__in=admin_ids,
        date=target_date,
    ).select_related('user')
    return qs


def _ua_to_status(ua):
    """Map UserAttendance status to AdminAttendance-compatible status string."""
    s = getattr(ua, 'status', 'absent') or 'absent'
    # UserAttendance statuses: present, late, half_day, absent
    # Add 'working' (checked in, not checked out) and 'checked_out'
    if ua.check_in_time and not ua.check_out_time:
        return 'late' if s == 'late' else 'working'
    if ua.check_in_time and ua.check_out_time:
        return 'checked_out'
    return 'absent'


def _ua_to_record_dict(ua):
    """Serialize a UserAttendance record into the AdminAttendanceRecord shape."""
    u = ua.user
    name_parts = [getattr(u, 'name', '') or '', getattr(u, 'surname', '') or '']
    full_name = ' '.join(p for p in name_parts if p).strip() or u.email.split('@')[0]
    project = getattr(u, 'project', None)

    check_in = ua.check_in_time.isoformat() if ua.check_in_time else None
    check_out = ua.check_out_time.isoformat() if ua.check_out_time else None

    # Calculate total hours
    total_hours = '0'
    if ua.check_in_time and ua.check_out_time:
        from datetime import datetime, date
        d = date.today()
        dt_in = datetime.combine(d, ua.check_in_time)
        dt_out = datetime.combine(d, ua.check_out_time)
        diff = (dt_out - dt_in).total_seconds() / 3600
        total_hours = f'{max(0, diff):.2f}'

    raw_role = getattr(u, 'admin_type', None) or ''
    normalized_role = ROLE_LABELS.get(raw_role, raw_role)

    return {
        'id': ua.id,
        'admin': u.id,
        'admin_email': u.email,
        'admin_name': full_name,
        'admin_role': normalized_role,
        'organization': getattr(u, 'company_name', '') or '',
        'project_name': getattr(project, 'projectName', '') if project else '',
        'attendance_date': ua.date.isoformat(),
        'check_in_time': check_in,
        'check_out_time': check_out,
        'total_hours': total_hours,
        'status': _ua_to_status(ua),
        'check_in_location': (
            {'lat': ua.latitude, 'lng': ua.longitude}
            if ua.latitude is not None else None
        ),
        'check_out_location': None,
        'is_manual': False,
        'correction_note': '',
        'corrected_by': None,
        'corrected_at': None,
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attendance_dashboard(request):
    """KPI summary for admin attendance — reads from UserAttendance."""
    if not _is_masteradmin_or_superadmin(request.user):
        return Response({'detail': 'Forbidden'}, status=403)

    date_str = request.query_params.get('date')
    if date_str:
        try:
            from datetime import date
            target_date = date.fromisoformat(date_str)
        except ValueError:
            target_date = timezone.localdate()
    else:
        target_date = timezone.localdate()

    total_admins = _admin_users_qs(request.user).count()
    ua_qs = _user_attendance_qs(request.user, target_date)

    present = late = half_day = working = checked_out = 0
    for ua in ua_qs:
        s = _ua_to_status(ua)
        if s == 'working':
            working += 1
        elif s == 'checked_out':
            checked_out += 1
        elif s == 'late':
            late += 1
        elif s == 'half_day':
            half_day += 1
        elif s == 'present':
            present += 1

    marked = working + checked_out + late + half_day + present
    absent = max(0, total_admins - marked)

    return Response({
        'date': target_date.isoformat(),
        'total_admins': total_admins,
        'present': present,
        'absent': absent,
        'late': late,
        'half_day': half_day,
        'working': working,
        'checked_out': checked_out,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attendance_list(request):
    """List admin attendance records — reads from UserAttendance."""
    if not _is_masteradmin_or_superadmin(request.user):
        return Response({'detail': 'Forbidden'}, status=403)

    date_str = request.query_params.get('date', timezone.localdate().isoformat())
    try:
        from datetime import date
        filter_date = date.fromisoformat(date_str)
    except ValueError:
        filter_date = timezone.localdate()

    ua_qs = _user_attendance_qs(request.user, filter_date)

    # Also include admins with NO attendance record (absent)
    admin_qs = _admin_users_qs(request.user)

    # Apply filters
    status_filter = request.query_params.get('status', '').strip()
    admin_type_filter = request.query_params.get('admin_type', '').strip()
    search = request.query_params.get('search', '').strip()

    if admin_type_filter:
        admin_qs = admin_qs.filter(
            Q(admin_type=admin_type_filter) | Q(user_type=admin_type_filter)
        )

    if search:
        admin_qs = admin_qs.filter(
            Q(email__icontains=search) |
            Q(name__icontains=search) |
            Q(surname__icontains=search) |
            Q(company_name__icontains=search)
        )

    # Build attendance map: user_id → UserAttendance
    ua_map = {ua.user_id: ua for ua in ua_qs}

    records = []
    for admin in admin_qs.select_related('project'):
        ua = ua_map.get(admin.id)
        if ua:
            rec = _ua_to_record_dict(ua)
        else:
            # Absent — no record
            name_parts = [getattr(admin, 'name', '') or '', getattr(admin, 'surname', '') or '']
            full_name = ' '.join(p for p in name_parts if p).strip() or admin.email.split('@')[0]
            project = getattr(admin, 'project', None)
            raw_role = getattr(admin, 'admin_type', None) or ''
            rec = {
                'id': None,
                'admin': admin.id,
                'admin_email': admin.email,
                'admin_name': full_name,
                'admin_role': ROLE_LABELS.get(raw_role, raw_role),
                'organization': getattr(admin, 'company_name', '') or '',
                'project_name': getattr(project, 'projectName', '') if project else '',
                'attendance_date': filter_date.isoformat(),
                'check_in_time': None,
                'check_out_time': None,
                'total_hours': '0',
                'status': 'absent',
                'check_in_location': None,
                'check_out_location': None,
                'is_manual': False,
                'correction_note': '',
                'corrected_by': None,
                'corrected_at': None,
            }

        # Apply status filter after building record
        if status_filter and rec['status'] != status_filter:
            continue

        records.append(rec)

    return Response(records)


# ─── Manual correction endpoints (write to AdminAttendance for audit trail) ───

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_manual_attendance(request):
    """Mark or update attendance manually."""
    if not _is_masteradmin_or_superadmin(request.user):
        return Response({'detail': 'Forbidden'}, status=403)

    ser = ManualAttendanceSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=400)

    data = ser.validated_data
    try:
        admin_user = User.objects.get(pk=data['admin_id'])
    except User.DoesNotExist:
        return Response({'detail': 'Admin user not found'}, status=404)

    if request.user.user_type == 'masteradmin':
        tenant_id = _tenant_uuid(request.user)
        if _tenant_uuid(admin_user) != tenant_id:
            return Response({'detail': 'Forbidden'}, status=403)

    # Write to UserAttendance (the real attendance table)
    from workforce.models import UserAttendance as UA
    today = data['attendance_date']
    ua, _ = UA.objects.get_or_create(
        user=admin_user,
        date=today,
        defaults={'status': 'present'},
    )
    if 'check_in_time' in data and data['check_in_time']:
        # Extract time from datetime
        ci = data['check_in_time']
        ua.check_in_time = ci.time() if hasattr(ci, 'time') else ci
    if 'check_out_time' in data and data['check_out_time']:
        co = data['check_out_time']
        ua.check_out_time = co.time() if hasattr(co, 'time') else co
    if 'status' in data:
        ua.status = data['status']
    ua.save()

    return Response(_ua_to_record_dict(ua), status=201)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def correct_attendance(request, pk):
    """Correct an existing attendance record (by UserAttendance id)."""
    if not _is_masteradmin_or_superadmin(request.user):
        return Response({'detail': 'Forbidden'}, status=403)

    from workforce.models import UserAttendance as UA
    try:
        ua = UA.objects.select_related('user').get(pk=pk)
    except UA.DoesNotExist:
        return Response({'detail': 'Not found'}, status=404)

    if request.user.user_type == 'masteradmin':
        tenant_id = _tenant_uuid(request.user)
        if _tenant_uuid(ua.user) != tenant_id:
            return Response({'detail': 'Forbidden'}, status=403)

    ser = AttendanceCorrectionSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=400)

    data = ser.validated_data
    if 'check_in_time' in data and data['check_in_time']:
        ci = data['check_in_time']
        ua.check_in_time = ci.time() if hasattr(ci, 'time') else ci
    if 'check_out_time' in data and data['check_out_time']:
        co = data['check_out_time']
        ua.check_out_time = co.time() if hasattr(co, 'time') else co
    if 'status' in data:
        ua.status = data['status']
    ua.save()

    return Response(_ua_to_record_dict(ua))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def force_checkout(request, pk):
    """Force checkout an admin (by UserAttendance id)."""
    if not _is_masteradmin_or_superadmin(request.user):
        return Response({'detail': 'Forbidden'}, status=403)

    from workforce.models import UserAttendance as UA
    try:
        ua = UA.objects.select_related('user').get(pk=pk)
    except UA.DoesNotExist:
        return Response({'detail': 'Not found'}, status=404)

    if request.user.user_type == 'masteradmin':
        tenant_id = _tenant_uuid(request.user)
        if _tenant_uuid(ua.user) != tenant_id:
            return Response({'detail': 'Forbidden'}, status=403)

    ser = ForceCheckoutSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=400)

    ua.check_out_time = timezone.localtime().time()
    ua.save()

    return Response(_ua_to_record_dict(ua))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_attendance(request):
    """Export attendance as CSV."""
    if not _is_masteradmin_or_superadmin(request.user):
        return Response({'detail': 'Forbidden'}, status=403)

    import csv
    from django.http import HttpResponse
    from datetime import date

    date_from_str = request.query_params.get('date_from', timezone.localdate().isoformat())
    date_to_str = request.query_params.get('date_to', timezone.localdate().isoformat())

    try:
        date_from = date.fromisoformat(date_from_str)
        date_to = date.fromisoformat(date_to_str)
    except ValueError:
        date_from = date_to = timezone.localdate()

    admin_ids = _admin_users_qs(request.user).values_list('id', flat=True)
    qs = UserAttendance.objects.filter(
        user_id__in=admin_ids,
        date__gte=date_from,
        date__lte=date_to,
    ).select_related('user', 'user__project').order_by('date', 'user__email')

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = (
        f'attachment; filename="admin_attendance_{date_from_str}_{date_to_str}.csv"'
    )

    writer = csv.writer(response)
    writer.writerow([
        'Date', 'Admin Email', 'Admin Name', 'Role', 'Organization', 'Project',
        'Check In', 'Check Out', 'Total Hours', 'Status',
    ])

    for ua in qs:
        rec = _ua_to_record_dict(ua)
        writer.writerow([
            rec['attendance_date'],
            rec['admin_email'],
            rec['admin_name'],
            rec['admin_role'],
            rec['organization'],
            rec['project_name'],
            rec['check_in_time'] or '',
            rec['check_out_time'] or '',
            rec['total_hours'],
            rec['status'],
        ])

    return response
