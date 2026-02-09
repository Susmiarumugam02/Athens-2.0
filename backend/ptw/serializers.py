from rest_framework import serializers
from django.db import models
from .models import (
    Permit, PermitType, PermitApproval, PermitWorker, PermitExtension, 
    PermitAudit, WorkflowTemplate, WorkflowInstance, WorkflowStep,
    HazardLibrary, PermitHazard, GasReading, PermitPhoto, DigitalSignature,
    EscalationRule, NotificationTemplate, SystemIntegration, ComplianceReport,
    CloseoutChecklistTemplate, PermitCloseout, IsolationPointLibrary, PermitIsolationPoint,
    PermitToolboxTalk, PermitToolboxTalkAttendance
)
from worker.serializers import WorkerSerializer
from authentication.models import CustomUser
from .status_utils import normalize_permit_status

class PermitTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermitType
        fields = '__all__'

class UserMinimalSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    # Alias fields for frontend compatibility
    first_name = serializers.CharField(source='name', read_only=True)
    last_name = serializers.CharField(source='surname', read_only=True)
    usertype = serializers.CharField(source='user_type', read_only=True)
    
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'name', 'surname', 'admin_type', 'grade', 'user_type', 'full_name',
                  'first_name', 'last_name', 'usertype']
    
    def get_full_name(self, obj):
        return f"{obj.name or ''} {obj.surname or ''}".strip()

class HazardLibrarySerializer(serializers.ModelSerializer):
    class Meta:
        model = HazardLibrary
        fields = '__all__'

class PermitHazardSerializer(serializers.ModelSerializer):
    hazard_details = HazardLibrarySerializer(source='hazard', read_only=True)
    
    class Meta:
        model = PermitHazard
        fields = ['id', 'hazard', 'hazard_details', 'likelihood', 'severity', 
                  'risk_score', 'control_measures_applied', 'residual_risk']

class GasReadingSerializer(serializers.ModelSerializer):
    tested_by_details = UserMinimalSerializer(source='tested_by', read_only=True)
    
    class Meta:
        model = GasReading
        fields = ['id', 'permit', 'gas_type', 'reading', 'unit', 'acceptable_range', 
                  'status', 'tested_by', 'tested_by_details', 'tested_at', 
                  'equipment_used', 'calibration_date']
        read_only_fields = ['tested_at', 'tested_by']

class PermitPhotoSerializer(serializers.ModelSerializer):
    taken_by_details = UserMinimalSerializer(source='taken_by', read_only=True)
    
    class Meta:
        model = PermitPhoto
        fields = ['id', 'photo', 'photo_type', 'description', 'taken_by', 
                  'taken_by_details', 'taken_at', 'gps_location', 'offline_id']
        read_only_fields = ['taken_at']

class DigitalSignatureSerializer(serializers.ModelSerializer):
    signatory_details = UserMinimalSerializer(source='signatory', read_only=True)
    # Normalized fields for standardized signature appearance
    signer_name = serializers.SerializerMethodField()
    employee_id = serializers.SerializerMethodField()
    designation = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    company_logo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = DigitalSignature
        fields = ['id', 'signature_type', 'signatory', 'signatory_details', 
                  'signature_payload', 'payload_version', 'signed_at', 'ip_address', 'device_info',
                  'signer_name', 'employee_id', 'designation', 'department', 'company_logo_url']
        read_only_fields = ['signed_at']
    
    def to_representation(self, instance):
        """Ensure only JSON payload fields are returned - NO legacy image fields"""
        data = super().to_representation(instance)
        
        # HARD REMOVAL: Never return legacy fields
        legacy_fields = ['signature_data', 'signature_image_url', 'signature_render_mode', 
                        'card_image', 'signature_image', 'card_url', 'template_url']
        for field in legacy_fields:
            data.pop(field, None)
        
        return data
    
    def get_signer_name(self, obj):
        user = obj.signatory
        if not user:
            return 'Unknown'
        full_name = f"{user.name or ''} {user.surname or ''}".strip()
        return full_name or user.username
    
    def get_employee_id(self, obj):
        user = obj.signatory
        if not user:
            return None
        # Try UserDetail first, then AdminDetail
        try:
            if hasattr(user, 'user_detail') and user.user_detail.employee_id:
                return user.user_detail.employee_id
        except:
            pass
        return getattr(user, 'employee_id', None)
    
    def get_designation(self, obj):
        user = obj.signatory
        return getattr(user, 'designation', None) if user else None
    
    def get_department(self, obj):
        user = obj.signatory
        return getattr(user, 'department', None) if user else None
    
    def get_company_logo_url(self, obj):
        user = obj.signatory
        if not user:
            return None
        
        request = self.context.get('request')
        if not request:
            return None
        
        # Use existing logo hierarchy logic
        logo = self._get_company_logo(user)
        if logo:
            return request.build_absolute_uri(logo.url)
        return None
    
    def _get_company_logo(self, user):
        """Get individual user's company logo (not tenant logo)"""
        from authentication.models import CustomUser
        
        if not user:
            return None
        
        # Try AdminDetail first (user's own logo)
        try:
            if hasattr(user, 'admin_detail') and user.admin_detail and user.admin_detail.logo:
                return user.admin_detail.logo
        except Exception:
            pass
        
        # Try CompanyDetail next (user's company logo)
        try:
            if hasattr(user, 'company_detail') and user.company_detail and user.company_detail.company_logo:
                return user.company_detail.company_logo
        except Exception:
            pass
        
        # Find users from same company based on company_name
        if user.company_name:
            try:
                company_user = CustomUser.objects.filter(
                    company_name=user.company_name
                ).exclude(id=user.id).first()
                
                if company_user:
                    # Try company user's AdminDetail
                    if hasattr(company_user, 'admin_detail') and company_user.admin_detail and company_user.admin_detail.logo:
                        return company_user.admin_detail.logo
                    # Try company user's CompanyDetail
                    if hasattr(company_user, 'company_detail') and company_user.company_detail and company_user.company_detail.company_logo:
                        return company_user.company_detail.company_logo
            except Exception:
                pass
        
        return None


class PermitWorkerSerializer(serializers.ModelSerializer):
    worker_details = WorkerSerializer(source='worker', read_only=True)
    assigned_by_details = UserMinimalSerializer(source='assigned_by', read_only=True)
    
    class Meta:
        model = PermitWorker
        fields = ['id', 'worker', 'worker_details', 'assigned_by', 'assigned_by_details',
                  'assigned_at', 'role', 'competency_verified', 'training_valid', 'medical_clearance']
        read_only_fields = ['assigned_at']


class PermitToolboxTalkSerializer(serializers.ModelSerializer):
    conducted_by_details = UserMinimalSerializer(source='conducted_by', read_only=True)

    class Meta:
        model = PermitToolboxTalk
        fields = [
            'id', 'permit', 'title', 'conducted_at', 'conducted_by', 'conducted_by_details',
            'document', 'url', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class PermitToolboxTalkAttendanceSerializer(serializers.ModelSerializer):
    permit_worker_details = PermitWorkerSerializer(source='permit_worker', read_only=True)

    class Meta:
        model = PermitToolboxTalkAttendance
        fields = [
            'id', 'tbt', 'permit_worker', 'permit_worker_details',
            'acknowledged', 'acknowledged_at', 'ack_signature'
        ]

class AssignVerifierSerializer(serializers.Serializer):
    verifier_id = serializers.IntegerField(required=False)
    verifier = serializers.IntegerField(required=False)

    def validate(self, attrs):
        verifier_id = attrs.get('verifier_id') or attrs.get('verifier')
        if not verifier_id:
            raise serializers.ValidationError({'verifier_id': 'Verifier ID is required.'})
        attrs['verifier_id'] = verifier_id
        return attrs

class WorkflowStepSerializer(serializers.ModelSerializer):
    assignee_details = UserMinimalSerializer(source='assignee', read_only=True)
    
    class Meta:
        model = WorkflowStep
        fields = ['id', 'step_id', 'name', 'step_type', 'assignee', 'assignee_details',
                  'role', 'status', 'order', 'escalation_time', 'required', 'conditions',
                  'completed_at', 'comments', 'signature', 'attachments']
        read_only_fields = ['completed_at']

class WorkflowTemplateSerializer(serializers.ModelSerializer):
    permit_type_details = PermitTypeSerializer(source='permit_type', read_only=True)
    
    class Meta:
        model = WorkflowTemplate
        fields = ['id', 'name', 'permit_type', 'permit_type_details', 'risk_level',
                  'steps', 'auto_escalation', 'parallel_processing', 'is_active', 'created_at']
        read_only_fields = ['created_at']

class WorkflowInstanceSerializer(serializers.ModelSerializer):
    template_details = WorkflowTemplateSerializer(source='template', read_only=True)
    steps = WorkflowStepSerializer(many=True, read_only=True)
    
    class Meta:
        model = WorkflowInstance
        fields = ['id', 'template', 'template_details', 'current_step', 'status',
                  'started_at', 'completed_at', 'steps']
        read_only_fields = ['started_at', 'completed_at']

class PermitApprovalSerializer(serializers.ModelSerializer):
    approver_details = UserMinimalSerializer(source='approver', read_only=True)
    escalated_from_details = UserMinimalSerializer(source='escalated_from', read_only=True)
    delegated_to_details = UserMinimalSerializer(source='delegated_to', read_only=True)
    
    class Meta:
        model = PermitApproval
        fields = ['id', 'approver', 'approver_details', 'approval_level', 'action',
                  'approved', 'comments', 'conditions', 'timestamp', 'escalated_from',
                  'escalated_from_details', 'delegated_to', 'delegated_to_details']
        read_only_fields = ['timestamp']

class PermitExtensionSerializer(serializers.ModelSerializer):
    requested_by_details = UserMinimalSerializer(source='requested_by', read_only=True)
    approved_by_details = UserMinimalSerializer(source='approved_by', read_only=True)
    
    class Meta:
        model = PermitExtension
        fields = ['id', 'requested_by', 'requested_by_details', 'requested_at',
                  'original_end_time', 'new_end_time', 'extension_hours', 'reason',
                  'justification', 'status', 'approved_by', 'approved_by_details',
                  'approved_at', 'comments', 'affects_work_nature', 'new_work_nature',
                  'safety_reassessment_required', 'safety_reassessment_completed',
                  'additional_safety_measures']
        read_only_fields = ['requested_at', 'approved_at', 'extension_hours', 'affects_work_nature']
    
    def validate(self, attrs):
        """Validate extension does not exceed max_validity_extensions"""
        from .validators import validate_extension_limit
        
        permit = attrs.get('permit') or (self.instance.permit if self.instance else None)
        
        if permit and not self.instance:  # Only check on create, not update
            validate_extension_limit(permit)
        
        return attrs

# Removed WorkTimeExtensionSerializer - time management handled centrally

class PermitAuditSerializer(serializers.ModelSerializer):
    user_details = UserMinimalSerializer(source='user', read_only=True)

    class Meta:
        model = PermitAudit
        fields = ['id', 'action', 'user', 'user_details', 'timestamp', 'comments',
                  'old_values', 'new_values', 'ip_address', 'user_agent']
        read_only_fields = ['timestamp']

class EscalationRuleSerializer(serializers.ModelSerializer):
    permit_type_details = PermitTypeSerializer(source='permit_type', read_only=True)
    
    class Meta:
        model = EscalationRule
        fields = ['id', 'permit_type', 'permit_type_details', 'step_name',
                  'time_limit_hours', 'escalate_to_role', 'notification_method', 'is_active']

class NotificationTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationTemplate
        fields = '__all__'

class SystemIntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemIntegration
        fields = '__all__'

class ComplianceReportSerializer(serializers.ModelSerializer):
    generated_by_details = UserMinimalSerializer(source='generated_by', read_only=True)
    
    class Meta:
        model = ComplianceReport
        fields = ['id', 'name', 'report_type', 'generated_by', 'generated_by_details',
                  'generated_at', 'date_from', 'date_to', 'data', 'file_path']
        read_only_fields = ['generated_at']

class PermitSerializer(serializers.ModelSerializer):
    # Related object details
    created_by_details = UserMinimalSerializer(source='created_by', read_only=True)
    issuer_details = UserMinimalSerializer(source='issuer', read_only=True)
    receiver_details = UserMinimalSerializer(source='receiver', read_only=True)
    approver_details = UserMinimalSerializer(source='approver', read_only=True)
    area_incharge_details = UserMinimalSerializer(source='area_incharge', read_only=True)
    department_head_details = UserMinimalSerializer(source='department_head', read_only=True)
    isolation_verified_by_details = UserMinimalSerializer(source='isolation_verified_by', read_only=True)
    permit_type_details = PermitTypeSerializer(source='permit_type', read_only=True)
    approved_by_details = UserMinimalSerializer(source='approved_by', read_only=True)
    verifier_details = UserMinimalSerializer(source='verifier', read_only=True)
    
    # Tenant/Company information
    tenant_company_logo_url = serializers.SerializerMethodField()
    
    # Related collections
    assigned_workers = PermitWorkerSerializer(many=True, read_only=True)
    identified_hazards = PermitHazardSerializer(many=True, read_only=True)
    gas_readings = GasReadingSerializer(many=True, read_only=True)
    photos = PermitPhotoSerializer(many=True, read_only=True)
    signatures = DigitalSignatureSerializer(many=True, read_only=True)
    signatures_by_type = serializers.SerializerMethodField()
    approvals = PermitApprovalSerializer(many=True, read_only=True)
    extensions = PermitExtensionSerializer(many=True, read_only=True)
    # Removed time_extensions field
    audit_logs = PermitAuditSerializer(many=True, read_only=True)
    audit_trail = PermitAuditSerializer(many=True, read_only=True, source='audit_logs')  # Alias for frontend
    workflow = WorkflowInstanceSerializer(read_only=True)
    toolbox_talk = PermitToolboxTalkSerializer(read_only=True)
    toolbox_talk_attendance = serializers.SerializerMethodField()
    
    # Work time computed fields
    work_hours_display = serializers.SerializerMethodField()
    is_within_work_hours = serializers.SerializerMethodField()
    
    # Computed fields
    is_expired = serializers.SerializerMethodField()
    duration_hours = serializers.SerializerMethodField()
    risk_color = serializers.SerializerMethodField()
    status_color = serializers.SerializerMethodField()
    
    class Meta:
        model = Permit
        fields = [
            # Basic Information
            'id', 'permit_number', 'permit_type', 'permit_type_details', 'title',
            'description', 'work_order_id',
            
            # Location Information
            'location', 'gps_coordinates', 'site_layout',
            
            # Time Information
            'planned_start_time', 'planned_end_time', 'actual_start_time', 'actual_end_time',
            
            # Work Nature
            'work_nature',
            
            # People Information
            'created_by', 'created_by_details', 'issuer', 'issuer_details',
            'receiver', 'receiver_details',
            
            # Contact Information
            'issuer_designation', 'issuer_department', 'issuer_contact',
            'receiver_designation', 'receiver_department', 'receiver_contact',
            
            # Status and Priority
            'status', 'priority', 'current_approval_level',
            
            # Risk Assessment
            'risk_assessment_id', 'risk_assessment_completed', 'probability',
            'severity', 'risk_score', 'risk_level',
            
            # Safety Information
            'control_measures', 'ppe_requirements', 'special_instructions', 'safety_checklist',
            
            # Isolation Requirements
            'requires_isolation', 'isolation_details', 'isolation_verified_by',
            'isolation_verified_by_details', 'isolation_certificate',
            
            # Authorization
            'approver', 'approver_details', 'area_incharge', 'area_incharge_details',
            'department_head', 'department_head_details',
            
            # Documentation
            'work_procedure', 'method_statement', 'risk_assessment_doc',
            
            # QR Code and Mobile
            'qr_code', 'mobile_created', 'offline_id',
            
            # Timestamps
            'created_at', 'updated_at', 'submitted_at', 'approved_at',
            
            # Approval and Verification tracking
            'approved_by', 'approved_by_details', 'approval_comments',
            'verifier', 'verifier_details', 'verified_at', 'verification_comments',
            
            # Project
            'project',
            
            # Compliance
            'compliance_standards',
            'permit_parameters',
            'other_hazards',
            
            # Related Collections
            'assigned_workers', 'identified_hazards', 'gas_readings', 'photos',
            'signatures', 'signatures_by_type', 'approvals', 'extensions', 'audit_logs', 'audit_trail',
            'workflow', 'toolbox_talk', 'toolbox_talk_attendance',
            
            # Computed Fields
            'is_expired', 'duration_hours', 'risk_color', 'status_color',
            'work_hours_display', 'is_within_work_hours', 'tenant_company_logo_url'
        ]
        read_only_fields = [
            'id', 'permit_number', 'created_by', 'created_at', 'updated_at',
            'qr_code', 'risk_score', 'audit_logs', 'audit_trail'
        ]
    
    def get_is_expired(self, obj):
        return obj.is_expired()
    
    def get_duration_hours(self, obj):
        return obj.get_duration_hours()
    
    def get_risk_color(self, obj):
        colors = {
            'low': '#52c41a',
            'medium': '#faad14',
            'high': '#fa8c16',
            'extreme': '#ff4d4f'
        }
        return colors.get(obj.risk_level, '#d9d9d9')
    
    def get_status_color(self, obj):
        colors = {
            'draft': '#d9d9d9',
            'submitted': '#1890ff',
            'pending_verification': '#13c2c2',
            'under_review': '#faad14',
            'pending_approval': '#fa8c16',
            'approved': '#52c41a',
            'active': '#52c41a',
            'suspended': '#fa8c16',
            'completed': '#722ed1',
            'cancelled': '#8c8c8c',
            'expired': '#ff4d4f',
            'rejected': '#ff4d4f'
        }
        return colors.get(obj.status, '#d9d9d9')
    
    def get_work_hours_display(self, obj):
        return obj.get_work_hours_display()
    
    def get_is_within_work_hours(self, obj):
        return obj.is_within_work_hours()
    
    def get_tenant_company_logo_url(self, obj):
        """Get tenant company logo URL (main company hosting the system)"""
        request = self.context.get('request')
        if not request:
            return None
        
        from authentication.models import CustomUser
        from control_plane.models import TenantCompany
        
        # Try to get tenant logo from TenantCompany first
        if obj.project and obj.project.athens_tenant_id:
            try:
                tenant_company = TenantCompany.objects.get(id=obj.project.athens_tenant_id)
                # TenantCompany doesn't have logo field, so look for master admin
                master_admin = CustomUser.objects.filter(
                    admin_type='master',
                    athens_tenant_id=obj.project.athens_tenant_id
                ).first()
                
                if master_admin:
                    # Try master's AdminDetail
                    try:
                        if hasattr(master_admin, 'admin_detail') and master_admin.admin_detail and master_admin.admin_detail.logo:
                            return request.build_absolute_uri(master_admin.admin_detail.logo.url)
                    except Exception:
                        pass
                    
                    # Try master's CompanyDetail
                    try:
                        if hasattr(master_admin, 'company_detail') and master_admin.company_detail and master_admin.company_detail.company_logo:
                            return request.build_absolute_uri(master_admin.company_detail.company_logo.url)
                    except Exception:
                        pass
            except Exception:
                pass
        
        # Fallback: Look for Prozeal tenant company logo
        tenant_user = CustomUser.objects.filter(
            company_name__icontains='Prozeal Green Energy Limited'
        ).first()
        
        if tenant_user:
            try:
                if hasattr(tenant_user, 'admin_detail') and tenant_user.admin_detail and tenant_user.admin_detail.logo:
                    return request.build_absolute_uri(tenant_user.admin_detail.logo.url)
            except Exception:
                pass
        
        return None

    def get_signatures_by_type(self, obj):
        """Get signatures organized by type - JSON-only, no legacy image fields"""
        serializer = DigitalSignatureSerializer
        signatures = list(obj.signatures.all())
        by_type = {}
        for sig in signatures:
            by_type.setdefault(sig.signature_type, []).append(sig)

        def pick_signature(*types):
            for signature_type in types:
                items = by_type.get(signature_type) or []
                if items:
                    sig_data = serializer(items[0], context=self.context).data
                    # ENFORCE JSON-ONLY: Remove any legacy fields that might slip through
                    legacy_fields = ['signature_data', 'signature_image_url', 'signature_render_mode', 
                                   'card_image', 'signature_image', 'card_url', 'template_url']
                    for field in legacy_fields:
                        sig_data.pop(field, None)
                    return sig_data
            return None

        return {
            'requestor': pick_signature('requestor', 'issuer'),
            'verifier': pick_signature('verifier', 'receiver'),
            'approver': pick_signature('approver'),
            'issuer': pick_signature('issuer'),
            'receiver': pick_signature('receiver'),
            'safety_officer': pick_signature('safety_officer'),
            'area_manager': pick_signature('area_manager'),
            'witness': pick_signature('witness'),
        }

    def get_toolbox_talk_attendance(self, obj):
        tbt = getattr(obj, 'toolbox_talk', None)
        if not tbt:
            return []
        attendance = tbt.attendance.select_related('permit_worker', 'permit_worker__worker')
        return PermitToolboxTalkAttendanceSerializer(attendance, many=True, context=self.context).data

class PermitListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for permit lists"""
    permit_type_details = PermitTypeSerializer(source='permit_type', read_only=True)
    created_by_details = UserMinimalSerializer(source='created_by', read_only=True)
    issuer_details = UserMinimalSerializer(source='issuer', read_only=True)
    receiver_details = UserMinimalSerializer(source='receiver', read_only=True)
    verifier_details = UserMinimalSerializer(source='verifier', read_only=True)
    
    # Computed fields
    is_expired = serializers.SerializerMethodField()
    risk_color = serializers.SerializerMethodField()
    status_color = serializers.SerializerMethodField()
    workers_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Permit
        fields = [
            'id', 'permit_number', 'permit_type', 'permit_type_details',
            'title', 'location', 'status', 'priority', 'risk_level',
            'planned_start_time', 'planned_end_time', 'created_at',
            'created_by', 'created_by_details', 'issuer', 'issuer_details',
            'receiver', 'receiver_details', 'verifier', 'verifier_details', 
            'is_expired', 'risk_color', 'status_color', 'workers_count'
        ]
    
    def get_is_expired(self, obj):
        return obj.is_expired()
    
    def get_risk_color(self, obj):
        colors = {
            'low': '#52c41a',
            'medium': '#faad14',
            'high': '#fa8c16',
            'extreme': '#ff4d4f'
        }
        return colors.get(obj.risk_level, '#d9d9d9')
    
    def get_status_color(self, obj):
        colors = {
            'draft': '#d9d9d9',
            'submitted': '#1890ff',
            'pending_verification': '#13c2c2',
            'under_review': '#faad14',
            'pending_approval': '#fa8c16',
            'approved': '#52c41a',
            'active': '#52c41a',
            'suspended': '#fa8c16',
            'completed': '#722ed1',
            'cancelled': '#8c8c8c',
            'expired': '#ff4d4f',
            'rejected': '#ff4d4f'
        }
        return colors.get(obj.status, '#d9d9d9')
    
    def get_workers_count(self, obj):
        return obj.assigned_workers.count()
    
    def get_is_expired(self, obj):
        return obj.is_expired()
    
    def get_risk_color(self, obj):
        colors = {
            'low': '#52c41a',
            'medium': '#faad14',
            'high': '#fa8c16',
            'extreme': '#ff4d4f'
        }
        return colors.get(obj.risk_level, '#d9d9d9')
    
    def get_status_color(self, obj):
        colors = {
            'draft': '#d9d9d9',
            'submitted': '#1890ff',
            'pending_verification': '#13c2c2',
            'under_review': '#faad14',
            'pending_approval': '#fa8c16',
            'approved': '#52c41a',
            'active': '#52c41a',
            'suspended': '#fa8c16',
            'completed': '#722ed1',
            'cancelled': '#8c8c8c',
            'expired': '#ff4d4f',
            'rejected': '#ff4d4f'
        }
        return colors.get(obj.status, '#d9d9d9')
    
    # Removed extension-related methods

class PermitCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating permits"""
    
    class Meta:
        model = Permit
        fields = [
            'permit_type', 'title', 'description', 'work_order_id',
            'location', 'gps_coordinates', 'site_layout',
            'planned_start_time', 'planned_end_time', 'work_nature',
            'priority', 'risk_assessment_id', 'risk_assessment_completed',
            'probability', 'severity', 'control_measures', 'ppe_requirements',
            'special_instructions', 'safety_checklist', 'requires_isolation',
            'isolation_details', 'isolation_certificate',
            'work_procedure', 'method_statement', 'risk_assessment_doc',
            'mobile_created', 'offline_id', 'compliance_standards', 'permit_parameters',
            'other_hazards', 'verifier', 'status'
        ]
    
    def validate_permit_type(self, value):
        """Validate permit type exists and is active"""
        if not value:
            raise serializers.ValidationError("Please select a permit type")
        
        # If value is already a PermitType object (DRF converted it)
        if isinstance(value, PermitType):
            permit_type = value
        else:
            # If it's still an ID, get the object
            try:
                permit_type = PermitType.objects.get(id=int(value))
            except (PermitType.DoesNotExist, ValueError, TypeError):
                # Get available permit types for better error message
                available_types = list(PermitType.objects.filter(is_active=True).values_list('id', 'name'))
                raise serializers.ValidationError(
                    f"Invalid permit type ID '{value}'. Available permit types: {available_types[:5]}..."
                )
        
        if not permit_type.is_active:
            raise serializers.ValidationError("Selected permit type is not active")
        
        return permit_type
    
    def validate(self, attrs):
        """Cross-field validation"""
        # Ensure permit_type is provided
        if not attrs.get('permit_type'):
            raise serializers.ValidationError({
                'permit_type': 'Please select a permit type'
            })
        
        # Validate time fields
        start_time = attrs.get('planned_start_time')
        end_time = attrs.get('planned_end_time')
        
        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError({
                'planned_end_time': 'End time must be after start time'
            })
        
        return attrs
    
    def create(self, validated_data):
        # Set created_by to current user
        validated_data['created_by'] = self.context['request'].user
        
        # Set receiver = creator (requestor = receiver = creator)
        validated_data['receiver'] = self.context['request'].user
        
        # Set project from user's project
        user_project = getattr(self.context['request'].user, 'project', None)
        if user_project:
            validated_data['project'] = user_project
        
        return super().create(validated_data)

class PermitStatusUpdateSerializer(serializers.ModelSerializer):
    """Serializer for status updates only"""
    comments = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = Permit
        fields = ['status', 'comments']
    
    def validate_status(self, value):
        normalized_status = normalize_permit_status(value)
        instance = self.instance
        if instance and not instance.can_transition_to(normalized_status):
            raise serializers.ValidationError(
                f"Cannot transition from {instance.status} to {normalized_status}"
            )
        return normalized_status
    
    def validate(self, attrs):
        """Validate permit requirements before approve/activate/complete"""
        from .validators import (validate_permit_requirements, validate_closeout_completion, 
                                 validate_structured_isolation, validate_deisolation_completion)
        
        new_status = normalize_permit_status(attrs.get('status'))
        
        # Enforce requirements when transitioning to approved or active
        if new_status in ['approved', 'active'] and self.instance:
            action = 'approval' if new_status == 'approved' else 'activation'
            validate_permit_requirements(self.instance, action=action)
            validate_structured_isolation(self.instance, action=action)
        
        # Enforce closeout and de-isolation completion when transitioning to completed
        if new_status == 'completed' and self.instance:
            validate_closeout_completion(self.instance)
            validate_deisolation_completion(self.instance)
        
        return attrs

# Analytics and Reporting Serializers
class PermitAnalyticsSerializer(serializers.Serializer):
    total_permits = serializers.IntegerField()
    active_permits = serializers.IntegerField()
    completed_permits = serializers.IntegerField()
    overdue_permits = serializers.IntegerField()
    average_processing_time = serializers.FloatField()
    compliance_rate = serializers.FloatField()
    incident_rate = serializers.FloatField()
    risk_distribution = serializers.DictField()
    status_distribution = serializers.DictField()
    monthly_trends = serializers.ListField()

class DashboardStatsSerializer(serializers.Serializer):
    permits_today = serializers.IntegerField()
    permits_this_week = serializers.IntegerField()
    permits_this_month = serializers.IntegerField()
    pending_approvals = serializers.IntegerField()
    overdue_permits = serializers.IntegerField()
    high_risk_permits = serializers.IntegerField()
    recent_permits = PermitListSerializer(many=True)
    risk_trends = serializers.ListField()
    compliance_score = serializers.FloatField()

class CloseoutChecklistTemplateSerializer(serializers.ModelSerializer):
    permit_type_details = PermitTypeSerializer(source='permit_type', read_only=True)
    
    class Meta:
        model = CloseoutChecklistTemplate
        fields = ['id', 'permit_type', 'permit_type_details', 'name', 'risk_level', 
                  'is_active', 'items', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class PermitCloseoutSerializer(serializers.ModelSerializer):
    template_details = CloseoutChecklistTemplateSerializer(source='template', read_only=True)
    completed_by_details = UserMinimalSerializer(source='completed_by', read_only=True)
    missing_items = serializers.SerializerMethodField()
    is_complete = serializers.SerializerMethodField()
    
    class Meta:
        model = PermitCloseout
        fields = ['id', 'permit', 'template', 'template_details', 'checklist', 
                  'completed', 'completed_at', 'completed_by', 'completed_by_details',
                  'remarks', 'missing_items', 'is_complete', 'created_at', 'updated_at']
        read_only_fields = ['permit', 'completed', 'completed_at', 'completed_by', 
                            'created_at', 'updated_at']
    
    def get_missing_items(self, obj):
        return obj.get_missing_required_items()
    
    def get_is_complete(self, obj):
        return obj.is_complete()

class IsolationPointLibrarySerializer(serializers.ModelSerializer):
    class Meta:
        model = IsolationPointLibrary
        fields = ['id', 'project', 'site', 'asset_tag', 'point_code', 'point_type', 
                  'energy_type', 'location', 'description', 'isolation_method', 
                  'verification_method', 'requires_lock', 'default_lock_count', 
                  'ppe_required', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class PermitIsolationPointSerializer(serializers.ModelSerializer):
    point_details = IsolationPointLibrarySerializer(source='point', read_only=True)
    isolated_by_details = UserMinimalSerializer(source='isolated_by', read_only=True)
    verified_by_details = UserMinimalSerializer(source='verified_by', read_only=True)
    deisolated_by_details = UserMinimalSerializer(source='deisolated_by', read_only=True)
    
    class Meta:
        model = PermitIsolationPoint
        fields = ['id', 'permit', 'point', 'point_details', 'custom_point_name', 
                  'custom_point_details', 'status', 'required', 'lock_applied', 
                  'lock_count', 'lock_ids', 'isolated_by', 'isolated_by_details', 
                  'isolated_at', 'verified_by', 'verified_by_details', 'verified_at', 
                  'verification_notes', 'deisolated_by', 'deisolated_by_details', 
                  'deisolated_at', 'deisolated_notes', 'order', 'created_at', 'updated_at']
        read_only_fields = ['permit', 'created_at', 'updated_at']
