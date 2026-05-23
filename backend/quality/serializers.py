from rest_framework import serializers
from django.utils import timezone
from .models import (QualityStandard, QualityTemplate, QualityInspection,
                    QualityDefect, QualityObservation, QualityObservationImage,
                    QualityFixing, QualityActivityLog, SupplierQuality,
                    QualityMetrics, QualityAlert)

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


class QualityObservationImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = QualityObservationImage
        fields = ['id', 'image', 'image_url', 'caption', 'ai_findings', 'uploaded_at']
        read_only_fields = ['id', 'image_url', 'uploaded_at']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        if obj.image:
            return obj.image.url
        return ''


class QualityObservationSerializer(serializers.ModelSerializer):
    images = QualityObservationImageSerializer(many=True, read_only=True)
    fixings = serializers.SerializerMethodField()
    reporter_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    capa_owner_name = serializers.SerializerMethodField()
    image_uploads = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = QualityObservation
        fields = [
            'id', 'observation_id', 'defect_title', 'product_asset', 'department',
            'observation_type', 'inspection_area', 'observation_datetime',
            'reporter', 'reporter_name', 'assigned_to', 'assigned_to_name',
            'severity', 'priority', 'defect_category', 'defect_description',
            'root_cause', 'immediate_action', 'recommended_fix',
            'corrective_action', 'preventive_action', 'ncr_required', 'ncr_number',
            'capa_owner', 'capa_owner_name', 'target_completion_date', 'status',
            'verification_notes', 'quality_risk_score', 'ai_recommendations',
            'ai_analysis', 'voice_transcript', 'translated_text', 'language_detected',
            'media_evidence', 'attachments', 'project', 'images', 'image_uploads',
            'fixings', 'created_at', 'updated_at', 'closed_at', 'closed_by',
        ]
        read_only_fields = [
            'id', 'observation_id', 'reporter', 'reporter_name', 'project',
            'created_at', 'updated_at', 'closed_at', 'closed_by',
        ]

    def get_reporter_name(self, obj):
        if not obj.reporter:
            return ''
        return ' '.join(part for part in [obj.reporter.name, obj.reporter.surname] if part) or obj.reporter.username or obj.reporter.email

    def get_assigned_to_name(self, obj):
        if not obj.assigned_to:
            return ''
        return ' '.join(part for part in [obj.assigned_to.name, obj.assigned_to.surname] if part) or obj.assigned_to.username or obj.assigned_to.email

    def get_capa_owner_name(self, obj):
        if not obj.capa_owner:
            return ''
        return ' '.join(part for part in [obj.capa_owner.name, obj.capa_owner.surname] if part) or obj.capa_owner.username or obj.capa_owner.email

    def get_fixings(self, obj):
        return [{
            'id': fixing.id,
            'fixing_id': fixing.fixing_id,
            'approval_status': fixing.approval_status,
            'assigned_engineer_name': self.get_user_display(fixing.assigned_engineer),
            'due_date': fixing.due_date,
            'completion_date': fixing.completion_date,
        } for fixing in obj.fixings.all()[:5]]

    def get_user_display(self, user):
        if not user:
            return ''
        return ' '.join(part for part in [user.name, user.surname] if part) or user.username or user.email

    def create(self, validated_data):
        image_uploads = validated_data.pop('image_uploads', [])
        observation = super().create(validated_data)
        for image in image_uploads:
            QualityObservationImage.objects.create(observation=observation, image=image)
        return observation

    def update(self, instance, validated_data):
        image_uploads = validated_data.pop('image_uploads', [])
        observation = super().update(instance, validated_data)
        for image in image_uploads:
            QualityObservationImage.objects.create(observation=observation, image=image)
        return observation


class QualityFixingSerializer(serializers.ModelSerializer):
    finding_title = serializers.CharField(source='finding.defect_title', read_only=True)
    finding_code = serializers.CharField(source='finding.observation_id', read_only=True)
    assigned_engineer_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    verified_by_name = serializers.SerializerMethodField()

    class Meta:
        model = QualityFixing
        fields = [
            'id', 'fixing_id', 'finding', 'finding_code', 'finding_title',
            'assigned_engineer', 'assigned_engineer_name', 'corrective_action',
            'preventive_action', 'due_date', 'completion_date', 'verification_notes',
            'approval_status', 'closure_remarks', 'before_evidence', 'after_evidence',
            'escalation_count', 'project', 'created_by', 'created_by_name',
            'verified_by', 'verified_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'fixing_id', 'project', 'created_by', 'created_by_name',
            'verified_by', 'verified_by_name', 'created_at', 'updated_at',
        ]

    def get_user_display(self, user):
        if not user:
            return ''
        return ' '.join(part for part in [user.name, user.surname] if part) or user.username or user.email

    def get_assigned_engineer_name(self, obj):
        return self.get_user_display(obj.assigned_engineer)

    def get_created_by_name(self, obj):
        return self.get_user_display(obj.created_by)

    def get_verified_by_name(self, obj):
        return self.get_user_display(obj.verified_by)


class QualityActivityLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    finding_code = serializers.CharField(source='finding.observation_id', read_only=True)
    fixing_code = serializers.CharField(source='fixing.fixing_id', read_only=True)

    class Meta:
        model = QualityActivityLog
        fields = [
            'id', 'finding', 'finding_code', 'fixing', 'fixing_code', 'action',
            'from_status', 'to_status', 'notes', 'metadata', 'actor',
            'actor_name', 'project', 'created_at',
        ]
        read_only_fields = ['id', 'actor', 'actor_name', 'project', 'created_at']

    def get_actor_name(self, obj):
        if not obj.actor:
            return ''
        return ' '.join(part for part in [obj.actor.name, obj.actor.surname] if part) or obj.actor.username or obj.actor.email

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
