"""
Extended views for Admin Workforce Management
Provides centralized monitoring of employees, leave requests, and payroll
"""
from django.utils import timezone
from django.db.models import Q, Count, Sum
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from authentication.models import User
from workforce.models import (
    Employee, Attendance, UserAttendance,
    LeaveRequest, PayrollEntry, PayrollCycle
)
from .models import AdminAttendance


def _require_masteradmin_or_superadmin(user):
    ut = getattr(user, 'user_type', None)
    return ut in ('masteradmin', 'superadmin')


def _get_tenant_id(user):
    """Return UUID tenant_id for User model scoping."""
    return getattr(user, 'athens_tenant_id', None)


def _get_int_tenant_id(user):
    """Return integer tenant_id for workforce models (LeaveRequest, PayrollEntry)."""
    from system.utils import get_current_tenant
    tenant, _ = get_current_tenant(user)
    if tenant:
        return tenant.id
    return getattr(user, 'company_id', None) or getattr(user, 'id', None)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employees_under_admin(request, admin_id):
    """Get all employees managed by a specific admin."""
    if not _require_masteradmin_or_superadmin(request.user):
        return Response({'detail': 'Forbidden'}, status=403)

    try:
        admin_user = User.objects.get(pk=admin_id)
    except User.DoesNotExist:
        return Response({'detail': 'Admin not found'}, status=404)

    # Tenant scope check
    if request.user.user_type == 'masteradmin':
        tenant_id = _get_tenant_id(request.user)
        if _get_tenant_id(admin_user) != tenant_id:
            return Response({'detail': 'Forbidden'}, status=403)

    # Get employees under this admin
    # Employees are linked via project or organization
    employees = Employee.objects.filter(
        athens_tenant_id=_get_tenant_id(admin_user) or 0,
        status='active'
    )

    date_str = request.query_params.get('date', timezone.localdate().isoformat())
    try:
        from datetime import date
        filter_date = date.fromisoformat(date_str)
    except ValueError:
        filter_date = timezone.localdate()

    # Get attendance for these employees
    attendance_map = {}
    for att in Attendance.objects.filter(
        employee__in=employees,
        date=filter_date
    ).select_related('employee'):
        attendance_map[att.employee_id] = att

    results = []
    for emp in employees:
        att = attendance_map.get(emp.id)
        results.append({
            'id': emp.id,
            'employee_code': emp.employee_code,
            'full_name': emp.full_name,
            'department': emp.department.name if emp.department else '',
            'designation': emp.designation.name if emp.designation else '',
            'check_in_time': att.in_time.isoformat() if att and att.in_time else None,
            'check_out_time': att.out_time.isoformat() if att and att.out_time else None,
            'status': att.status if att else 'A',
            'total_hours': str(att.total_hours) if att else '0',
        })

    return Response(results)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_attendance_dashboard(request):
    """Dashboard for user self-service attendance (role_type='user')."""
    if not _require_masteradmin_or_superadmin(request.user):
        return Response({'detail': 'Forbidden'}, status=403)

    date_str = request.query_params.get('date', timezone.localdate().isoformat())
    try:
        from datetime import date
        filter_date = date.fromisoformat(date_str)
    except ValueError:
        filter_date = timezone.localdate()

    qs = UserAttendance.objects.filter(date=filter_date).select_related('user')

    if request.user.user_type == 'masteradmin':
        tenant_id = _get_tenant_id(request.user)
        # Filter users by tenant
        user_ids = User.objects.filter(
            athens_tenant_id=tenant_id,
            role_type='user'
        ).values_list('id', flat=True)
        qs = qs.filter(user_id__in=user_ids)

    records = []
    for ua in qs:
        u = ua.user
        records.append({
            'id': ua.id,
            'user_id': u.id,
            'user_email': u.email,
            'full_name': u.get_full_name(),
            'department': u.department or '',
            'designation': u.designation or '',
            'check_in_time': ua.check_in_time.isoformat() if ua.check_in_time else None,
            'check_out_time': ua.check_out_time.isoformat() if ua.check_out_time else None,
            'status': ua.status,
            'total_hours': '0',  # Calculate if needed
        })

    return Response({'records': records})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def leave_requests_list(request):
    """List all leave requests with approval capability."""
    if not _require_masteradmin_or_superadmin(request.user):
        return Response({'detail': 'Forbidden'}, status=403)

    qs = LeaveRequest.objects.select_related(
        'employee', 'leave_type', 'assigned_approver', 'approved_by'
    ).order_by('-created_at')

    if request.user.user_type == 'masteradmin':
        tenant_id = _get_int_tenant_id(request.user)
        if tenant_id:
            qs = qs.filter(athens_tenant_id=tenant_id)

    status_filter = request.query_params.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter)

    results = []
    for lr in qs:
        emp = lr.employee
        # Master admin can approve admin leave requests
        can_approve = (
            lr.status == 'pending' and
            request.user.user_type == 'masteradmin' and
            emp.role_type == 'admin'
        )

        results.append({
            'id': lr.id,
            'employee_id': emp.id,
            'employee_name': emp.get_full_name(),
            'employee_email': emp.email,
            'employee_role': emp.role_type,
            'leave_type_name': lr.leave_type.name,
            'start_date': lr.start_date.isoformat(),
            'end_date': lr.end_date.isoformat(),
            'days_count': lr.days_count,
            'reason': lr.reason,
            'status': lr.status,
            'approver_name': lr.approved_by.get_full_name() if lr.approved_by else None,
            'approved_at': lr.approved_at.isoformat() if lr.approved_at else None,
            'rejection_reason': lr.rejection_reason,
            'can_approve': can_approve,
        })

    return Response({'data': results})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_leave_request(request, pk):
    """Approve a leave request."""
    if not _require_masteradmin_or_superadmin(request.user):
        return Response({'detail': 'Forbidden'}, status=403)

    try:
        lr = LeaveRequest.objects.get(pk=pk)
    except LeaveRequest.DoesNotExist:
        return Response({'detail': 'Not found'}, status=404)

    if request.user.user_type == 'masteradmin':
        tenant_id = _get_int_tenant_id(request.user)
        if tenant_id and lr.athens_tenant_id != tenant_id:
            return Response({'detail': 'Forbidden'}, status=403)

    if lr.status != 'pending':
        return Response({'detail': 'Leave request already processed'}, status=400)

    lr.status = 'approved'
    lr.approved_by = request.user
    lr.approved_at = timezone.now()
    lr.save()

    return Response({'detail': 'Leave request approved'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_leave_request(request, pk):
    """Reject a leave request."""
    if not _require_masteradmin_or_superadmin(request.user):
        return Response({'detail': 'Forbidden'}, status=403)

    try:
        lr = LeaveRequest.objects.get(pk=pk)
    except LeaveRequest.DoesNotExist:
        return Response({'detail': 'Not found'}, status=404)

    if request.user.user_type == 'masteradmin':
        tenant_id = _get_int_tenant_id(request.user)
        if tenant_id and lr.athens_tenant_id != tenant_id:
            return Response({'detail': 'Forbidden'}, status=403)

    if lr.status != 'pending':
        return Response({'detail': 'Leave request already processed'}, status=400)

    lr.status = 'rejected'
    lr.approved_by = request.user
    lr.approved_at = timezone.now()
    lr.rejection_reason = request.data.get('rejection_reason', 'Rejected by Master Admin')
    lr.save()

    return Response({'detail': 'Leave request rejected'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payroll_entries_list(request):
    """List payroll entries for approval."""
    if not _require_masteradmin_or_superadmin(request.user):
        return Response({'detail': 'Forbidden'}, status=403)

    qs = PayrollEntry.objects.select_related(
        'employee', 'payroll_cycle'
    ).order_by('-created_at')

    if request.user.user_type == 'masteradmin':
        tenant_id = _get_int_tenant_id(request.user)
        if tenant_id:
            qs = qs.filter(athens_tenant_id=tenant_id)

    status_filter = request.query_params.get('payment_status')
    if status_filter:
        qs = qs.filter(payment_status=status_filter)

    results = []
    for pe in qs:
        emp = pe.employee
        results.append({
            'id': pe.id,
            'employee_id': emp.id,
            'employee_name': emp.full_name,
            'employee_code': emp.employee_code,
            'department_name': emp.department.name if emp.department else '',
            'cycle_name': pe.payroll_cycle.cycle_name,
            'gross_salary': str(pe.gross_salary),
            'total_deductions': str(pe.total_deductions),
            'net_salary': str(pe.net_salary),
            'payment_status': pe.payment_status,
            'payment_date': pe.payment_date.isoformat() if pe.payment_date else None,
            'payment_mode': pe.payment_mode,
        })

    return Response({'data': results})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_payroll_payment(request, pk):
    """Approve and mark payroll as paid."""
    if not _require_masteradmin_or_superadmin(request.user):
        return Response({'detail': 'Forbidden'}, status=403)

    try:
        pe = PayrollEntry.objects.get(pk=pk)
    except PayrollEntry.DoesNotExist:
        return Response({'detail': 'Not found'}, status=404)

    if request.user.user_type == 'masteradmin':
        tenant_id = _get_int_tenant_id(request.user)
        if tenant_id and pe.athens_tenant_id != tenant_id:
            return Response({'detail': 'Forbidden'}, status=403)

    if pe.payment_status == 'paid':
        return Response({'detail': 'Already paid'}, status=400)

    pe.payment_status = 'paid'
    pe.payment_date = timezone.localdate()
    pe.paid_at = timezone.now()
    pe.payment_mode = request.data.get('payment_mode', 'bank')
    pe.transaction_reference = request.data.get('transaction_reference', '')
    pe.save()

    return Response({'detail': 'Payment approved and marked as paid'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_approvals_summary(request):
    """Summary of all pending approvals."""
    if not _require_masteradmin_or_superadmin(request.user):
        return Response({'detail': 'Forbidden'}, status=403)

    tenant_id = _get_int_tenant_id(request.user) if request.user.user_type == 'masteradmin' else None

    # Leave requests
    leave_qs = LeaveRequest.objects.filter(status='pending')
    if tenant_id:
        leave_qs = leave_qs.filter(athens_tenant_id=tenant_id)
    pending_leaves = leave_qs.count()

    # Payroll entries
    payroll_qs = PayrollEntry.objects.filter(payment_status='processed')
    if tenant_id:
        payroll_qs = payroll_qs.filter(athens_tenant_id=tenant_id)
    pending_payroll = payroll_qs.count()

    # Attendance corrections (if any flagged for approval)
    pending_attendance = 0

    return Response({
        'pending_leaves': pending_leaves,
        'pending_payroll': pending_payroll,
        'pending_attendance': pending_attendance,
        'total_pending': pending_leaves + pending_payroll + pending_attendance,
    })
