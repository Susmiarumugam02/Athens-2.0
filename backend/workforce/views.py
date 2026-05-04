from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction
from system.utils import get_current_tenant
from system.api_response import ok, fail
from .models import *
from .serializers import *
from .permissions import WorkforceServiceEnabled, IsWorkforceAdmin
from decimal import Decimal
import random, string


def _gen_password(length=12):
    chars = string.ascii_letters + string.digits + '!@#$%'
    return ''.join(random.choices(chars, k=length))


def _tenant_id(user):
    """
    Resolve a stable integer scope-ID for ANY user type — never crashes.
    Priority: tenant FK → project FK → company_id → user.id
    """
    tenant, _ = get_current_tenant(user)
    if tenant:
        return tenant.id
    project = getattr(user, 'project', None)
    if project:
        return project.id
    company_id = getattr(user, 'company_id', None)
    if company_id:
        return company_id
    return user.id


def _resolve_tid(user):
    """Shorthand: always returns an int, never None."""
    return _tenant_id(user)

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
        tenant, _ = get_current_tenant(self.request.user)
        
        if tenant is None:
            tenant_id = _tenant_id(self.request.user)
        else:
            tenant_id = tenant.id
        
        return Employee.objects.filter(
            athens_tenant_id=tenant_id
        ).exclude(status='inactive').select_related('department', 'designation')

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
        print("REQUEST DATA:", request.data)  # DEBUG LOG
        
        from authentication.models import User, UserType, SecurityLog

        admin = request.user
        tenant, _ = get_current_tenant(admin)

        # Resolve tenant_id for scoping — works for all admin types
        tenant_id = tenant.id if tenant else _tenant_id(admin)

        email = (request.data.get('email') or '').strip()
        if not email:
            return fail('EMAIL_REQUIRED', 'Email is required to create login credentials.',
                        status=status.HTTP_400_BAD_REQUEST, request=request)

        if User.objects.filter(email=email).exists():
            return fail('EMAIL_EXISTS', 'A user with this email already exists.',
                        status=status.HTTP_400_BAD_REQUEST, request=request)

        # Build unique username
        emp_code = (request.data.get('employee_code') or '').replace(' ', '')
        base_username = email.split('@')[0]
        username = f"{base_username}_{emp_code}" if emp_code else base_username
        if User.objects.filter(username=username).exists():
            username = f"{username}_{random.randint(100, 999)}"

        plain_password = request.data.get('password') or _gen_password()

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                # 1. Create employee record
                employee = serializer.save(athens_tenant_id=tenant_id)

                # 2. Create user login account
                user = User(
                    email=email,
                    username=username,
                    name=request.data.get('full_name', ''),
                    user_type=UserType.COMPANYUSER,
                    role_type='user',
                    company_type=getattr(admin, 'admin_type', None),
                    admin_type=None,
                    project=getattr(admin, 'project', None),
                    tenant=tenant,  # may be None for project-scoped admins
                    company_id=getattr(admin, 'company_id', None) or tenant_id,
                    athens_tenant_id=getattr(admin, 'athens_tenant_id', None),
                    created_by=admin,
                    approval_status='pending',
                    is_first_login=True,
                    is_autogenerated_password=not bool(request.data.get('password')),
                    is_active=True,
                )
                user.set_password(plain_password)
                user.save()

                SecurityLog.objects.create(
                    event_type=SecurityLog.EventType.MASTER_CREATED,
                    severity=SecurityLog.Severity.INFO,
                    user=admin,
                    metadata={
                        'event': 'workforce.create_employee_with_login',
                        'employee_id': employee.id,
                        'user_id': user.id,
                    }
                )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error('Employee create failed: %s', e, exc_info=True)
            msg = str(e)
            # Surface duplicate key errors clearly
            if 'unique' in msg.lower() or 'duplicate' in msg.lower():
                msg = 'An employee with this code or email already exists.'
            return fail('CREATE_FAILED', msg,
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR, request=request)

        return Response({
            'data': serializer.data,
            'login': {
                'user_id': user.id,
                'email': user.email,
                'username': user.username,
                'password': plain_password,
                'role_type': 'user',
                'approval_status': 'pending',
                'is_first_login': True,
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
        Returns all active employees scoped to the current tenant/project.
        Bypasses WorkforceServiceEnabled — always accessible to authenticated users.
        """
        tenant, _ = get_current_tenant(request.user)
        tenant_id = tenant.id if tenant else _tenant_id(request.user)

        qs = Employee.objects.filter(
            athens_tenant_id=tenant_id
        ).exclude(status='inactive').values(
            'id', 'full_name', 'employee_code', 'department', 'designation'
        )

        data = [
            {
                'id': e['id'],
                'full_name': e['full_name'] or '',
                'employee_code': e['employee_code'] or str(e['id']).zfill(2),
                'department': e['department'],
                'designation': e['designation'],
            }
            for e in qs
        ]
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
        return PayrollCycle.objects.filter(athens_tenant_id=_resolve_tid(self.request.user))

    def perform_create(self, serializer):
        serializer.save(athens_tenant_id=_resolve_tid(self.request.user))

    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        cycle = self.get_object()
        tid = _resolve_tid(request.user)
        
        try:
            from .services import PayrollService
            result = PayrollService.process_payroll_cycle(cycle, tid)
            return ok(data=result, request=request)
        except ValueError as e:
            return fail('VALIDATION_ERROR', str(e), status=status.HTTP_400_BAD_REQUEST, request=request)
        except Exception as e:
            return fail('PROCESSING_FAILED', f'Payroll processing failed: {str(e)}', status=status.HTTP_500_INTERNAL_SERVER_ERROR, request=request)
    
    @action(detail=True, methods=['post'])
    def lock(self, request, pk=None):
        cycle = self.get_object()
        if cycle.status != 'processed':
            return fail('INVALID_STATUS', 'Only processed cycles can be locked', status=status.HTTP_400_BAD_REQUEST, request=request)
        cycle.status = 'locked'
        cycle.save()
        return ok(data={'detail': 'Payroll cycle locked'}, request=request)

class PayrollEntryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PayrollEntrySerializer
    permission_classes = [IsAuthenticated, WorkforceServiceEnabled]
    

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return ok(data=serializer.data, request=request)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return ok(data=serializer.data, request=request)

    def get_queryset(self):
        return PayrollEntry.objects.filter(athens_tenant_id=_resolve_tid(self.request.user)).select_related('employee', 'payroll_cycle')

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
        return LeaveType.objects.filter(athens_tenant_id=_resolve_tid(self.request.user))

    def perform_create(self, serializer):
        serializer.save(athens_tenant_id=_resolve_tid(self.request.user))

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

class LeaveRequestViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveRequestSerializer
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
        return LeaveRequest.objects.filter(athens_tenant_id=_resolve_tid(self.request.user))

    def perform_create(self, serializer):
        serializer.save(athens_tenant_id=_resolve_tid(self.request.user), employee=self.request.user)


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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def contractoruser_list(request):
    """Compat endpoint: returns contractor companies in the format SafetyObservationForm expects."""
    contractors = ContractorMaster.objects.filter(
        athens_tenant_id=_resolve_tid(request.user), status='active', company_type='contractor'
    ).values('id', 'company_name', 'contact_person', 'contact_number', 'email')
    users = [{'company_name': c['company_name'], 'id': c['id']} for c in contractors]
    return Response({'users': users})
