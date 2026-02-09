from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Incident, IncidentAttachment, IncidentAuditLog, IncidentNotification,
    # Commercial grade models
    IncidentCategory, RiskAssessmentTemplate, IncidentMetrics,
    IncidentWorkflow, IncidentCostCenter, IncidentLearning,
    # 8D Methodology models
    EightDProcess, EightDDiscipline, EightDTeam, EightDContainmentAction,
    EightDRootCause, EightDCorrectiveAction, EightDPreventionAction, EightDAnalysisMethod
)

User = get_user_model()


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user serializer for references"""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'name', 'surname', 'full_name', 'admin_type', 'grade']

    def get_full_name(self, obj):
        if obj.name and obj.surname:
            return f"{obj.name} {obj.surname}"
        elif obj.name:
            return obj.name
        else:
            return obj.username


class IncidentAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for incident file attachments"""
    uploaded_by_details = UserMinimalSerializer(source='uploaded_by', read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = IncidentAttachment
        fields = [
            'id', 'file', 'file_url', 'filename', 'file_size', 'file_type',
            'description', 'uploaded_by', 'uploaded_by_details', 'uploaded_at'
        ]
        read_only_fields = ['uploaded_by', 'uploaded_at', 'file_size', 'file_type']
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None
    
    def create(self, validated_data):
        # Auto-populate file metadata
        file = validated_data.get('file')
        if file:
            validated_data['filename'] = file.name
            validated_data['file_size'] = file.size
            validated_data['file_type'] = file.content_type or 'unknown'
        
        validated_data['uploaded_by'] = self.context['request'].user
        return super().create(validated_data)


# Investigation and CAPA serializers removed - using 8D methodology only


class IncidentAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for incident audit logs"""
    performed_by_details = UserMinimalSerializer(source='performed_by', read_only=True)

    class Meta:
        model = IncidentAuditLog
        fields = [
            'id', 'action', 'description', 'performed_by', 'performed_by_details',
            'timestamp', 'previous_value', 'new_value', 'ip_address', 'user_agent'
        ]
        read_only_fields = ['timestamp']


class IncidentNotificationSerializer(serializers.ModelSerializer):
    """Serializer for incident notifications"""
    recipient_details = UserMinimalSerializer(source='recipient', read_only=True)

    class Meta:
        model = IncidentNotification
        fields = [
            'id', 'notification_type', 'recipient', 'recipient_details',
            'message', 'sent_at', 'read_at', 'is_read'
        ]
        read_only_fields = ['sent_at', 'is_read']


class IncidentListSerializer(serializers.ModelSerializer):
    """Simplified serializer for incident lists"""
    reported_by_details = UserMinimalSerializer(source='reported_by', read_only=True)
    assigned_investigator_details = UserMinimalSerializer(source='assigned_investigator', read_only=True)
    attachments_count = serializers.SerializerMethodField()

    days_since_reported = serializers.SerializerMethodField()

    class Meta:
        model = Incident
        fields = [
            'id', 'incident_id', 'title', 'incident_type', 'severity_level',
            'status', 'location', 'department', 'date_time_incident',
            'reporter_name', 'reported_by', 'reported_by_details',
            'assigned_investigator', 'assigned_investigator_details',
            'attachments_count', 'days_since_reported', 'created_at', 'updated_at',
            # Commercial grade fields for list display
            'risk_level', 'risk_matrix_score', 'priority_score',
            'estimated_cost', 'business_impact', 'regulatory_reportable',
            'escalation_level'
        ]

    def get_attachments_count(self, obj):
        return obj.attachments.count()



    def get_days_since_reported(self, obj):
        from django.utils import timezone
        return (timezone.now().date() - obj.created_at.date()).days


class IncidentSerializer(serializers.ModelSerializer):
    """Complete serializer for incident details"""
    reported_by_details = UserMinimalSerializer(source='reported_by', read_only=True)
    assigned_investigator_details = UserMinimalSerializer(source='assigned_investigator', read_only=True)
    attachments = IncidentAttachmentSerializer(many=True, read_only=True)

    audit_logs = IncidentAuditLogSerializer(many=True, read_only=True)
    notifications = IncidentNotificationSerializer(many=True, read_only=True)

    # Computed fields
    days_since_reported = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    completion_percentage = serializers.SerializerMethodField()

    # Commercial grade computed fields
    financial_impact = serializers.SerializerMethodField()
    estimated_completion_date = serializers.SerializerMethodField()
    risk_score_display = serializers.SerializerMethodField()

    class Meta:
        model = Incident
        fields = [
            'id', 'incident_id', 'title', 'description', 'incident_type',
            'severity_level', 'status', 'location', 'department',
            'date_time_incident', 'reporter_name', 'reported_by',
            'reported_by_details', 'assigned_investigator',
            'assigned_investigator_details', 'project', 'immediate_action_taken',
            'attachments', 'audit_logs', 'notifications', 'days_since_reported', 'is_overdue',
            'completion_percentage', 'created_at', 'updated_at',
            # Commercial grade fields
            'risk_level', 'probability_score', 'impact_score', 'risk_matrix_score',
            'estimated_cost', 'actual_cost', 'cost_category',
            'regulatory_framework', 'regulatory_reportable', 'regulatory_report_date',
            'regulatory_reference', 'business_impact', 'production_impact_hours',
            'personnel_affected_count', 'escalation_level', 'priority_score',
            'external_agencies_notified', 'weather_conditions', 'environmental_factors',
            'equipment_involved', 'equipment_serial_numbers', 'work_process',
            'work_permit_number', 'safety_procedures_followed', 'management_notified_at',
            'family_notified', 'media_attention',
            # Computed commercial fields
            'financial_impact', 'estimated_completion_date', 'risk_score_display'
        ]
        read_only_fields = [
            'incident_id', 'reported_by', 'created_at', 'updated_at',
            'risk_matrix_score', 'priority_score'
        ]

    def get_days_since_reported(self, obj):
        from django.utils import timezone
        return (timezone.now().date() - obj.created_at.date()).days

    def get_is_overdue(self, obj):
        # Define business logic for when an incident is considered overdue
        if obj.status in ['closed']:
            return False

        from django.utils import timezone
        days_since = (timezone.now().date() - obj.created_at.date()).days

        # Example: High/Critical incidents should be investigated within 3 days
        if obj.severity_level in ['high', 'critical'] and days_since > 3:
            return True
        # Medium incidents within 7 days
        elif obj.severity_level == 'medium' and days_since > 7:
            return True
        # Low incidents within 14 days
        elif obj.severity_level == 'low' and days_since > 14:
            return True

        return False

    def get_completion_percentage(self, obj):
        # Calculate overall completion percentage based on status
        status_percentages = {
            'reported': 10,
            'under_review': 25,
            'under_investigation': 50,
            'capa_pending': 75,
            'closed': 100
        }
        return status_percentages.get(obj.status, 0)

    def create(self, validated_data):
        try:
            # Set the reported_by field to the current user
            validated_data['reported_by'] = self.context['request'].user

            # Set project from user if not provided - handle case where user has no project
            if not validated_data.get('project'):
                user_project = getattr(self.context['request'].user, 'project', None)
                if user_project:
                    validated_data['project'] = user_project
                # If user has no project, we'll let the model handle it (project can be null)

            # Handle boolean fields that might come as strings
            boolean_fields = ['regulatory_reportable', 'safety_procedures_followed', 'family_notified', 'media_attention']
            for field in boolean_fields:
                if field in validated_data and isinstance(validated_data[field], str):
                    validated_data[field] = validated_data[field].lower() in ['true', '1', 'yes']

            # Handle numeric fields that might come as strings
            numeric_fields = ['probability_score', 'impact_score', 'estimated_cost', 'production_impact_hours', 'personnel_affected_count']
            for field in numeric_fields:
                if field in validated_data and validated_data[field] is not None:
                    try:
                        if field in ['estimated_cost', 'production_impact_hours']:
                            validated_data[field] = float(validated_data[field]) if validated_data[field] != '' else None
                        elif field in ['probability_score', 'impact_score', 'personnel_affected_count']:
                            validated_data[field] = int(validated_data[field]) if validated_data[field] != '' else None
                    except (ValueError, TypeError):
                        validated_data[field] = None

            return super().create(validated_data)
        except Exception as e:
            # Log the error for debugging
            print(f"Error in IncidentSerializer.create: {e}")
            raise e

    def get_financial_impact(self, obj):
        """Calculate total financial impact"""
        return float(obj.calculate_financial_impact()) if hasattr(obj, 'calculate_financial_impact') else 0.0

    def get_estimated_completion_date(self, obj):
        """Get estimated completion date"""
        if hasattr(obj, 'estimated_completion_date'):
            completion_date = obj.estimated_completion_date
            return completion_date.isoformat() if completion_date else None
        return None

    def get_risk_score_display(self, obj):
        """Get risk score with descriptive text"""
        if obj.risk_matrix_score:
            risk_descriptions = {
                (1, 4): 'Very Low Risk',
                (5, 8): 'Low Risk',
                (9, 12): 'Medium Risk',
                (13, 20): 'High Risk',
                (21, 25): 'Very High Risk'
            }

            for (min_score, max_score), description in risk_descriptions.items():
                if min_score <= obj.risk_matrix_score <= max_score:
                    return f"{obj.risk_matrix_score} - {description}"

            return f"{obj.risk_matrix_score} - Unknown Risk Level"
        return None


# === COMMERCIAL GRADE SERIALIZERS ===

class IncidentCategorySerializer(serializers.ModelSerializer):
    """Serializer for incident categories"""

    class Meta:
        model = IncidentCategory
        fields = [
            'id', 'name', 'description', 'color_code', 'is_active',
            'sort_order', 'industry_type', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class RiskAssessmentTemplateSerializer(serializers.ModelSerializer):
    """Serializer for risk assessment templates"""
    created_by_details = UserMinimalSerializer(source='created_by', read_only=True)

    class Meta:
        model = RiskAssessmentTemplate
        fields = [
            'id', 'name', 'incident_types', 'risk_factors',
            'probability_criteria', 'impact_criteria', 'is_default',
            'created_by', 'created_by_details', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class IncidentMetricsSerializer(serializers.ModelSerializer):
    """Serializer for incident metrics and KPIs"""
    incident_details = serializers.SerializerMethodField()

    class Meta:
        model = IncidentMetrics
        fields = [
            'id', 'incident', 'incident_details', 'time_to_report',
            'time_to_investigate', 'time_to_close', 'investigation_quality_score',
            'capa_effectiveness_score', 'is_recurrence', 'related_incidents',
            'regulatory_compliance_score', 'calculated_at'
        ]
        read_only_fields = ['calculated_at']

    def get_incident_details(self, obj):
        return {
            'incident_id': obj.incident.incident_id,
            'title': obj.incident.title,
            'severity_level': obj.incident.severity_level,
            'status': obj.incident.status
        }


class IncidentWorkflowSerializer(serializers.ModelSerializer):
    """Serializer for incident workflows"""
    created_by_details = UserMinimalSerializer(source='created_by', read_only=True)

    class Meta:
        model = IncidentWorkflow
        fields = [
            'id', 'name', 'description', 'incident_types', 'workflow_steps',
            'escalation_rules', 'notification_rules', 'is_active', 'is_default',
            'created_by', 'created_by_details', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class IncidentCostCenterSerializer(serializers.ModelSerializer):
    """Serializer for incident cost tracking"""
    incident_details = serializers.SerializerMethodField()
    created_by_details = UserMinimalSerializer(source='created_by', read_only=True)
    approved_by_details = UserMinimalSerializer(source='approved_by', read_only=True)
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model = IncidentCostCenter
        fields = [
            'id', 'incident', 'incident_details', 'cost_type', 'description',
            'estimated_amount', 'actual_amount', 'total_amount', 'budget_code',
            'department_charged', 'requires_approval', 'approved_by',
            'approved_by_details', 'approved_at', 'created_by',
            'created_by_details', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_incident_details(self, obj):
        return {
            'incident_id': obj.incident.incident_id,
            'title': obj.incident.title
        }

    def get_total_amount(self, obj):
        return float(obj.actual_amount or obj.estimated_amount or 0)

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class IncidentLearningSerializer(serializers.ModelSerializer):
    """Serializer for incident lessons learned"""
    incident_details = serializers.SerializerMethodField()
    created_by_details = UserMinimalSerializer(source='created_by', read_only=True)

    class Meta:
        model = IncidentLearning
        fields = [
            'id', 'incident', 'incident_details', 'key_findings',
            'lessons_learned', 'best_practices', 'applicable_to',
            'training_required', 'training_topics', 'policy_updates_required',
            'policy_recommendations', 'shared_with_teams', 'communication_method',
            'created_by', 'created_by_details', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_incident_details(self, obj):
        return {
            'incident_id': obj.incident.incident_id,
            'title': obj.incident.title,
            'incident_type': obj.incident.incident_type,
            'severity_level': obj.incident.severity_level
        }

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class IncidentAnalyticsSerializer(serializers.Serializer):
    """Serializer for incident analytics and dashboard data"""
    total_incidents = serializers.IntegerField()
    open_incidents = serializers.IntegerField()
    closed_incidents = serializers.IntegerField()
    overdue_incidents = serializers.IntegerField()

    # Severity distribution
    severity_distribution = serializers.ListField(
        child=serializers.DictField()
    )

    # Status distribution
    status_distribution = serializers.ListField(
        child=serializers.DictField()
    )

    # Monthly trends
    monthly_trends = serializers.ListField(
        child=serializers.DictField()
    )

    # Risk analysis
    risk_distribution = serializers.ListField(
        child=serializers.DictField()
    )

    # Cost analysis
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2)
    average_cost_per_incident = serializers.DecimalField(max_digits=12, decimal_places=2)

    # Performance metrics
    average_time_to_close = serializers.DurationField()
    investigation_completion_rate = serializers.FloatField()
    capa_completion_rate = serializers.FloatField()

    # Top incident types
    top_incident_types = serializers.ListField(
        child=serializers.DictField()
    )

    # Department analysis
    incidents_by_department = serializers.ListField(
        child=serializers.DictField()
    )


class IncidentExportSerializer(serializers.ModelSerializer):
    """Serializer for incident data export"""
    reported_by_name = serializers.CharField(source='reported_by.get_full_name', read_only=True)
    assigned_investigator_name = serializers.CharField(source='assigned_investigator.get_full_name', read_only=True)
    project_name = serializers.CharField(source='project.projectName', read_only=True)
    days_since_reported = serializers.SerializerMethodField()
    financial_impact = serializers.SerializerMethodField()

    class Meta:
        model = Incident
        fields = [
            'incident_id', 'title', 'description', 'incident_type',
            'severity_level', 'status', 'location', 'department',
            'date_time_incident', 'reporter_name', 'reported_by_name',
            'assigned_investigator_name', 'project_name',
            'immediate_action_taken', 'potential_causes',
            'risk_level', 'probability_score', 'impact_score',
            'risk_matrix_score', 'estimated_cost', 'actual_cost',
            'cost_category', 'regulatory_framework', 'regulatory_reportable',
            'business_impact', 'production_impact_hours',
            'personnel_affected_count', 'escalation_level',
            'priority_score', 'weather_conditions', 'equipment_involved',
            'work_process', 'work_permit_number', 'safety_procedures_followed',
            'days_since_reported', 'financial_impact', 'created_at', 'updated_at'
        ]

    def get_days_since_reported(self, obj):
        from django.utils import timezone
        return (timezone.now().date() - obj.created_at.date()).days

    def get_financial_impact(self, obj):
        return float(obj.calculate_financial_impact()) if hasattr(obj, 'calculate_financial_impact') else 0.0


# === 8D METHODOLOGY SERIALIZERS ===

class EightDTeamSerializer(serializers.ModelSerializer):
    """Serializer for 8D team members"""
    user_details = UserMinimalSerializer(source='user', read_only=True)
    recognized_by_details = UserMinimalSerializer(source='recognized_by', read_only=True)
    is_recognized = serializers.ReadOnlyField()

    class Meta:
        model = EightDTeam
        fields = [
            'id', 'eight_d_process', 'user', 'user_details', 'role', 'expertise_area',
            'responsibilities', 'is_active', 'joined_date', 'left_date',
            'recognition_notes', 'recognized_by', 'recognized_by_details',
            'recognized_date', 'is_recognized'
        ]
        read_only_fields = ['joined_date']
        
    def create(self, validated_data):
        return super().create(validated_data)
        
    def validate(self, data):
        return super().validate(data)


class EightDDisciplineSerializer(serializers.ModelSerializer):
    """Serializer for 8D disciplines"""
    assigned_to_details = UserMinimalSerializer(source='assigned_to', read_only=True)
    verified_by_details = UserMinimalSerializer(source='verified_by', read_only=True)
    discipline_name = serializers.CharField(read_only=True)

    class Meta:
        model = EightDDiscipline
        fields = [
            'id', 'discipline_number', 'discipline_name', 'status',
            'progress_percentage', 'description', 'deliverables',
            'assigned_to', 'assigned_to_details', 'start_date',
            'target_date', 'completion_date', 'verified_by',
            'verified_by_details', 'verified_date', 'verification_notes',
            'created_at', 'updated_at'
        ]


# --- CORRECT AND FINAL VERSION ---

class EightDContainmentActionSerializer(serializers.ModelSerializer):
    """Serializer for 8D containment actions"""
    responsible_person_details = UserMinimalSerializer(source='responsible_person', read_only=True)

    class Meta:
        model = EightDContainmentAction
        fields = [
            'id',
            'eight_d_process',  # <-- THIS IS THE CRITICAL FIX
            'action_description',
            'rationale',
            'responsible_person',
            'responsible_person_details',
            'implementation_date',
            'verification_date',
            'status',
            'effectiveness_rating',
            'verification_notes',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
        ]

class EightDRootCauseSerializer(serializers.ModelSerializer):
    """Serializer for 8D root causes"""
    identified_by_details = UserMinimalSerializer(source='identified_by', read_only=True)
    verified_by_details = UserMinimalSerializer(source='verified_by', read_only=True)

    class Meta:
        model = EightDRootCause
        fields = [
            'id', 'eight_d_process', 'cause_description', 'cause_type', 'analysis_method',
            'supporting_evidence', 'verification_method', 'is_verified',
            'impact_assessment', 'likelihood_score', 'identified_by',
            'identified_by_details', 'verified_by', 'verified_by_details',
            'created_at', 'updated_at'
        ]


class EightDCorrectiveActionSerializer(serializers.ModelSerializer):
    """Serializer for 8D corrective actions"""
    responsible_person_details = UserMinimalSerializer(source='responsible_person', read_only=True)
    root_cause_details = serializers.SerializerMethodField()

    class Meta:
        model = EightDCorrectiveAction
        fields = [
            'id', 'eight_d_process', 'root_cause', 'root_cause_details', 'action_description',
            'action_type', 'rationale', 'responsible_person',
            'responsible_person_details', 'target_date', 'actual_implementation_date',
            'status', 'implementation_notes', 'verification_method',
            'verification_date', 'effectiveness_rating', 'verification_notes',
            'estimated_cost', 'actual_cost', 'implementation_plan',
            'implementation_start_date', 'implementation_progress', 'progress_notes',
            'completion_evidence', 'resources_required', 'validation_results',
            'created_at', 'updated_at'
        ]

    def get_root_cause_details(self, obj):
        return {
            'cause_description': obj.root_cause.cause_description,
            'cause_type': obj.root_cause.cause_type,
            'analysis_method': obj.root_cause.analysis_method
        }


class EightDPreventionActionSerializer(serializers.ModelSerializer):
    """Serializer for 8D prevention actions"""
    responsible_person_details = UserMinimalSerializer(source='responsible_person', read_only=True)

    class Meta:
        model = EightDPreventionAction
        fields = [
            'id', 'eight_d_process', 'prevention_description', 'prevention_type',
            'scope_of_application', 'responsible_person',
            'responsible_person_details', 'target_date', 'implementation_date',
            'status', 'verification_method', 'verification_date',
            'effectiveness_notes', 'similar_processes', 'rollout_plan',
            'created_at', 'updated_at'
        ]


class EightDProcessSerializer(serializers.ModelSerializer):
    """Comprehensive serializer for 8D process"""
    champion_details = UserMinimalSerializer(source='champion', read_only=True)
    incident_details = serializers.SerializerMethodField()
    disciplines = EightDDisciplineSerializer(many=True, read_only=True)
    team_members = EightDTeamSerializer(many=True, read_only=True)
    containment_actions = EightDContainmentActionSerializer(many=True, read_only=True)
    root_causes = EightDRootCauseSerializer(many=True, read_only=True)
    corrective_actions = EightDCorrectiveActionSerializer(many=True, read_only=True)
    prevention_actions = EightDPreventionActionSerializer(many=True, read_only=True)

    # Computed fields
    days_since_initiated = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    completion_summary = serializers.SerializerMethodField()

    class Meta:
        model = EightDProcess
        fields = [
            'id', 'eight_d_id', 'incident', 'incident_details',
            'problem_statement', 'champion', 'champion_details',
            'initiated_date', 'target_completion_date', 'actual_completion_date',
            'status', 'current_discipline', 'overall_progress',
            'days_since_initiated', 'is_overdue', 'completion_summary',
            'disciplines', 'team_members', 'containment_actions',
            'root_causes', 'corrective_actions', 'prevention_actions',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['eight_d_id', 'initiated_date']

    def get_incident_details(self, obj):
        return {
            'incident_id': obj.incident.incident_id,
            'title': obj.incident.title,
            'severity_level': obj.incident.severity_level,
            'status': obj.incident.status
        }

    def get_days_since_initiated(self, obj):
        from django.utils import timezone
        return (timezone.now().date() - obj.initiated_date.date()).days

    def get_is_overdue(self, obj):
        if obj.target_completion_date and obj.status not in ['completed', 'closed']:
            from django.utils import timezone
            return timezone.now().date() > obj.target_completion_date.date()
        return False

    def get_completion_summary(self, obj):
        disciplines = obj.disciplines.all()
        total_disciplines = disciplines.count()
        completed_disciplines = disciplines.filter(status='completed').count()

        return {
            'total_disciplines': total_disciplines,
            'completed_disciplines': completed_disciplines,
            'completion_rate': (completed_disciplines / total_disciplines * 100) if total_disciplines > 0 else 0,
            'current_discipline': obj.current_discipline,
            'overall_progress': obj.overall_progress
        }


class EightDProcessListSerializer(serializers.ModelSerializer):
    """Simplified serializer for 8D process list view"""
    champion_details = UserMinimalSerializer(source='champion', read_only=True)
    incident_details = serializers.SerializerMethodField()
    days_since_initiated = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    team_count = serializers.SerializerMethodField()

    class Meta:
        model = EightDProcess
        fields = [
            'id', 'eight_d_id', 'incident', 'incident_details',
            'problem_statement', 'champion', 'champion_details',
            'initiated_date', 'target_completion_date', 'status',
            'current_discipline', 'overall_progress', 'days_since_initiated',
            'is_overdue', 'team_count'
        ]

    def get_incident_details(self, obj):
        return {
            'incident_id': obj.incident.incident_id,
            'title': obj.incident.title,
            'severity_level': obj.incident.severity_level
        }

    def get_days_since_initiated(self, obj):
        from django.utils import timezone
        return (timezone.now().date() - obj.initiated_date.date()).days

    def get_is_overdue(self, obj):
        if obj.target_completion_date and obj.status not in ['completed', 'closed']:
            from django.utils import timezone
            return timezone.now().date() > obj.target_completion_date.date()
        return False

    def get_team_count(self, obj):
        return obj.team_members.filter(is_active=True).count()


class EightDAnalysisMethodSerializer(serializers.ModelSerializer):
    """Serializer for 8D analysis methods"""
    created_by_details = UserMinimalSerializer(source='created_by', read_only=True)
    root_cause_details = serializers.SerializerMethodField()

    class Meta:
        model = EightDAnalysisMethod
        fields = [
            'id', 'root_cause', 'root_cause_details', 'method_type',
            'method_data', 'created_by', 'created_by_details',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_root_cause_details(self, obj):
        return {
            'cause_description': obj.root_cause.cause_description,
            'cause_type': obj.root_cause.cause_type,
            'analysis_method': obj.root_cause.analysis_method
        }
