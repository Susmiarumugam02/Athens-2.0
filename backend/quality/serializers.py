from rest_framework import serializers
from django.utils import timezone
from .models import (QualityStandard, QualityTemplate, QualityInspection, 
                    QualityDefect, SupplierQuality, QualityMetrics, QualityAlert)

class QualityStandardSerializer(serializers.ModelSerializer):
    class Meta:
        model = QualityStandard
        fields = ['id', 'name', 'version', 'description', 'requirements', 'is_active']

class QualityTemplateSerializer(serializers.ModelSerializer):
    quality_standards = QualityStandardSerializer(many=True, read_only=True)
    
    class Meta:
        model = QualityTemplate
        fields = ['id', 'template_id', 'name', 'version', 'industry', 'inspection_type', 
                 'criticality', 'description', 'scope', 'prerequisites', 'quality_standards',
                 'compliance_requirements', 'checklist_items', 'test_procedures', 
                 'measurement_parameters', 'acceptance_criteria', 'failure_modes',
                 'risk_matrix', 'mitigation_strategies', 'required_roles', 'approval_workflow',
                 'escalation_rules', 'required_documents', 'photo_requirements',
                 'signature_requirements', 'is_active', 'is_certified', 'certification_date',
                 'next_review_date', 'created_at', 'created_by', 'approved_by', 'approved_at']
        read_only_fields = ['template_id', 'created_by', 'created_at', 'approved_by', 'approved_at']
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        # Generate template_id if not provided
        if 'template_id' not in validated_data:
            industry_code = validated_data['industry'][:3].upper()
            inspection_code = validated_data['inspection_type'][:3].upper()
            timestamp = timezone.now().strftime('%y%m%d%H%M')
            validated_data['template_id'] = f"QT_{industry_code}_{inspection_code}_{timestamp}"
        return super().create(validated_data)

class QualityDefectSerializer(serializers.ModelSerializer):
    inspection_number = serializers.CharField(source='inspection.inspection_number', read_only=True)
    
    class Meta:
        model = QualityDefect
        fields = ['id', 'defect_id', 'inspection', 'inspection_number', 'defect_code', 
                 'category', 'title', 'description', 'severity', 'location_details',
                 'affected_quantity', 'root_cause', 'contributing_factors', 'failure_mode',
                 'immediate_action', 'corrective_action', 'preventive_action', 'action_owner',
                 'target_completion_date', 'status', 'is_resolved', 'resolution_date',
                 'resolved_by', 'verification_notes', 'cost_impact', 'schedule_impact',
                 'customer_impact', 'photos', 'attachments', 'created_at', 'updated_at']
        read_only_fields = ['defect_id', 'created_at', 'updated_at']

class QualityInspectionSerializer(serializers.ModelSerializer):
    defects = QualityDefectSerializer(many=True, read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)
    inspector_name = serializers.CharField(source='inspector.get_full_name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.supplier_name', read_only=True)
    
    class Meta:
        model = QualityInspection
        fields = ['id', 'inspection_id', 'inspection_number', 'template', 'template_name',
                 'project_id', 'work_order_number', 'purchase_order_number', 'reference_number',
                 'batch_number', 'serial_numbers', 'component_type', 'component_model',
                 'manufacturer', 'supplier', 'supplier_name', 'quantity', 'unit_of_measure',
                 'latitude', 'longitude', 'location_name', 'site_conditions', 'priority',
                 'status', 'overall_result', 'checklist_results', 'measurement_data',
                 'test_results', 'deviation_records', 'quality_score', 'defect_count',
                 'critical_defect_count', 'rework_count', 'scheduled_date', 'planned_duration',
                 'started_at', 'completed_at', 'actual_duration', 'inspector', 'inspector_name',
                 'supervisor', 'quality_manager', 'inspector_signature', 'supervisor_signature',
                 'customer_signature', 'attachments', 'photos', 'certificates',
                 'calibration_records', 'compliance_status', 'traceability_data',
                 'inspector_notes', 'supervisor_comments', 'customer_feedback',
                 'defects', 'created_at', 'updated_at']
        read_only_fields = ['inspection_id', 'inspection_number', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        if 'inspector' not in validated_data:
            validated_data['inspector'] = self.context['request'].user
        # Generate inspection_number if not provided
        if 'inspection_number' not in validated_data:
            validated_data['inspection_number'] = f"INS_{timezone.now().strftime('%Y%m%d%H%M%S')}"
        return super().create(validated_data)

class SupplierQualitySerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierQuality
        fields = ['id', 'supplier_id', 'supplier_name', 'supplier_code', 'supplier_type',
                 'industry', 'contact_person', 'email', 'phone', 'address', 'website',
                 'quality_score', 'delivery_score', 'service_score', 'overall_rating',
                 'total_orders', 'on_time_deliveries', 'quality_incidents', 'defect_rate',
                 'certification_status', 'last_audit_date', 'next_audit_date', 'audit_score',
                 'audit_findings', 'certifications', 'compliance_records', 'risk_assessment',
                 'annual_revenue', 'employee_count', 'years_in_business', 'is_approved',
                 'is_preferred', 'approval_date', 'approved_by', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['supplier_id', 'created_at', 'updated_at']

class QualityMetricsSerializer(serializers.ModelSerializer):
    class Meta:
        model = QualityMetrics
        fields = ['id', 'metric_date', 'total_inspections', 'passed_inspections',
                 'failed_inspections', 'pass_rate', 'total_defects', 'critical_defects',
                 'defect_density', 'supplier_performance', 'prevention_costs',
                 'appraisal_costs', 'internal_failure_costs', 'external_failure_costs']

class QualityAlertSerializer(serializers.ModelSerializer):
    inspection_number = serializers.CharField(source='inspection.inspection_number', read_only=True)
    supplier_name = serializers.CharField(source='supplier.supplier_name', read_only=True)
    
    class Meta:
        model = QualityAlert
        fields = ['id', 'alert_type', 'severity', 'title', 'description', 'inspection',
                 'inspection_number', 'supplier', 'supplier_name', 'is_acknowledged',
                 'acknowledged_by', 'acknowledged_at', 'created_at']
        read_only_fields = ['created_at']