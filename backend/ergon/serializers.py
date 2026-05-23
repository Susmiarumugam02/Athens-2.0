from rest_framework import serializers
from .models import *

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_by', 'created_at', 'updated_at']

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at']

class TaskCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskCategory
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at']

class TaskSerializer(serializers.ModelSerializer):
    assigned_by_name = serializers.CharField(source='assigned_by.email', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.email', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = Task
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at', 'updated_at']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # project is auto-resolved on the backend when not provided
        self.fields['project'].required = False
        self.fields['project'].allow_null = True

class RecurringTaskConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecurringTaskConfig
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

class TaskProgressHistorySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = TaskProgressHistory
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

class TaskHistorySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = TaskHistory
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at']

class FollowupSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.email', read_only=True)
    
    class Meta:
        model = Followup
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_by', 'created_at', 'updated_at']

class FollowupHistorySerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.email', read_only=True)
    
    class Meta:
        model = FollowupHistory
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

class DailyTaskSerializer(serializers.ModelSerializer):
    task_title = serializers.CharField(source='task.title', read_only=True, allow_null=True)
    user_name = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = DailyTask
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at', 'updated_at']

class DailyTaskHistorySerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.email', read_only=True)
    
    class Meta:
        model = DailyTaskHistory
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

class SLAHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SLAHistory
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

class ManpowerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Manpower
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at']

class ManpowerAllocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ManpowerAllocation
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

class MachinerySerializer(serializers.ModelSerializer):
    class Meta:
        model = Machinery
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at']

class MachineryAllocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MachineryAllocation
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

class AdvanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    approved_by_name = serializers.CharField(source='approved_by.email', read_only=True, allow_null=True)

    class Meta:
        model = Advance
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at', 'requested_date',
                            'approved_by', 'approved_date', 'rejection_reason']

    def get_employee_name(self, obj):
        if obj.employee:
            return obj.employee.get_full_name() or obj.employee.email
        return ''

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['project'].required = False
        self.fields['project'].allow_null = True
        self.fields['employee'].required = False

class ExpenseSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    approved_by_name = serializers.CharField(source='approved_by.email', read_only=True, allow_null=True)

    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at',
                            'approved_by', 'rejection_reason']

    def get_employee_name(self, obj):
        if obj.employee:
            return obj.employee.get_full_name() or obj.employee.email
        return ''

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['project'].required = False
        self.fields['project'].allow_null = True
        self.fields['employee'].required = False

class LedgerEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = LedgerEntry
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_by', 'created_at']

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at']

class InvoiceSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    
    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ['id', 'athens_tenant_id', 'created_at']

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['id', 'created_at']
