from rest_framework import serializers
from .models import *

# MODULE 1: EMPLOYEE & WORKFORCE MANAGEMENT

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at']

class DesignationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Designation
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at']

class EmployeeSerializer(serializers.ModelSerializer):
    age = serializers.ReadOnlyField()
    department_name = serializers.CharField(source='department.name', read_only=True)
    designation_name = serializers.CharField(source='designation.name', read_only=True)

    # Make date fields optional so the form can omit them
    date_of_birth = serializers.DateField(required=False, allow_null=True, default=None)
    joining_date = serializers.DateField(required=False, allow_null=True, default=None)

    class Meta:
        model = Employee
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at', 'updated_at']

    def validate(self, attrs):
        # Provide defaults for required model fields if not supplied
        from datetime import date
        if not attrs.get('date_of_birth'):
            attrs['date_of_birth'] = date(2000, 1, 1)
        if not attrs.get('joining_date'):
            attrs['joining_date'] = date.today()
        return attrs

# MODULE 2: ATTENDANCE & WORK HOURS MANAGEMENT

class ShiftScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShiftSchedule
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at']

class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at']

class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    shift_name = serializers.CharField(source='shift.shift_name', read_only=True)
    
    class Meta:
        model = Attendance
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at']

# MODULE 3: PAYROLL & WAGE MANAGEMENT

class PayrollCycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollCycle
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'processed_at', 'created_at']

class PayrollEntrySerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    cycle_name = serializers.CharField(source='payroll_cycle.cycle_name', read_only=True)
    
    class Meta:
        model = PayrollEntry
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at']

class PayrollSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollSettings
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at', 'updated_at']

class BonusRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    
    class Meta:
        model = BonusRecord
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at']

class FineSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    
    class Meta:
        model = Fine
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at']

class AdvanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    
    class Meta:
        model = Advance
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at']

# LEGACY SERIALIZERS

class EmployeeProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeProfile
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at', 'updated_at']

class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at']

class LeaveBalanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveBalance
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id']

class LeaveRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveRequest
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'approved_by', 'approved_at', 'created_at']


class ContractorMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContractorMaster
        fields = ['id', 'company_name', 'company_type', 'company_address', 'contact_person',
                  'contact_number', 'email', 'pan_number', 'gst_number', 'status']
        read_only_fields = ['id', 'athens_tenant_id']
