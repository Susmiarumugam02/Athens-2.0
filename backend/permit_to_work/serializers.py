from rest_framework import serializers
from .models import (
    PermitType, Permit, WorkflowTemplate, WorkflowInstance, WorkflowStep,
    PermitExtension, DigitalSignature, PermitAudit, GasReading,
    IsolationPointLibrary, PermitIsolationPoint, CloseoutChecklistTemplate, PermitCloseout
)
from authentication.models import User


class UserMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'surname']


class PermitTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermitType
        fields = '__all__'


class PermitSerializer(serializers.ModelSerializer):
    permit_type_name = serializers.CharField(source='permit_type.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    
    class Meta:
        model = Permit
        fields = '__all__'
        read_only_fields = ['permit_number', 'qr_code', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        # Auto-set tenant from user
        user = self.context['request'].user
        validated_data['athens_tenant_id'] = user.athens_tenant_id
        validated_data['created_by'] = user
        
        # Generate permit number
        from datetime import datetime
        year = datetime.now().year
        count = Permit.objects.filter(created_at__year=year).count() + 1
        validated_data['permit_number'] = f"PTW-{year}-{count:06d}"
        
        permit = super().create(validated_data)
        permit.calculate_risk_score()
        permit.save()
        return permit


class WorkflowTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowTemplate
        fields = '__all__'


class WorkflowStepSerializer(serializers.ModelSerializer):
    assignee_name = serializers.CharField(source='assignee.name', read_only=True)
    
    class Meta:
        model = WorkflowStep
        fields = '__all__'


class WorkflowInstanceSerializer(serializers.ModelSerializer):
    steps = WorkflowStepSerializer(many=True, read_only=True)
    
    class Meta:
        model = WorkflowInstance
        fields = '__all__'


class PermitExtensionSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(source='requested_by.name', read_only=True)
    
    class Meta:
        model = PermitExtension
        fields = '__all__'
        read_only_fields = ['requested_at', 'approved_at']


class DigitalSignatureSerializer(serializers.ModelSerializer):
    signatory_name = serializers.CharField(source='signatory.name', read_only=True)
    
    class Meta:
        model = DigitalSignature
        fields = '__all__'
        read_only_fields = ['signed_at']


class PermitAuditSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    
    class Meta:
        model = PermitAudit
        fields = '__all__'
        read_only_fields = ['timestamp']


class GasReadingSerializer(serializers.ModelSerializer):
    tested_by_name = serializers.CharField(source='tested_by.name', read_only=True)
    
    class Meta:
        model = GasReading
        fields = '__all__'
        read_only_fields = ['tested_at']


class IsolationPointLibrarySerializer(serializers.ModelSerializer):
    class Meta:
        model = IsolationPointLibrary
        fields = '__all__'
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['athens_tenant_id'] = user.athens_tenant_id
        return super().create(validated_data)


class PermitIsolationPointSerializer(serializers.ModelSerializer):
    point_code = serializers.CharField(source='point.point_code', read_only=True)
    
    class Meta:
        model = PermitIsolationPoint
        fields = '__all__'
        read_only_fields = ['created_at']


class CloseoutChecklistTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CloseoutChecklistTemplate
        fields = '__all__'


class PermitCloseoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermitCloseout
        fields = '__all__'
        read_only_fields = ['created_at']
