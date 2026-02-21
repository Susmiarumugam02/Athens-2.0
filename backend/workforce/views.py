from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from system.utils import get_current_tenant
from .models import *
from .serializers import *
from .permissions import WorkforceServiceEnabled, IsWorkforceAdmin
from decimal import Decimal

# MODULE 1: EMPLOYEE & WORKFORCE MANAGEMENT

class DepartmentViewSet(viewsets.ModelViewSet):
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated, WorkforceServiceEnabled, IsWorkforceAdmin]
    
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
        return Response({'detail': 'Employee marked as inactive'}, status=status.HTTP_200_OK)

# MODULE 2: ATTENDANCE & WORK HOURS MANAGEMENT

class ShiftScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftScheduleSerializer
    permission_classes = [IsAuthenticated, WorkforceServiceEnabled, IsWorkforceAdmin]
    
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
            return Response(result, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f'Payroll processing failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def lock(self, request, pk=None):
        cycle = self.get_object()
        if cycle.status != 'processed':
            return Response({'error': 'Only processed cycles can be locked'}, status=status.HTTP_400_BAD_REQUEST)
        cycle.status = 'locked'
        cycle.save()
        return Response({'detail': 'Payroll cycle locked'}, status=status.HTTP_200_OK)

class PayrollEntryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PayrollEntrySerializer
    permission_classes = [IsAuthenticated, WorkforceServiceEnabled]
    
    def get_queryset(self):
        tenant, error = get_current_tenant(self.request.user)
        if error:
            return PayrollEntry.objects.none()
        return PayrollEntry.objects.filter(athens_tenant_id=tenant.id).select_related('employee', 'payroll_cycle')

class PayrollSettingsViewSet(viewsets.ModelViewSet):
    serializer_class = PayrollSettingsSerializer
    permission_classes = [IsAuthenticated, WorkforceServiceEnabled, IsWorkforceAdmin]
    
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
    
    def get_queryset(self):
        tenant, error = get_current_tenant(self.request.user)
        if error:
            return LeaveRequest.objects.none()
        return LeaveRequest.objects.filter(athens_tenant_id=tenant.id)
    
    def perform_create(self, serializer):
        tenant, _ = get_current_tenant(self.request.user)
        serializer.save(athens_tenant_id=tenant.id, employee=self.request.user)
