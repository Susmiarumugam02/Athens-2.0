from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from system.utils import get_current_tenant
from system.api_response import ok, fail
from .models import *
from .serializers import *
from .permissions import WorkforceServiceEnabled, IsWorkforceAdmin
from decimal import Decimal

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
        tenant, error = get_current_tenant(self.request.user)
        if error:
            return Department.objects.none()
        return Department.objects.filter(athens_tenant_id=tenant.id)
    
    def perform_create(self, serializer):
        tenant, _ = get_current_tenant(self.request.user)
        serializer.save(athens_tenant_id=tenant.id)

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
        tenant, error = get_current_tenant(self.request.user)
        if error:
            return Designation.objects.none()
        return Designation.objects.filter(athens_tenant_id=tenant.id)
    
    def perform_create(self, serializer):
        tenant, _ = get_current_tenant(self.request.user)
        serializer.save(athens_tenant_id=tenant.id)

class EmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeSerializer
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
        tenant, error = get_current_tenant(self.request.user)
        if error:
            return Employee.objects.none()
        return Employee.objects.filter(athens_tenant_id=tenant.id).select_related('department', 'designation')
    
    def perform_create(self, serializer):
        tenant, _ = get_current_tenant(self.request.user)
        serializer.save(athens_tenant_id=tenant.id)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.status = 'inactive'
        instance.save()
        return ok(data={'detail': 'Employee marked as inactive'}, request=request)

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
        tenant, error = get_current_tenant(self.request.user)
        if error:
            return ShiftSchedule.objects.none()
        return ShiftSchedule.objects.filter(athens_tenant_id=tenant.id)
    
    def perform_create(self, serializer):
        tenant, _ = get_current_tenant(self.request.user)
        serializer.save(athens_tenant_id=tenant.id)

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
        tenant, error = get_current_tenant(self.request.user)
        if error:
            return Holiday.objects.none()
        return Holiday.objects.filter(athens_tenant_id=tenant.id)
    
    def perform_create(self, serializer):
        tenant, _ = get_current_tenant(self.request.user)
        serializer.save(athens_tenant_id=tenant.id)

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
        tenant, error = get_current_tenant(self.request.user)
        if error:
            return Attendance.objects.none()
        return Attendance.objects.filter(athens_tenant_id=tenant.id).select_related('employee', 'shift')
    
    def perform_create(self, serializer):
        tenant, _ = get_current_tenant(self.request.user)
        serializer.save(athens_tenant_id=tenant.id)

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
        tenant, error = get_current_tenant(self.request.user)
        if error:
            return PayrollCycle.objects.none()
        return PayrollCycle.objects.filter(athens_tenant_id=tenant.id)
    
    def perform_create(self, serializer):
        tenant, _ = get_current_tenant(self.request.user)
        serializer.save(athens_tenant_id=tenant.id)
    
    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        cycle = self.get_object()
        tenant, _ = get_current_tenant(request.user)
        
        try:
            from .services import PayrollService
            result = PayrollService.process_payroll_cycle(cycle, tenant.id)
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
        tenant, error = get_current_tenant(self.request.user)
        if error:
            return PayrollEntry.objects.none()
        return PayrollEntry.objects.filter(athens_tenant_id=tenant.id).select_related('employee', 'payroll_cycle')

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
        tenant, error = get_current_tenant(self.request.user)
        if error:
            return PayrollSettings.objects.none()
        return PayrollSettings.objects.filter(athens_tenant_id=tenant.id)
    
    def perform_create(self, serializer):
        tenant, _ = get_current_tenant(self.request.user)
        serializer.save(athens_tenant_id=tenant.id)

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
        tenant, error = get_current_tenant(self.request.user)
        if error:
            return BonusRecord.objects.none()
        return BonusRecord.objects.filter(athens_tenant_id=tenant.id).select_related('employee')
    
    def perform_create(self, serializer):
        tenant, _ = get_current_tenant(self.request.user)
        serializer.save(athens_tenant_id=tenant.id)

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
        tenant, error = get_current_tenant(self.request.user)
        if error:
            return Fine.objects.none()
        return Fine.objects.filter(athens_tenant_id=tenant.id).select_related('employee')
    
    def perform_create(self, serializer):
        tenant, _ = get_current_tenant(self.request.user)
        serializer.save(athens_tenant_id=tenant.id)

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
        tenant, error = get_current_tenant(self.request.user)
        if error:
            return Advance.objects.none()
        return Advance.objects.filter(athens_tenant_id=tenant.id).select_related('employee')
    
    def perform_create(self, serializer):
        tenant, _ = get_current_tenant(self.request.user)
        serializer.save(athens_tenant_id=tenant.id)

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
        tenant, error = get_current_tenant(self.request.user)
        if error:
            return EmployeeProfile.objects.none()
        return EmployeeProfile.objects.filter(athens_tenant_id=tenant.id)
    
    def perform_create(self, serializer):
        tenant, _ = get_current_tenant(self.request.user)
        serializer.save(athens_tenant_id=tenant.id)

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
        tenant, error = get_current_tenant(self.request.user)
        if error:
            return LeaveType.objects.none()
        return LeaveType.objects.filter(athens_tenant_id=tenant.id)
    
    def perform_create(self, serializer):
        tenant, _ = get_current_tenant(self.request.user)
        serializer.save(athens_tenant_id=tenant.id)

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
        tenant, error = get_current_tenant(self.request.user)
        if error:
            return LeaveBalance.objects.none()
        return LeaveBalance.objects.filter(athens_tenant_id=tenant.id)
    
    def perform_create(self, serializer):
        tenant, _ = get_current_tenant(self.request.user)
        serializer.save(athens_tenant_id=tenant.id)

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
        tenant, error = get_current_tenant(self.request.user)
        if error:
            return LeaveRequest.objects.none()
        return LeaveRequest.objects.filter(athens_tenant_id=tenant.id)
    
    def perform_create(self, serializer):
        tenant, _ = get_current_tenant(self.request.user)
        serializer.save(athens_tenant_id=tenant.id, employee=self.request.user)
