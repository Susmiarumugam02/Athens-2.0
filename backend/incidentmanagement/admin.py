from django.contrib import admin
from .models import (
    Incident, IncidentAttachment, IncidentAuditLog, IncidentNotification,
    IncidentCostCenter, IncidentLearning, EightDProcess, EightDTeam,
    EightDContainmentAction, EightDRootCause, EightDCorrectiveAction, EightDPreventionAction
)


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = [
        'incident_id', 'title', 'incident_type', 'severity_level',
        'status', 'reporter_name', 'assigned_investigator', 'created_at'
    ]
    list_filter = [
        'incident_type', 'severity_level', 'status', 'department',
        'created_at', 'date_time_incident'
    ]
    search_fields = ['incident_id', 'title', 'description', 'reporter_name', 'location']
    readonly_fields = ['incident_id', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Basic Information', {
            'fields': ('incident_id', 'title', 'description', 'incident_type', 'severity_level')
        }),
        ('Location & Context', {
            'fields': ('location', 'department', 'date_time_incident')
        }),
        ('People Involved', {
            'fields': ('reporter_name', 'reported_by', 'assigned_investigator')
        }),
        ('Status & Progress', {
            'fields': ('status', 'project')
        }),
        ('Additional Details', {
            'fields': ('immediate_action_taken', 'potential_causes'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(IncidentAttachment)
class IncidentAttachmentAdmin(admin.ModelAdmin):
    list_display = ['incident', 'filename', 'file_type', 'file_size', 'uploaded_by', 'uploaded_at']
    list_filter = ['file_type', 'uploaded_at']
    search_fields = ['filename', 'description', 'incident__incident_id']


@admin.register(EightDProcess)
class EightDProcessAdmin(admin.ModelAdmin):
    list_display = ['eight_d_id', 'incident', 'champion', 'status', 'current_discipline', 'overall_progress']
    list_filter = ['status', 'current_discipline', 'initiated_date']
    search_fields = ['eight_d_id', 'incident__incident_id', 'problem_statement']
    readonly_fields = ['eight_d_id', 'created_at', 'updated_at']


@admin.register(IncidentCostCenter)
class IncidentCostCenterAdmin(admin.ModelAdmin):
    list_display = ['incident', 'cost_type', 'description', 'estimated_amount', 'actual_amount']
    list_filter = ['cost_type', 'requires_approval', 'created_at']
    search_fields = ['incident__incident_id', 'description']


@admin.register(IncidentLearning)
class IncidentLearningAdmin(admin.ModelAdmin):
    list_display = ['incident', 'training_required', 'policy_updates_required', 'created_by']
    list_filter = ['training_required', 'policy_updates_required', 'created_at']
    search_fields = ['incident__incident_id', 'key_findings', 'lessons_learned']


@admin.register(IncidentAuditLog)
class IncidentAuditLogAdmin(admin.ModelAdmin):
    list_display = ['incident', 'action', 'performed_by', 'timestamp']
    list_filter = ['action', 'timestamp']
    search_fields = ['incident__incident_id', 'description', 'performed_by__username']
    readonly_fields = ['timestamp']


@admin.register(IncidentNotification)
class IncidentNotificationAdmin(admin.ModelAdmin):
    list_display = ['incident', 'notification_type', 'recipient', 'sent_at', 'is_read']
    list_filter = ['notification_type', 'sent_at', 'read_at']
    search_fields = ['incident__incident_id', 'recipient__username', 'message']
