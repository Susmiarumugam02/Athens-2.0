from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from django.db import models
from system.utils import get_current_tenant
from system.api_response import ok, fail
from .models import *
from .serializers import *
from .permissions import WorkforceServiceEnabled, IsWorkforceAdmin, _is_any_admin
from decimal import Decimal
import re, secrets, string


def _gen_password(length=12):
    chars = string.ascii_letters + string.digits + '!@#$%'
    return ''.join(secrets.choice(chars) for _ in range(length))


def _gen_username(full_name, email, employee_code):
    prefix_source = full_name or (email.split('@')[0] if email else '') or 'employee'
    prefix = re.sub(r'[^a-z0-9]+', '_', prefix_source.lower()).strip('_') or 'employee'
    prefix = prefix.split('_')[0] or prefix
    code = re.sub(r'[^a-zA-Z0-9]+', '', employee_code or '')[-6:]
    suffix = code or f"{secrets.randbelow(900) + 100}"
    base = f"{prefix}_{suffix}"
    username = base[:140]

    from authentication.models import User
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base[:134]}_{counter}"
        counter += 1
    return username


def _user_tenant_id(user):
    tenant, _ = get_current_tenant(user)
    if tenant:
        return tenant.id
    return getattr(user, 'company_id', None)


def _employee_create_error(code, message, http_status=status.HTTP_400_BAD_REQUEST, details=None):
    payload = {
        'code': code,
        'error': message,
        'message': message,
    }
    if details is not None:
        payload['details'] = details
    return Response(payload, status=http_status)


def _tenant_id(user):
    """
    Resolve a stable integer scope-ID for ANY user type — never crashes.
    Priority: tenant FK → company_id → legacy tenant id → project tenant → user.id.

    Project IDs are not tenant IDs. Falling back to project.id caused unrelated
    tenant records to share a scope when tenant resolution failed.
    """
    tenant, _ = get_current_tenant(user)
    if tenant:
        return tenant.id
    company_id = getattr(user, 'company_id', None)
    if company_id:
        return company_id
    legacy_tenant_id = getattr(user, 'athens_tenant_id', None)
    if legacy_tenant_id:
        try:
            return int(legacy_tenant_id)
        except (TypeError, ValueError):
            pass
    project = getattr(user, 'project', None)
    project_tenant_id = getattr(project, 'athens_tenant_id', None) if project else None
    if project_tenant_id:
        try:
            return int(project_tenant_id)
        except (TypeError, ValueError):
            pass
    return user.id


def _resolve_tid(user):
    """Shorthand: always returns an int, never None."""
    return _tenant_id(user)


def _attendance_scope_metadata(user):
    project = getattr(user, 'project', None)
    organization_id = getattr(user, 'company_id', None) or _resolve_tid(user)
    return {
        'admin_user': user if getattr(user, 'is_authenticated', False) else None,
        'project_id': getattr(project, 'id', None),
        'organization_id': organization_id,
    }


def _parse_hhmm(value, fallback=None):
    from datetime import time as dtime
    if not value:
        return fallback
    try:
        parts = str(value).split(':')
        return dtime(int(parts[0]), int(parts[1]), int(parts[2]) if len(parts) > 2 else 0)
    except Exception:
        return fallback


def _calculate_hours(in_time, out_time):
    if not in_time or not out_time:
        return Decimal('0')
    minutes = (out_time.hour * 60 + out_time.minute) - (in_time.hour * 60 + in_time.minute)
    if minutes <= 0:
        return Decimal('0')
    return (Decimal(minutes) / Decimal(60)).quantize(Decimal('0.01'))


def _employee_display_status(attendance, target_date):
    from datetime import time as dtime
    if not attendance or not attendance.in_time:
        if target_date < timezone.localdate():
            return 'absent'
        return 'absent' if timezone.localtime().time() > dtime(9, 0) else 'not_marked'
    if attendance.out_time:
        if attendance.total_hours and attendance.total_hours < Decimal('4'):
            return 'half_day'
        return 'checked_out'
    if attendance.in_time > dtime(9, 0):
        return 'late'
    return 'present'


def _late_status(attendance):
    from datetime import time as dtime
    return bool(attendance and attendance.in_time and attendance.in_time > dtime(9, 0))


def _find_employee_for_user(user):
    tenant_id = _resolve_tid(user)
    qs = Employee.objects.filter(athens_tenant_id=tenant_id).exclude(status='inactive')
    username = getattr(user, 'username', '') or ''
    if '_' in username:
        employee_code = username.rsplit('_', 1)[-1]
        match = qs.filter(employee_code__iexact=employee_code).first()
        if match:
            return match
    full_name = user.get_full_name() if hasattr(user, 'get_full_name') else getattr(user, 'name', '')
    if full_name:
        match = qs.filter(full_name__iexact=full_name).first()
        if match:
            return match
    return qs.filter(full_name__iexact=getattr(user, 'name', '') or '').first()


def _sync_user_attendance_to_employee_attendance(user, user_attendance):
    """
    Sync UserAttendance → Attendance (employee-linked table).
    Silently skips if no matching Employee record exists — the dashboard
    will still show the user via the UserAttendance source.
    """
    employee = _find_employee_for_user(user)
    if not employee:
        print(f"[SYNC] No Employee record found for user={user.id} ({user.email}) — UserAttendance will be shown directly in dashboard")
        return None
    total_hours = _calculate_hours(user_attendance.check_in_time, user_attendance.check_out_time)
    record, created = Attendance.objects.update_or_create(
        employee=employee,
        date=user_attendance.date,
        defaults={
            'athens_tenant_id': employee.athens_tenant_id,
            'in_time': user_attendance.check_in_time,
            'out_time': user_attendance.check_out_time,
            'total_hours': total_hours,
            'status': 'P' if user_attendance.check_in_time else 'A',
            'latitude': user_attendance.latitude,
            'longitude': user_attendance.longitude,
            'project_id': getattr(getattr(user, 'project', None), 'id', None),
            'organization_id': getattr(user, 'company_id', None) or employee.athens_tenant_id,
        }
    )
    print(f"[SYNC] Attendance {'created' if created else 'updated'} for employee={employee.id} user={user.id} date={user_attendance.date}")
    return record


def _get_role_isolated_employees(user):
    """
    Get employees filtered by role-based isolation.
    Same logic as EmployeeViewSet.get_queryset() but as a reusable function.
    """
    tenant, _ = get_current_tenant(user)
    tenant_id = tenant.id if tenant else _tenant_id(user)

    qs = Employee.objects.filter(
        athens_tenant_id=tenant_id
    ).exclude(status='inactive').select_related('department', 'designation')

    user_type = getattr(user, 'user_type', '')
    admin_type = getattr(user, 'admin_type', None)
    project = getattr(user, 'project', None)

    if user_type == 'superadmin':
        print(f"[ATTENDANCE ISOLATION] SuperAdmin user={user.id} sees ALL employees count={qs.count()}")
        return qs

    if user_type == 'masteradmin':
        print(f"[ATTENDANCE ISOLATION] MasterAdmin user={user.id} tenant={tenant_id} count={qs.count()}")
        return qs

    if admin_type in ('client', 'epc', 'contractor'):
        # Project admins are separate company/admin scopes inside the tenant.
        # Sharing by admin_type + project leaks data between peer admins.
        qs = qs.filter(created_by_admin=user)
        print(f"[ATTENDANCE ISOLATION] {admin_type.upper()} Admin user={user.id} project={project} employee_count={qs.count()}")
        return qs

    # role_type='admin' with no admin_type (created by MasterAdmin): own records only.
    if getattr(user, 'role_type', None) == 'admin':
        company_id = getattr(user, 'company_id', None)
        qs = qs.filter(created_by_admin=user)
        print(f"[ATTENDANCE ISOLATION] Generic Admin user={user.id} company={company_id} project={project} count={qs.count()}")
        return qs

    print(f"[ATTENDANCE ISOLATION] Regular user={user.id} - NO ACCESS")
    return qs.none()


def _get_scoped_users_for_admin(admin_user):
    """
    Return a queryset of User accounts that were created by this admin
    (or belong to the same org scope). Used to find UserAttendance records
    for users who may not have a linked Employee record.
    """
    from authentication.models import CustomUser
    user_type = getattr(admin_user, 'user_type', '')
    admin_type = getattr(admin_user, 'admin_type', None)
    project = getattr(admin_user, 'project', None)
    company_id = getattr(admin_user, 'company_id', None)
    tenant, _ = get_current_tenant(admin_user)
    tenant_id = tenant.id if tenant else _tenant_id(admin_user)

    print(f"[SCOPED USERS] admin={admin_user.id} role={admin_user.user_type} admin_type={admin_type} project={project} company_id={company_id} tenant_id={tenant_id}")

    base = CustomUser.objects.filter(is_active=True, role_type='user')

    if user_type == 'superadmin':
        return base

    if user_type == 'masteradmin':
        if tenant:
            return base.filter(
                models.Q(tenant=tenant) | models.Q(company_id=company_id)
            )
        return base.filter(company_id=company_id) if company_id else base.none()

    if admin_type in ('client', 'epc', 'contractor'):
        scoped = base.filter(created_by=admin_user)
        print(f"[SCOPED USERS] {admin_type.upper()} Admin user={admin_user.id} scoped_user_count={scoped.count()}")
        return scoped

    # Generic admin (role_type='admin')
    if getattr(admin_user, 'role_type', None) == 'admin':
        return base.filter(created_by=admin_user)

    return base.none()

# MODULE 1: EMPLOYEE & WORKFORCE MANAGEMENT

class DepartmentViewSet(viewsets.ModelViewSet):
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated, WorkforceServiceEnabled, IsWorkforceAdmin]
    

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return ok(data=serializer.data, request=request)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return ok(data=serializer.data, request=request)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return ok(data=serializer.data, request=request, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return ok(data=serializer.data, request=request)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return ok(data=None, request=request, status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        return Department.objects.filter(athens_tenant_id=_resolve_tid(self.request.user))

    def perform_create(self, serializer):
        serializer.save(athens_tenant_id=_resolve_tid(self.request.user))

class DesignationViewSet(viewsets.ModelViewSet):
    serializer_class = DesignationSerializer
    permission_classes = [IsAuthenticated, WorkforceServiceEnabled, IsWorkforceAdmin]
    

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return ok(data=serializer.data, request=request)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return ok(data=serializer.data, request=request)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return ok(data=serializer.data, request=request, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return ok(data=serializer.data, request=request)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return ok(data=None, request=request, status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        return Designation.objects.filter(athens_tenant_id=_resolve_tid(self.request.user))

    def perform_create(self, serializer):
        serializer.save(athens_tenant_id=_resolve_tid(self.request.user))

class EmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated, WorkforceServiceEnabled, IsWorkforceAdmin]

    def get_queryset(self):
        user = self.request.user

        # CRITICAL: Role-based isolation
        user_type = getattr(user, 'user_type', '')
        admin_type = getattr(user, 'admin_type', None)
        project = getattr(user, 'project', None)

        # SuperAdmin: sees ALL employees
        if user_type == 'superadmin':
            qs = Employee.objects.exclude(status='inactive').select_related('department', 'designation')
            print(f"[EMPLOYEE ISOLATION] SuperAdmin user={user.id} sees ALL employees count={qs.count()}")
            return qs

        tenant, _ = get_current_tenant(user)
        tenant_id = tenant.id if tenant else _tenant_id(user)

        # Base tenant-scoped queryset
        qs = Employee.objects.filter(
            athens_tenant_id=tenant_id
        ).exclude(status='inactive').select_related('department', 'designation')

        # MasterAdmin: sees ALL employees in their tenant
        if user_type == 'masteradmin':
            print(f"[EMPLOYEE ISOLATION] MasterAdmin user={user.id} tenant={tenant_id} count={qs.count()}")
            return qs
        
        # Project Admins (Client/EPC/Contractor): ONLY see employees created by their organization AND project
        if admin_type in ('client', 'epc', 'contractor'):
            qs = qs.filter(created_by_admin=user)
            
            print(f"[EMPLOYEE ISOLATION] {admin_type.upper()} Admin user={user.id} project={project} count={qs.count()}")
            return qs

        if getattr(user, 'role_type', None) == 'admin':
            qs = qs.filter(created_by_admin=user)
            print(f"[EMPLOYEE ISOLATION] Generic Admin user={user.id} project={project} count={qs.count()}")
            return qs
        
        # Regular users: no access to employee list
        print(f"[EMPLOYEE ISOLATION] Regular user={user.id} - NO ACCESS")
        return qs.none()

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.filter_queryset(self.get_queryset()), many=True)
        return ok(data=serializer.data, request=request)

    def retrieve(self, request, *args, **kwargs):
        return ok(data=self.get_serializer(self.get_object()).data, request=request)

    def create(self, request, *args, **kwargs):
        """
        Atomically create Employee + User login account.
        Accepts extra fields: email, password (optional).
        Returns employee data + login credentials.
        """
        from authentication.models import User, UserType, SecurityLog
        import logging
        import traceback

        logger = logging.getLogger(__name__)

        admin = request.user
        tenant, _ = get_current_tenant(admin)
        admin_type = getattr(admin, 'admin_type', None)  # Get admin type

        # Resolve tenant_id for scoping — works for all admin types
        tenant_id = tenant.id if tenant else _tenant_id(admin)
        logger.info(
            'Employee create requested admin_id=%s tenant_id=%s admin_type=%s payload_keys=%s',
            getattr(admin, 'id', None),
            tenant_id,
            admin_type,
            sorted(request.data.keys()),
        )

        email = (request.data.get('email') or '').strip()
        if not email:
            return _employee_create_error('EMAIL_REQUIRED', 'Email is required to create login credentials.')

        existing_user = User.objects.filter(email__iexact=email).first()
        if existing_user:
            existing_tenant_id = _user_tenant_id(existing_user)
            if existing_tenant_id != tenant_id:
                return _employee_create_error('EMAIL_EXISTS_OTHER_TENANT', 'This email is already registered outside your organization.')
            if getattr(existing_user, 'role_type', None) != 'user':
                return _employee_create_error('EMAIL_RESERVED', 'This email belongs to an administrator account.')
            if Employee.objects.filter(user=existing_user).exists():
                return _employee_create_error('EMAIL_ALREADY_LINKED', 'This user account is already linked to an employee.')

        emp_code = (request.data.get('employee_code') or '').replace(' ', '')
        if emp_code and Employee.objects.filter(athens_tenant_id=tenant_id, employee_code=emp_code).exists():
            return _employee_create_error('CODE_EXISTS', 'Employee code already exists in your organization.')

        username = getattr(existing_user, 'username', None) or _gen_username(
            request.data.get('full_name', ''),
            email,
            emp_code,
        )
        plain_password = None if existing_user else (request.data.get('password') or _gen_password())

        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(
                'Employee create validation failed admin_id=%s tenant_id=%s errors=%s',
                getattr(admin, 'id', None),
                tenant_id,
                serializer.errors,
            )
            return _employee_create_error(
                'VALIDATION_FAILED',
                'Employee validation failed.',
                details=serializer.errors,
            )

        try:
            with transaction.atomic():
                if existing_user:
                    user = existing_user
                    user.name = user.name or request.data.get('full_name', '')
                    user.username = user.username or username
                    user.company_type = user.company_type or getattr(admin, 'admin_type', None)
                    user.project = user.project or getattr(admin, 'project', None)
                    user.tenant = user.tenant or tenant
                    user.company_id = user.company_id or tenant_id
                    user.created_by = user.created_by or admin
                    user.employee_id = user.employee_id or emp_code
                    user.phone_number = user.phone_number or request.data.get('contact_number', '')
                    user.save(update_fields=[
                        'name', 'username', 'company_type', 'project', 'tenant',
                        'company_id', 'created_by', 'employee_id', 'phone_number'
                    ])
                    account_created = False
                else:
                    user = User(
                        email=email,
                        username=username,
                        name=request.data.get('full_name', ''),
                        user_type=UserType.COMPANYUSER,
                        role_type='user',
                        company_type=getattr(admin, 'admin_type', None),
                        admin_type=None,
                        project=getattr(admin, 'project', None),
                        tenant=tenant,
                        company_id=tenant_id,
                        athens_tenant_id=getattr(admin, 'athens_tenant_id', None),
                        created_by=admin,
                        employee_id=emp_code,
                        phone_number=request.data.get('contact_number', ''),
                        approval_status='pending',
                        status=User.STATUS_PENDING_PROFILE,
                        onboarding_status='pending_training',
                        profile_status='incomplete',
                        workflow_approval_status='pending_profile_submission',
                        training_status='pending_induction',
                        access_level='training_only',
                        access_status='restricted',
                        attendance_status='pending',
                        module_access_enabled=False,
                        modules_unlocked=False,
                        is_first_login=True,
                        is_autogenerated_password=not bool(request.data.get('password')),
                        is_temporary_password=True,
                        password_changed=False,
                        must_change_password=True,
                        is_password_reset_required=True,
                        is_active=True,
                    )
                    user.set_password(plain_password)
                    user.save()
                    account_created = True

                # 1. Create employee record with creator tracking
                employee = serializer.save(
                    athens_tenant_id=tenant_id,
                    user=user,
                    created_by_admin=admin,
                    created_by_admin_type=admin_type or 'unknown',
                    organization_type=admin_type or 'unknown',
                )
                if not user.employee_id:
                    user.employee_id = employee.employee_code
                    user.save(update_fields=['employee_id'])

                SecurityLog.objects.create(
                    event_type=SecurityLog.EventType.MASTER_CREATED,
                    severity=SecurityLog.Severity.INFO,
                    user=admin,
                    metadata={
                        'event': 'workforce.create_employee_with_login',
                        'employee_id': employee.id,
                        'user_id': user.id,
                        'account_created': account_created,
                    }
                )
        except Exception as e:
            logger.exception(
                'Employee create failed admin_id=%s tenant_id=%s email=%s employee_code=%s',
                getattr(admin, 'id', None),
                tenant_id,
                email,
                emp_code,
            )
            msg = str(e)
            if 'unique' in msg.lower() or 'duplicate' in msg.lower():
                if 'employee_code' in msg.lower():
                    msg = 'Employee code already exists in your organization.'
                elif 'email' in msg.lower():
                    msg = 'An employee with this email already exists in your organization.'
                else:
                    msg = 'An employee with this code already exists in your organization.'
            details = traceback.format_exc() if settings.DEBUG else None
            return _employee_create_error(
                'CREATE_FAILED',
                msg or 'Employee account could not be created.',
                http_status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                details=details,
            )

        return Response({
            'data': self.get_serializer(employee).data,
            'login': {
                'user_id': user.id,
                'email': user.email,
                'username': user.username,
                'password': plain_password,
                'account_created': account_created,
                'role_type': 'user',
                'approval_status': user.approval_status,
                'onboarding_status': user.onboarding_status,
                'training_status': user.training_status,
                'is_first_login': user.is_first_login,
            }
        }, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return ok(data=serializer.data, request=request)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.status = 'inactive'
        instance.save()
        return ok(data={'detail': 'Employee marked as inactive'}, request=request)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def participants(self, request):
        """
        Lightweight endpoint for MOM participants dropdown.
        Returns User accounts (not Employee records) so that IDs are valid
        for the MOM participants M2M field which links to AUTH_USER_MODEL.
        Scoped to the current tenant/project.
        """
        from authentication.models import CustomUser
        tenant, _ = get_current_tenant(request.user)
        tenant_id = tenant.id if tenant else _tenant_id(request.user)

        # Build queryset of User accounts in this tenant/project scope
        user_qs = CustomUser.objects.filter(is_active=True).exclude(id=request.user.id)

        # Scope by role. Peer project admins must not see each other's users.
        user_type = getattr(request.user, 'user_type', '')
        admin_type = getattr(request.user, 'admin_type', None)
        user_project = getattr(request.user, 'project', None)
        company_id = getattr(request.user, 'company_id', None)
        if user_type == 'superadmin':
            pass
        elif user_type == 'masteradmin':
            user_qs = user_qs.filter(company_id=tenant_id)
        elif admin_type in ('client', 'epc', 'contractor') or getattr(request.user, 'role_type', None) == 'admin':
            user_qs = user_qs.filter(created_by=request.user)
        elif company_id:
            user_qs = user_qs.filter(company_id=company_id)
        else:
            user_qs = user_qs.none()

        # Also cross-reference with Employee records to get employee_code
        employee_codes = {}
        try:
            emp_qs = Employee.objects.filter(
                athens_tenant_id=tenant_id
            ).exclude(status='inactive').values('id', 'full_name', 'employee_code')
            # Map by full_name for loose matching
            for e in emp_qs:
                employee_codes[str(e['full_name']).strip().lower()] = e['employee_code']
        except Exception:
            pass

        data = []
        for u in user_qs.values('id', 'name', 'username', 'email', 'department'):
            display_name = (u['name'] or u['username'] or u['email'] or '').strip()
            emp_code = employee_codes.get(display_name.lower()) or str(u['id']).zfill(2)
            data.append({
                'id': u['id'],           # ← User.id — correct for MOM M2M
                'full_name': display_name,
                'employee_code': emp_code,
                'department': u['department'] or '',
            })

        print(f"[MOM PARTICIPANTS] user={request.user.id} project={user_project} count={len(data)}")
        return Response(data)

# MODULE 2: ATTENDANCE & WORK HOURS MANAGEMENT

class ShiftScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftScheduleSerializer
    permission_classes = [IsAuthenticated, WorkforceServiceEnabled, IsWorkforceAdmin]
    

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return ok(data=serializer.data, request=request)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return ok(data=serializer.data, request=request)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return ok(data=serializer.data, request=request, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return ok(data=serializer.data, request=request)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return ok(data=None, request=request, status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        return ShiftSchedule.objects.filter(athens_tenant_id=_resolve_tid(self.request.user))

    def perform_create(self, serializer):
        serializer.save(athens_tenant_id=_resolve_tid(self.request.user))

class HolidayViewSet(viewsets.ModelViewSet):
    serializer_class = HolidaySerializer
    permission_classes = [IsAuthenticated, WorkforceServiceEnabled, IsWorkforceAdmin]
    

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return ok(data=serializer.data, request=request)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return ok(data=serializer.data, request=request)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return ok(data=serializer.data, request=request, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return ok(data=serializer.data, request=request)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return ok(data=None, request=request, status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        return Holiday.objects.filter(athens_tenant_id=_resolve_tid(self.request.user))

    def perform_create(self, serializer):
        serializer.save(athens_tenant_id=_resolve_tid(self.request.user))

class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated, WorkforceServiceEnabled]
    

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return ok(data=serializer.data, request=request)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return ok(data=serializer.data, request=request)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return ok(data=serializer.data, request=request, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return ok(data=serializer.data, request=request)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return ok(data=None, request=request, status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        return Attendance.objects.filter(athens_tenant_id=_resolve_tid(self.request.user)).select_related('employee', 'shift')

    def perform_create(self, serializer):
        serializer.save(athens_tenant_id=_resolve_tid(self.request.user))

# MODULE 3: PAYROLL & WAGE MANAGEMENT

class PayrollCycleViewSet(viewsets.ModelViewSet):
    serializer_class = PayrollCycleSerializer
    permission_classes = [IsAuthenticated, WorkforceServiceEnabled, IsWorkforceAdmin]

    def get_queryset(self):
        return PayrollCycle.objects.filter(athens_tenant_id=_resolve_tid(self.request.user))

    def perform_create(self, serializer):
        serializer.save(athens_tenant_id=_resolve_tid(self.request.user))

    def list(self, request, *args, **kwargs):
        return ok(data=self.get_serializer(self.filter_queryset(self.get_queryset()), many=True).data, request=request)

    def retrieve(self, request, *args, **kwargs):
        return ok(data=self.get_serializer(self.get_object()).data, request=request)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return ok(data=serializer.data, request=request, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return ok(data=serializer.data, request=request)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != 'draft':
            return fail('INVALID_STATUS', 'Only draft cycles can be deleted.',
                        status=status.HTTP_400_BAD_REQUEST, request=request)
        self.perform_destroy(instance)
        return ok(data=None, request=request, status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """Process payroll cycle — calculate salaries for all active employees."""
        cycle = self.get_object()
        tid = _resolve_tid(request.user)
        try:
            from .services import PayrollService
            result = PayrollService.process_payroll_cycle(cycle, tid)
            # Mark all entries as 'processed'
            cycle.payrollentry_set.update(payment_status='processed')
            return ok(data=result, request=request)
        except ValueError as e:
            return fail('VALIDATION_ERROR', str(e), status=status.HTTP_400_BAD_REQUEST, request=request)
        except Exception as e:
            return fail('PROCESSING_FAILED', f'Payroll processing failed: {str(e)}',
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR, request=request)

    @action(detail=True, methods=['post'])
    def lock(self, request, pk=None):
        """Lock a processed cycle — no further changes allowed."""
        cycle = self.get_object()
        if cycle.status != 'processed':
            return fail('INVALID_STATUS', 'Only processed cycles can be locked.',
                        status=status.HTTP_400_BAD_REQUEST, request=request)
        cycle.status = 'locked'
        cycle.save(update_fields=['status'])
        return ok(data={'detail': 'Payroll cycle locked.'}, request=request)

    @action(detail=True, methods=['get'])
    def entries(self, request, pk=None):
        """List all payroll entries for this cycle."""
        cycle = self.get_object()
        qs = cycle.payrollentry_set.select_related(
            'employee', 'employee__department', 'employee__designation'
        ).order_by('employee__full_name')
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                models.Q(employee__full_name__icontains=search) |
                models.Q(employee__employee_code__icontains=search)
            )
        ps = request.query_params.get('payment_status')
        if ps:
            qs = qs.filter(payment_status=ps)
        return ok(data=PayrollEntrySerializer(qs, many=True).data, request=request)

    @action(detail=True, methods=['post'], url_path='pay-all')
    def pay_all(self, request, pk=None):
        """Mark all processed entries in this cycle as paid."""
        cycle = self.get_object()
        if cycle.status not in ('processed', 'locked'):
            return fail('INVALID_STATUS', 'Cycle must be processed before payment.',
                        status=status.HTTP_400_BAD_REQUEST, request=request)
        payment_mode = request.data.get('payment_mode', 'bank')
        now = timezone.now()
        updated = cycle.payrollentry_set.filter(payment_status='processed').update(
            payment_status='paid',
            paid_at=now,
            payment_date=now.date(),
            payment_mode=payment_mode,
        )
        return ok(data={'paid_count': updated, 'detail': f'{updated} entries marked as paid.'}, request=request)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Dashboard summary for the current tenant."""
        tid = _resolve_tid(request.user)
        from django.db.models import Sum, Count
        cycles = PayrollCycle.objects.filter(athens_tenant_id=tid)
        entries = PayrollEntry.objects.filter(athens_tenant_id=tid)
        data = {
            'total_cycles': cycles.count(),
            'draft_cycles': cycles.filter(status='draft').count(),
            'processed_cycles': cycles.filter(status='processed').count(),
            'locked_cycles': cycles.filter(status='locked').count(),
            'total_entries': entries.count(),
            'pending_entries': entries.filter(payment_status='pending').count(),
            'processed_entries': entries.filter(payment_status='processed').count(),
            'paid_entries': entries.filter(payment_status='paid').count(),
            'total_net_paid': float(entries.filter(payment_status='paid').aggregate(t=Sum('net_salary'))['t'] or 0),
            'total_net_pending': float(entries.filter(payment_status__in=['pending', 'processed']).aggregate(t=Sum('net_salary'))['t'] or 0),
        }
        return ok(data=data, request=request)

class PayrollEntryViewSet(viewsets.ModelViewSet):
    serializer_class = PayrollEntrySerializer
    permission_classes = [IsAuthenticated, WorkforceServiceEnabled]

    def get_queryset(self):
        tid = _resolve_tid(self.request.user)
        qs = PayrollEntry.objects.filter(athens_tenant_id=tid).select_related(
            'employee', 'employee__department', 'employee__designation', 'payroll_cycle'
        )
        cycle_id = self.request.query_params.get('cycle')
        if cycle_id:
            qs = qs.filter(payroll_cycle_id=cycle_id)
        ps = self.request.query_params.get('payment_status')
        if ps:
            qs = qs.filter(payment_status=ps)
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                models.Q(employee__full_name__icontains=search) |
                models.Q(employee__employee_code__icontains=search)
            )
        return qs.order_by('-payroll_cycle__period_from', 'employee__full_name')

    def list(self, request, *args, **kwargs):
        return ok(data=self.get_serializer(self.filter_queryset(self.get_queryset()), many=True).data, request=request)

    def retrieve(self, request, *args, **kwargs):
        return ok(data=self.get_serializer(self.get_object()).data, request=request)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(athens_tenant_id=_resolve_tid(request.user))
        return ok(data=serializer.data, request=request, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        if instance.payment_status == 'paid':
            return fail('INVALID_STATUS', 'Paid entries cannot be modified.',
                        status=status.HTTP_400_BAD_REQUEST, request=request)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return ok(data=serializer.data, request=request)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.payment_status == 'paid':
            return fail('INVALID_STATUS', 'Paid entries cannot be deleted.',
                        status=status.HTTP_400_BAD_REQUEST, request=request)
        self.perform_destroy(instance)
        return ok(data=None, request=request, status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def pay(self, request, pk=None):
        """Mark a single payroll entry as paid."""
        entry = self.get_object()
        if entry.payment_status == 'paid':
            return fail('ALREADY_PAID', 'This entry has already been paid.',
                        status=status.HTTP_400_BAD_REQUEST, request=request)
        if entry.payment_status == 'pending':
            return fail('NOT_PROCESSED', 'Payroll must be processed before payment.',
                        status=status.HTTP_400_BAD_REQUEST, request=request)
        now = timezone.now()
        entry.payment_status = 'paid'
        entry.paid_at = now
        entry.payment_date = now.date()
        entry.payment_mode = request.data.get('payment_mode', 'bank')
        entry.transaction_reference = request.data.get('transaction_reference', '')
        entry.save(update_fields=['payment_status', 'paid_at', 'payment_date', 'payment_mode', 'transaction_reference'])
        return ok(data=self.get_serializer(entry).data, request=request)

    @action(detail=True, methods=['post'])
    def process_single(self, request, pk=None):
        """Process a single pending entry (recalculate salary)."""
        entry = self.get_object()
        if entry.payment_status == 'paid':
            return fail('ALREADY_PAID', 'Paid entries cannot be reprocessed.',
                        status=status.HTTP_400_BAD_REQUEST, request=request)
        tid = _resolve_tid(request.user)
        try:
            from .services import PayrollService
            settings = __import__('workforce.models', fromlist=['PayrollSettings']).PayrollSettings
            ps = settings.objects.filter(athens_tenant_id=tid).first()
            if not ps:
                return fail('NO_SETTINGS', 'Payroll settings not configured.',
                            status=status.HTTP_400_BAD_REQUEST, request=request)
            cycle = entry.payroll_cycle
            emp = entry.employee
            att = PayrollService.get_attendance_summary(emp, cycle.period_from, cycle.period_to)
            earnings = PayrollService.calculate_earnings(emp, att, ps)
            deductions = PayrollService.calculate_deductions(emp, earnings, cycle.period_from, cycle.period_to, ps)
            net = earnings['gross_salary'] - deductions['total_deductions']
            for k, v in {**att, **earnings, **deductions, 'net_salary': net}.items():
                if hasattr(entry, k):
                    setattr(entry, k, v)
            entry.payment_status = 'processed'
            entry.save()
            return ok(data=self.get_serializer(entry).data, request=request)
        except Exception as e:
            return fail('PROCESSING_FAILED', str(e),
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR, request=request)

    @action(detail=True, methods=['get'], url_path='payslip')
    def payslip(self, request, pk=None):
        """Generate and return payslip data for an entry."""
        entry = self.get_object()
        emp = entry.employee
        cycle = entry.payroll_cycle
        payslip_data = {
            'id': entry.id,
            'employee_name': emp.full_name,
            'employee_id': emp.employee_code,
            'department': emp.department.name if emp.department else 'N/A',
            'designation': emp.designation.name if emp.designation else 'N/A',
            'payroll_month': cycle.cycle_name,
            'period_from': cycle.period_from,
            'period_to': cycle.period_to,
            'earnings': {
                'basic_salary': float(entry.basic_earned),
                'da': float(entry.da_earned),
                'hra': float(entry.hra_earned),
                'allowances': float(entry.other_allowances),
                'overtime_wages': float(entry.overtime_wages),
                'gross_salary': float(entry.gross_salary),
            },
            'deductions': {
                'pf': float(entry.pf_employee),
                'esi': float(entry.esi_employee),
                'professional_tax': float(entry.professional_tax),
                'fines': float(entry.fines),
                'advances': float(entry.advances),
                'other_deductions': float(entry.other_deductions),
                'total_deductions': float(entry.total_deductions),
            },
            'net_salary': float(entry.net_salary),
            'payment_status': entry.payment_status,
            'payment_date': entry.payment_date,
            'payment_mode': entry.payment_mode,
            'transaction_reference': entry.transaction_reference,
            'total_days_worked': entry.total_days_worked,
            'paid_leave_days': entry.paid_leave_days,
            'unpaid_leave_days': entry.unpaid_leave_days,
            'overtime_hours': float(entry.overtime_hours),
        }
        return ok(data=payslip_data, request=request)

    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request):
        """Export payroll entries as CSV."""
        import csv
        from django.http import HttpResponse
        tid = _resolve_tid(request.user)
        cycle_id = request.query_params.get('cycle')
        payment_status = request.query_params.get('payment_status')
        
        qs = PayrollEntry.objects.filter(athens_tenant_id=tid).select_related(
            'employee', 'employee__department', 'employee__designation', 'payroll_cycle'
        )
        
        if cycle_id:
            qs = qs.filter(payroll_cycle_id=cycle_id)
        if payment_status:
            qs = qs.filter(payment_status=payment_status)
        
        qs = qs.order_by('-payroll_cycle__period_from', 'employee__full_name')
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="payroll_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Employee Code', 'Employee Name', 'Department', 'Designation',
            'Basic', 'DA', 'HRA', 'Allowances', 'OT Wages', 'Gross',
            'PF', 'ESI', 'PT', 'Fines', 'Advances', 'Other Deductions', 'Total Deductions',
            'Net Salary', 'Status', 'Payment Date', 'Payment Mode'
        ])
        
        for entry in qs:
            writer.writerow([
                entry.employee.employee_code,
                entry.employee.full_name,
                entry.employee.department.name if entry.employee.department else 'N/A',
                entry.employee.designation.name if entry.employee.designation else 'N/A',
                entry.basic_earned,
                entry.da_earned,
                entry.hra_earned,
                entry.other_allowances,
                entry.overtime_wages,
                entry.gross_salary,
                entry.pf_employee,
                entry.esi_employee,
                entry.professional_tax,
                entry.fines,
                entry.advances,
                entry.other_deductions,
                entry.total_deductions,
                entry.net_salary,
                entry.payment_status,
                entry.payment_date or 'N/A',
                entry.payment_mode or 'N/A',
            ])
        
        return response

class PayrollSettingsViewSet(viewsets.ModelViewSet):
    serializer_class = PayrollSettingsSerializer
    permission_classes = [IsAuthenticated, WorkforceServiceEnabled, IsWorkforceAdmin]
    

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return ok(data=serializer.data, request=request)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return ok(data=serializer.data, request=request)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return ok(data=serializer.data, request=request, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return ok(data=serializer.data, request=request)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return ok(data=None, request=request, status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        return PayrollSettings.objects.filter(athens_tenant_id=_resolve_tid(self.request.user))

    def perform_create(self, serializer):
        serializer.save(athens_tenant_id=_resolve_tid(self.request.user))

class BonusRecordViewSet(viewsets.ModelViewSet):
    serializer_class = BonusRecordSerializer
    permission_classes = [IsAuthenticated, WorkforceServiceEnabled, IsWorkforceAdmin]
    

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return ok(data=serializer.data, request=request)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return ok(data=serializer.data, request=request)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return ok(data=serializer.data, request=request, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return ok(data=serializer.data, request=request)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return ok(data=None, request=request, status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        return BonusRecord.objects.filter(athens_tenant_id=_resolve_tid(self.request.user)).select_related('employee')

    def perform_create(self, serializer):
        serializer.save(athens_tenant_id=_resolve_tid(self.request.user))

class FineViewSet(viewsets.ModelViewSet):
    serializer_class = FineSerializer
    permission_classes = [IsAuthenticated, WorkforceServiceEnabled, IsWorkforceAdmin]
    

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return ok(data=serializer.data, request=request)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return ok(data=serializer.data, request=request)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return ok(data=serializer.data, request=request, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return ok(data=serializer.data, request=request)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return ok(data=None, request=request, status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        return Fine.objects.filter(athens_tenant_id=_resolve_tid(self.request.user)).select_related('employee')

    def perform_create(self, serializer):
        serializer.save(athens_tenant_id=_resolve_tid(self.request.user))

class AdvanceViewSet(viewsets.ModelViewSet):
    serializer_class = AdvanceSerializer
    permission_classes = [IsAuthenticated, WorkforceServiceEnabled, IsWorkforceAdmin]
    

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return ok(data=serializer.data, request=request)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return ok(data=serializer.data, request=request)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return ok(data=serializer.data, request=request, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return ok(data=serializer.data, request=request)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return ok(data=None, request=request, status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        return Advance.objects.filter(athens_tenant_id=_resolve_tid(self.request.user)).select_related('employee')

    def perform_create(self, serializer):
        serializer.save(athens_tenant_id=_resolve_tid(self.request.user))

# LEGACY VIEWS

class EmployeeProfileViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeProfileSerializer
    permission_classes = [IsAuthenticated, WorkforceServiceEnabled, IsWorkforceAdmin]
    

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return ok(data=serializer.data, request=request)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return ok(data=serializer.data, request=request)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return ok(data=serializer.data, request=request, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return ok(data=serializer.data, request=request)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return ok(data=None, request=request, status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        return EmployeeProfile.objects.filter(athens_tenant_id=_resolve_tid(self.request.user))

    def perform_create(self, serializer):
        serializer.save(athens_tenant_id=_resolve_tid(self.request.user))

class LeaveTypeViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveTypeSerializer

    def get_permissions(self):
        # All authenticated users can list/retrieve leave types
        # Only admins can create/update/delete
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated(), WorkforceServiceEnabled()]
        return [IsAuthenticated(), WorkforceServiceEnabled(), IsWorkforceAdmin()]

    def get_queryset(self):
        return LeaveType.objects.filter(athens_tenant_id=_resolve_tid(self.request.user))

    def perform_create(self, serializer):
        serializer.save(athens_tenant_id=_resolve_tid(self.request.user))

    def list(self, request, *args, **kwargs):
        return ok(data=self.get_serializer(self.get_queryset(), many=True).data, request=request)

    def retrieve(self, request, *args, **kwargs):
        return ok(data=self.get_serializer(self.get_object()).data, request=request)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return ok(data=serializer.data, request=request, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return ok(data=serializer.data, request=request)

    def destroy(self, request, *args, **kwargs):
        self.perform_destroy(self.get_object())
        return ok(data=None, request=request, status=status.HTTP_204_NO_CONTENT)

class LeaveBalanceViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveBalanceSerializer
    permission_classes = [IsAuthenticated, WorkforceServiceEnabled]
    

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return ok(data=serializer.data, request=request)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return ok(data=serializer.data, request=request)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return ok(data=serializer.data, request=request, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return ok(data=serializer.data, request=request)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return ok(data=None, request=request, status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        return LeaveBalance.objects.filter(athens_tenant_id=_resolve_tid(self.request.user))

    def perform_create(self, serializer):
        serializer.save(athens_tenant_id=_resolve_tid(self.request.user))

# ─── Leave hierarchy helpers ────────────────────────────────────────────────

def _get_user_role(user) -> str:
    """Return a canonical role string for the user."""
    ut = getattr(user, 'user_type', '')
    if ut == 'superadmin':
        return 'superadmin'
    if ut == 'masteradmin':
        return 'masteradmin'
    rt = getattr(user, 'role_type', 'user')
    at = getattr(user, 'admin_type', None)
    if rt == 'admin' or at in ('client', 'epc', 'contractor'):
        return at or 'admin'
    return 'user'


def _find_approver(requester) -> 'User | None':
    """
    Return the correct approver for `requester` based on hierarchy:
      user        → any admin in same project/company
      client/epc/contractor admin → masteradmin of same tenant
      masteradmin → superadmin
      superadmin  → None (no higher authority)
    """
    from authentication.models import User as AuthUser
    role = _get_user_role(requester)

    if role == 'superadmin':
        return None

    if role == 'masteradmin':
        return AuthUser.objects.filter(
            user_type='superadmin', is_active=True
        ).first()

    if role in ('client', 'epc', 'contractor', 'admin'):
        # Find a masteradmin scoped to the same tenant
        tenant, _ = get_current_tenant(requester)
        if tenant:
            approver = AuthUser.objects.filter(
                user_type='masteradmin', tenant=tenant, is_active=True
            ).first()
            if approver:
                return approver
        # Fallback: any masteradmin
        return AuthUser.objects.filter(
            user_type='masteradmin', is_active=True
        ).first()

    # role == 'user' → find admin in same project/company
    project = getattr(requester, 'project', None)
    company_id = getattr(requester, 'company_id', None)
    qs = AuthUser.objects.filter(
        user_type='companyuser', role_type='admin', is_active=True
    ).exclude(id=requester.id)
    if project:
        approver = qs.filter(project=project).first()
        if approver:
            return approver
    if company_id:
        approver = qs.filter(company_id=company_id).first()
        if approver:
            return approver
    return None


def _can_approve(approver, leave_request) -> tuple[bool, str]:
    """
    Returns (allowed: bool, reason: str).
    Enforces: no self-approval, correct hierarchy level.
    """
    if leave_request.employee_id == approver.id:
        return False, 'You cannot approve or reject your own leave request.'
    if leave_request.status != 'pending':
        return False, f'This request is already {leave_request.status}.'
    # If an approver was assigned, only they (or a higher authority) may act
    if leave_request.assigned_approver_id:
        assigned_role = _get_user_role(leave_request.assigned_approver)
        approver_role = _get_user_role(approver)
        hierarchy = ['user', 'admin', 'client', 'epc', 'contractor', 'masteradmin', 'superadmin']
        assigned_level = hierarchy.index(assigned_role) if assigned_role in hierarchy else 0
        approver_level = hierarchy.index(approver_role) if approver_role in hierarchy else 0
        if approver_level < assigned_level and leave_request.assigned_approver_id != approver.id:
            return False, 'You are not authorised to approve this request.'
    return True, ''


class LeaveRequestViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsAuthenticated, WorkforceServiceEnabled]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def get_queryset(self):
        user = self.request.user
        role = _get_user_role(user)
        tid  = _resolve_tid(user)

        base = LeaveRequest.objects.filter(
            athens_tenant_id=tid
        ).select_related('employee', 'leave_type', 'approved_by', 'assigned_approver')

        if role == 'superadmin':
            qs = LeaveRequest.objects.select_related(
                'employee', 'leave_type', 'approved_by', 'assigned_approver'
            ).all()
        elif role == 'masteradmin':
            # Own requests + requests assigned to them
            qs = base.filter(
                models.Q(employee=user) | models.Q(assigned_approver=user)
            )
        elif role in ('client', 'epc', 'contractor', 'admin'):
            # Own requests + employee requests under same project/company
            project = getattr(user, 'project', None)
            company_id = getattr(user, 'company_id', None)
            q = models.Q(employee=user) | models.Q(assigned_approver=user)
            if project:
                q |= models.Q(employee__project=project, employee__role_type='user')
            if company_id:
                q |= models.Q(employee__company_id=company_id, employee__role_type='user')
            qs = base.filter(q)
        else:
            # Regular user: own requests only
            qs = base.filter(employee=user)

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        scope = self.request.query_params.get('scope')
        if scope == 'inbox':
            qs = qs.filter(assigned_approver=user, status='pending').exclude(employee=user)

        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        role = _get_user_role(user)
        approver = _find_approver(user)
        serializer.save(
            athens_tenant_id=_resolve_tid(user),
            employee=user,
            requester_role=role,
            assigned_approver=approver,
        )

    def list(self, request, *args, **kwargs):
        return ok(data=self.get_serializer(self.filter_queryset(self.get_queryset()), many=True).data, request=request)

    def retrieve(self, request, *args, **kwargs):
        return ok(data=self.get_serializer(self.get_object()).data, request=request)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return ok(data=serializer.data, request=request, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        if instance.employee_id != request.user.id:
            return fail('FORBIDDEN', 'You can only edit your own leave requests.',
                        status=status.HTTP_403_FORBIDDEN, request=request)
        if instance.status != 'pending':
            return fail('INVALID_STATUS', 'Only pending requests can be edited.',
                        status=status.HTTP_400_BAD_REQUEST, request=request)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return ok(data=serializer.data, request=request)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.employee_id != request.user.id:
            return fail('FORBIDDEN', 'You can only cancel your own leave requests.',
                        status=status.HTTP_403_FORBIDDEN, request=request)
        if instance.status not in ('pending',):
            return fail('INVALID_STATUS', 'Only pending requests can be cancelled.',
                        status=status.HTTP_400_BAD_REQUEST, request=request)
        instance.status = 'cancelled'
        instance.save(update_fields=['status'])
        return ok(data={'detail': 'Leave request cancelled.'}, request=request)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        leave = self.get_object()
        allowed, reason = _can_approve(request.user, leave)
        if not allowed:
            return fail('FORBIDDEN', reason, status=status.HTTP_403_FORBIDDEN, request=request)
        leave.status = 'approved'
        leave.approved_by = request.user
        leave.approved_at = timezone.now()
        leave.save(update_fields=['status', 'approved_by', 'approved_at'])
        return ok(data=self.get_serializer(leave).data, request=request)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        leave = self.get_object()
        allowed, reason = _can_approve(request.user, leave)
        if not allowed:
            return fail('FORBIDDEN', reason, status=status.HTTP_403_FORBIDDEN, request=request)
        rejection_reason = (request.data.get('rejection_reason') or '').strip()
        leave.status = 'rejected'
        leave.approved_by = request.user
        leave.approved_at = timezone.now()
        leave.rejection_reason = rejection_reason
        leave.save(update_fields=['status', 'approved_by', 'approved_at', 'rejection_reason'])
        return ok(data=self.get_serializer(leave).data, request=request)

    @action(detail=False, methods=['get'])
    def inbox(self, request):
        """Pending requests assigned to the current user for approval."""
        qs = LeaveRequest.objects.filter(
            assigned_approver=request.user,
            status='pending'
        ).exclude(employee=request.user).select_related(
            'employee', 'leave_type', 'assigned_approver'
        ).order_by('-created_at')
        return ok(data=self.get_serializer(qs, many=True).data, request=request)

    @action(detail=False, methods=['get'])
    def my_requests(self, request):
        """All leave requests submitted by the current user."""
        qs = LeaveRequest.objects.filter(
            employee=request.user
        ).select_related('leave_type', 'approved_by', 'assigned_approver').order_by('-created_at')
        return ok(data=self.get_serializer(qs, many=True).data, request=request)


class ContractorMasterViewSet(viewsets.ModelViewSet):
    serializer_class = ContractorMasterSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        tid = _resolve_tid(self.request.user)
        qs = ContractorMaster.objects.filter(athens_tenant_id=tid, status='active')
        company_type = self.request.query_params.get('company_type')
        if company_type:
            qs = qs.filter(company_type=company_type)
        return qs

    def perform_create(self, serializer):
        serializer.save(athens_tenant_id=_resolve_tid(self.request.user))


class UserAttendanceViewSet(viewsets.ModelViewSet):
    """
    Unified attendance for users and admins.

    Users  : can only see/create/update their own record.
    Admins : can see all records for their tenant/project.

    Special actions:
      GET  /api/workforce/user-attendance/today/       — today's record for logged-in user
      POST /api/workforce/user-attendance/             — check-in (creates record)
      PATCH /api/workforce/user-attendance/{id}/checkout/ — clock-out
    """
    serializer_class = UserAttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if _is_any_admin(user):
            user_type = getattr(user, 'user_type', '')
            if user_type in ('superadmin', 'masteradmin'):
                # masteradmin/superadmin — all records in their scope
                company_id = getattr(user, 'company_id', None)
                tenant, _ = get_current_tenant(user)
                if user_type == 'superadmin':
                    return UserAttendance.objects.select_related('user').order_by('-date', '-check_in_time')
                # masteradmin: scope by tenant or company_id
                q = models.Q()
                if tenant:
                    q |= models.Q(user__tenant=tenant)
                if company_id:
                    q |= models.Q(user__company_id=company_id)
                return UserAttendance.objects.filter(q).select_related('user').order_by('-date', '-check_in_time')
            # Project-level admin: use scoped users helper for correct isolation
            scoped_users = _get_scoped_users_for_admin(user)
            return UserAttendance.objects.filter(
                user__in=scoped_users
            ).select_related('user').order_by('-date', '-check_in_time')
        # Regular user — own records only
        return UserAttendance.objects.filter(user=user).order_by('-date')

    def create(self, request, *args, **kwargs):
        """User self check-in. Prevents duplicate check-in for same day."""
        today = timezone.localdate()
        if UserAttendance.objects.filter(user=request.user, date=today).exists():
            return Response(
                {'detail': 'Already checked in today.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = serializer.save(user=request.user, date=today)
        _sync_user_attendance_to_employee_attendance(request.user, record)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Return today's attendance record for the logged-in user, or 404."""
        today = timezone.localdate()
        try:
            record = UserAttendance.objects.get(user=request.user, date=today)
            return Response(UserAttendanceSerializer(record).data)
        except UserAttendance.DoesNotExist:
            return Response(None, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['patch'])
    def checkout(self, request, pk=None):
        """Clock-out: update check_out_time and optionally location."""
        record = self.get_object()
        if record.user != request.user and not _is_any_admin(request.user):
            return Response({'detail': 'Not allowed.'}, status=status.HTTP_403_FORBIDDEN)
        if record.check_out_time:
            return Response({'detail': 'Already clocked out.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(record, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        record = serializer.save()
        _sync_user_attendance_to_employee_attendance(record.user, record)
        return Response(serializer.data)
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='history')
    def history(self, request):
        """
        Attendance history for a specific employee over a date range.
        Admin-only. Returns records ordered by date descending.

        Query params:
          employee_id  — required, Employee.id (integer)
          start        — YYYY-MM-DD, default 30 days ago
          end          — YYYY-MM-DD, default today
        """
        if not _is_any_admin(request.user):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        from datetime import date as ddate, timedelta

        employee_id = request.query_params.get('employee_id')
        if not employee_id:
            return Response({'detail': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            employee_id = int(employee_id)
        except (ValueError, TypeError):
            return Response({'detail': 'employee_id must be an integer.'}, status=status.HTTP_400_BAD_REQUEST)

        today = timezone.localdate()
        try:
            end_date = ddate.fromisoformat(request.query_params.get('end', today.isoformat()))
        except ValueError:
            end_date = today
        try:
            start_date = ddate.fromisoformat(
                request.query_params.get('start', (today - timedelta(days=30)).isoformat())
            )
        except ValueError:
            start_date = today - timedelta(days=30)

        # Verify the employee belongs to this admin's scope
        employee_qs = _get_role_isolated_employees(request.user)
        try:
            employee = employee_qs.get(id=employee_id)
        except Employee.DoesNotExist:
            # Fallback: check if it's a User-based record (source='user_attendance')
            employee = None

        records = []

        if employee:
            # Source 1: Attendance table (Employee-linked)
            att_qs = Attendance.objects.filter(
                employee=employee,
                date__gte=start_date,
                date__lte=end_date,
            ).order_by('-date')

            seen_dates = set()
            for att in att_qs:
                if att.date in seen_dates:
                    continue
                seen_dates.add(att.date)
                work_hours = None
                if att.in_time and att.out_time:
                    mins = (att.out_time.hour * 60 + att.out_time.minute) - \
                           (att.in_time.hour * 60 + att.in_time.minute)
                    work_hours = f"{max(0, mins) // 60}h {max(0, mins) % 60}m"
                from datetime import time as dtime
                is_late = bool(att.in_time and att.in_time > dtime(9, 0))
                records.append({
                    'id': att.id,
                    'date': att.date.isoformat(),
                    'check_in_time': str(att.in_time)[:5] if att.in_time else None,
                    'check_out_time': str(att.out_time)[:5] if att.out_time else None,
                    'work_hours': work_hours,
                    'status': _employee_display_status(att, att.date),
                    'is_late': is_late,
                    'source': 'attendance',
                })
        else:
            # Source 2: UserAttendance table (User-linked, no Employee record)
            scoped_users = _get_scoped_users_for_admin(request.user)
            try:
                target_user = scoped_users.get(id=employee_id)
            except Exception:
                return Response({'detail': 'Employee not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)

            ua_qs = UserAttendance.objects.filter(
                user=target_user,
                date__gte=start_date,
                date__lte=end_date,
            ).order_by('-date')

            from datetime import time as dtime
            for ua in ua_qs:
                work_hours = None
                if ua.check_in_time and ua.check_out_time:
                    mins = (ua.check_out_time.hour * 60 + ua.check_out_time.minute) - \
                           (ua.check_in_time.hour * 60 + ua.check_in_time.minute)
                    work_hours = f"{max(0, mins) // 60}h {max(0, mins) % 60}m"
                is_late = bool(ua.check_in_time and ua.check_in_time > dtime(9, 0))
                records.append({
                    'id': ua.id,
                    'date': ua.date.isoformat(),
                    'check_in_time': str(ua.check_in_time)[:5] if ua.check_in_time else None,
                    'check_out_time': str(ua.check_out_time)[:5] if ua.check_out_time else None,
                    'work_hours': work_hours,
                    'status': ua.status,
                    'is_late': is_late,
                    'source': 'user_attendance',
                })

        return Response(records)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='admin-today')
    def admin_today(self, request):
        """Today's UserAttendance record for the logged-in admin (self-service clock-in/out)."""
        today = timezone.localdate()
        try:
            record = UserAttendance.objects.get(user=request.user, date=today)
            return Response(UserAttendanceSerializer(record).data)
        except UserAttendance.DoesNotExist:
            return Response(None, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def dashboard(self, request):
        """
        Admin dashboard: merges Employee+Attendance rows with User+UserAttendance rows.
        This ensures users who checked in via UserAttendance (but have no Employee record,
        or whose sync failed) still appear in the admin's attendance panel.
        """
        if not _is_any_admin(request.user):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        from django.db.models import Q
        from datetime import date as ddate
        from datetime import time as dtime

        date_str = request.query_params.get('date')
        try:
            target_date = ddate.fromisoformat(date_str) if date_str else timezone.localdate()
        except ValueError:
            return Response({'detail': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        search = request.query_params.get('search', '').strip()
        department = request.query_params.get('department', '').strip()
        status_filter = request.query_params.get('status', '').strip()

        print(f"[DASHBOARD] admin={user.id} user_type={user.user_type} admin_type={getattr(user,'admin_type',None)} date={target_date}")

        # ── TRACK SEEN KEYS to avoid duplicates ──────────────────────────────
        seen_keys = set()   # 'emp:{id}' or 'usr:{id}'
        seen_names = set()  # normalised full_name — cross-source dedup guard
        records = []
        present_count = late_count = half_day_count = absent_count = checked_out_count = not_marked_count = 0

        def _count_status(s):
            nonlocal present_count, late_count, half_day_count, absent_count, checked_out_count, not_marked_count
            if s in ('present', 'late', 'checked_out'):
                present_count += 1
            if s == 'late':
                late_count += 1
            if s == 'half_day':
                half_day_count += 1
            if s == 'checked_out':
                checked_out_count += 1
            if s == 'not_marked':
                not_marked_count += 1
            if s == 'absent':
                absent_count += 1

        # ── SOURCE 1: Employee records + Attendance table ─────────────────────
        employees = _get_role_isolated_employees(user)
        if search:
            employees = employees.filter(
                Q(full_name__icontains=search)
                | Q(employee_code__icontains=search)
                | Q(department__name__icontains=search)
            )
        if department:
            employees = employees.filter(department__name__icontains=department)

        attendance_by_employee = {
            rec.employee_id: rec
            for rec in Attendance.objects.filter(employee__in=employees, date=target_date).select_related('employee')
        }
        print(f"[DASHBOARD] employee_count={employees.count()} attendance_records={len(attendance_by_employee)}")

        for employee in employees.order_by('full_name', 'employee_code'):
            key = f'emp:{employee.id}'
            seen_keys.add(key)
            seen_names.add(employee.full_name.strip().lower())
            attendance = attendance_by_employee.get(employee.id)
            effective_status = _employee_display_status(attendance, target_date)
            _count_status(effective_status)
            row = {
                'id': attendance.id if attendance else None,
                'employee_id': employee.id,
                'employee_code': employee.employee_code,
                'name': employee.full_name,
                'email': '',
                'department': employee.department.name if employee.department else '',
                'designation': employee.designation.name if employee.designation else '',
                'check_in_time': str(attendance.in_time)[:5] if attendance and attendance.in_time else None,
                'check_out_time': str(attendance.out_time)[:5] if attendance and attendance.out_time else None,
                'total_hours': f"{attendance.total_hours}h" if attendance and attendance.total_hours else None,
                'status': effective_status,
                'current_state': (
                    'Working' if attendance and attendance.in_time and not attendance.out_time else
                    'Checked Out' if attendance and attendance.out_time else
                    'Not Marked'
                ),
                'is_late': _late_status(attendance),
                'latitude': attendance.latitude if attendance else None,
                'longitude': attendance.longitude if attendance else None,
                'has_record': bool(attendance),
                'source': 'employee',
            }
            if status_filter and row['status'] != status_filter:
                continue
            records.append(row)

        # ── SOURCE 2: Users created by this admin + UserAttendance table ──────
        # This catches users who checked in via UserAttendance but have no
        # Employee record (or whose sync to Attendance failed).
        scoped_users = _get_scoped_users_for_admin(user)
        if search:
            scoped_users = scoped_users.filter(
                Q(name__icontains=search)
                | Q(email__icontains=search)
                | Q(username__icontains=search)
            )

        ua_map = {
            ua.user_id: ua
            for ua in UserAttendance.objects.filter(
                user__in=scoped_users, date=target_date
            ).select_related('user')
        }
        print(f"[DASHBOARD] scoped_user_count={scoped_users.count()} user_attendance_records={len(ua_map)} date={target_date}")
        print(f"[DASHBOARD] scoped_user_ids={list(scoped_users.values_list('id', flat=True)[:20])}")
        print(f"[DASHBOARD] ua_user_ids={list(ua_map.keys())}")

        for u in scoped_users.select_related('project'):
            # Skip if already represented via Employee record by key or by name
            user_key = f'usr:{u.id}'
            if user_key in seen_keys:
                continue

            full_name = (getattr(u, 'name', '') or '').strip()
            if getattr(u, 'surname', ''):
                full_name = f"{full_name} {u.surname}".strip()
            if not full_name:
                full_name = u.username or u.email.split('@')[0]

            # Cross-source dedup: skip if this user's name already came from an Employee row
            if full_name.lower() in seen_names:
                print(f"[DASHBOARD DEDUP] Skipping user={u.id} name='{full_name}' — already present via Employee record")
                continue

            ua = ua_map.get(u.id)
            seen_keys.add(user_key)
            seen_names.add(full_name.lower())

            # Derive display status from UserAttendance
            if ua and ua.check_in_time:
                if ua.check_out_time:
                    ci = ua.check_in_time
                    co = ua.check_out_time
                    mins = (co.hour * 60 + co.minute) - (ci.hour * 60 + ci.minute)
                    effective_status = 'half_day' if mins < 240 else 'checked_out'
                elif ua.check_in_time > dtime(9, 0):
                    effective_status = 'late'
                else:
                    effective_status = 'present'
            else:
                if target_date < timezone.localdate():
                    effective_status = 'absent'
                else:
                    effective_status = 'absent' if timezone.localtime().time() > dtime(9, 0) else 'not_marked'

            _count_status(effective_status)

            total_hours_str = None
            if ua and ua.check_in_time and ua.check_out_time:
                mins = (ua.check_out_time.hour * 60 + ua.check_out_time.minute) - \
                       (ua.check_in_time.hour * 60 + ua.check_in_time.minute)
                total_hours_str = f"{max(0, mins) / 60:.2f}h"

            row = {
                'id': ua.id if ua else None,
                'employee_id': u.id,
                'employee_code': f'USR-{u.id}',
                'name': full_name,
                'email': u.email,
                'department': getattr(u, 'department', '') or '',
                'designation': getattr(u, 'designation', '') or '',
                'check_in_time': str(ua.check_in_time)[:5] if ua and ua.check_in_time else None,
                'check_out_time': str(ua.check_out_time)[:5] if ua and ua.check_out_time else None,
                'total_hours': total_hours_str,
                'status': effective_status,
                'current_state': (
                    'Working' if ua and ua.check_in_time and not ua.check_out_time else
                    'Checked Out' if ua and ua.check_out_time else
                    'Not Marked'
                ),
                'is_late': bool(ua and ua.check_in_time and ua.check_in_time > dtime(9, 0)),
                'latitude': ua.latitude if ua else None,
                'longitude': ua.longitude if ua else None,
                'has_record': bool(ua),
                'source': 'user_attendance',
            }
            if status_filter and row['status'] != status_filter:
                continue
            records.append(row)

        total_people = len(seen_keys)
        print(f"[DASHBOARD] total_records={len(records)} total_people={total_people} present={present_count} absent={absent_count}")

        return Response({
            'date': str(target_date),
            'summary': {
                'total': total_people,
                'present': present_count,
                'late': late_count,
                'half_day': half_day_count,
                'absent': absent_count,
                'checked_out': checked_out_count,
                'not_marked': not_marked_count,
            },
            'records': records,
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='admin-checkin')
    def admin_checkin(self, request):
        """Admin check-in, override, or correction for an Employee attendance row."""
        if not _is_any_admin(request.user):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        from datetime import date as ddate

        employee_id = request.data.get('employee_id') or request.data.get('user_id')
        if not employee_id:
            return Response({'detail': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        employee_qs = _get_role_isolated_employees(request.user)

        try:
            employee = employee_qs.get(id=employee_id)
        except Employee.DoesNotExist:
            return Response({'detail': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            target_date = ddate.fromisoformat(request.data.get('date')) if request.data.get('date') else timezone.localdate()
        except ValueError:
            return Response({'detail': 'Invalid date.'}, status=status.HTTP_400_BAD_REQUEST)

        check_in_time = _parse_hhmm(request.data.get('check_in_time'), timezone.localtime().time())
        check_out_time = _parse_hhmm(request.data.get('check_out_time'))
        total_hours = _calculate_hours(check_in_time, check_out_time)
        status_code = 'A' if request.data.get('status') == 'absent' else 'P'

        defaults = {
            'athens_tenant_id': employee.athens_tenant_id,
            'in_time': check_in_time,
            'out_time': check_out_time,
            'total_hours': total_hours,
            'status': status_code,
            'latitude': request.data.get('latitude'),
            'longitude': request.data.get('longitude'),
            **_attendance_scope_metadata(request.user),
        }
        record, created = Attendance.objects.update_or_create(employee=employee, date=target_date, defaults=defaults)
        return Response({
            'id': record.id,
            'employee_id': employee.id,
            'date': str(target_date),
            'check_in_time': str(record.in_time)[:5] if record.in_time else None,
            'check_out_time': str(record.out_time)[:5] if record.out_time else None,
            'status': _employee_display_status(record, target_date),
            'created': created,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='admin-checkout')
    def admin_checkout(self, request):
        """Admin check-out/correction for an Employee attendance row."""
        if not _is_any_admin(request.user):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        from datetime import date as ddate

        employee_id = request.data.get('employee_id') or request.data.get('user_id')
        if not employee_id:
            return Response({'detail': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        employee_qs = _get_role_isolated_employees(request.user)

        try:
            employee = employee_qs.get(id=employee_id)
        except Employee.DoesNotExist:
            return Response({'detail': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            target_date = ddate.fromisoformat(request.data.get('date')) if request.data.get('date') else timezone.localdate()
        except ValueError:
            return Response({'detail': 'Invalid date.'}, status=status.HTTP_400_BAD_REQUEST)

        record, _ = Attendance.objects.get_or_create(
            employee=employee,
            date=target_date,
            defaults={
                'athens_tenant_id': employee.athens_tenant_id,
                'status': 'P',
                **_attendance_scope_metadata(request.user),
            }
        )
        record.out_time = _parse_hhmm(request.data.get('check_out_time'), timezone.localtime().time())
        if not record.in_time:
            record.in_time = _parse_hhmm(request.data.get('check_in_time'), record.out_time)
        record.total_hours = _calculate_hours(record.in_time, record.out_time)
        record.status = 'P' if record.in_time else 'A'
        record.latitude = request.data.get('latitude') or record.latitude
        record.longitude = request.data.get('longitude') or record.longitude
        record.save()

        return Response({
            'id': record.id,
            'employee_id': employee.id,
            'check_out_time': str(record.out_time)[:5] if record.out_time else None,
            'status': _employee_display_status(record, target_date),
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def contractoruser_list(request):
    """Compat endpoint: returns contractor companies in the format SafetyObservationForm expects."""
    contractors = ContractorMaster.objects.filter(
        athens_tenant_id=_resolve_tid(request.user), status='active', company_type='contractor'
    ).values('id', 'company_name', 'contact_person', 'contact_number', 'email')
    users = [{'company_name': c['company_name'], 'id': c['id']} for c in contractors]
    return Response({'users': users})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def workforce_stats(request):
    """
    Single endpoint returning all KPI values for the Workforce Dashboard.
    Scoped by tenant/role — no cross-tenant leakage.
    """
    user = request.user
    tid = _resolve_tid(user)
    today = timezone.localdate()

    # ── Employee counts ──────────────────────────────────────────────────────
    emp_qs = Employee.objects.filter(athens_tenant_id=tid)

    # Role isolation for project-level admins
    admin_type = getattr(user, 'admin_type', None)
    project = getattr(user, 'project', None)
    if admin_type in ('client', 'epc', 'contractor'):
        emp_qs = emp_qs.filter(created_by_admin=user)
    elif getattr(user, 'role_type', None) == 'admin':
        emp_qs = emp_qs.filter(created_by_admin=user)

    total_employees = emp_qs.count()
    active_employees = emp_qs.filter(status='active').count()

    # ── Departments ──────────────────────────────────────────────────────────
    dept_count = Department.objects.filter(athens_tenant_id=tid).count()

    # ── Leave stats ──────────────────────────────────────────────────────────
    leave_qs = LeaveRequest.objects.filter(athens_tenant_id=tid)
    pending_leaves = leave_qs.filter(status='pending').count()
    on_leave = leave_qs.filter(
        status='approved',
        start_date__lte=today,
        end_date__gte=today,
    ).count()

    # ── Attendance today ─────────────────────────────────────────────────────
    # Count UserAttendance records for today scoped to this tenant's users
    from authentication.models import CustomUser
    tenant_user_ids = CustomUser.objects.filter(
        company_id=tid, is_active=True
    ).values_list('id', flat=True)
    present_today = UserAttendance.objects.filter(
        date=today,
        user_id__in=tenant_user_ids,
        check_in_time__isnull=False,
    ).count()

    avg_attendance = round((present_today / total_employees * 100), 1) if total_employees > 0 else 0

    # ── Payroll (current month net total) ────────────────────────────────────
    from django.db.models import Sum
    monthly_payroll = PayrollEntry.objects.filter(
        athens_tenant_id=tid,
        payment_status__in=['processed', 'paid'],
    ).aggregate(total=Sum('net_salary'))['total'] or 0

    return Response({
        'total_employees': total_employees,
        'active_employees': active_employees,
        'on_leave': on_leave,
        'pending_leaves': pending_leaves,
        'present_today': present_today,
        'avg_attendance': avg_attendance,
        'monthly_payroll': float(monthly_payroll),
        'departments': dept_count,
    })
