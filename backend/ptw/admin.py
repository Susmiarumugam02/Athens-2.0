from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import (
    PermitType, Permit, PermitWorker, PermitApproval, PermitExtension,
    PermitAudit, WorkflowTemplate, WorkflowInstance, WorkflowStep,
    HazardLibrary, PermitHazard, GasReading, PermitPhoto, DigitalSignature,
    EscalationRule, NotificationTemplate, SystemIntegration, ComplianceReport,
    IsolationPointLibrary, PermitIsolationPoint, WebhookEndpoint, WebhookDeliveryLog
)

@admin.register(PermitType)
class PermitTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'risk_level', 'validity_hours', 'is_active', 'created_at']
    list_filter = ['category', 'risk_level', 'is_active', 'requires_gas_testing', 'requires_fire_watch']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'category', 'description', 'color_code', 'is_active')
        }),
        ('Risk & Validity', {
            'fields': ('risk_level', 'validity_hours', 'requires_approval_levels', 'escalation_time_hours')
        }),
        ('Requirements', {
            'fields': ('requires_gas_testing', 'requires_fire_watch', 'requires_isolation')
        }),
        ('Configuration', {
            'fields': ('mandatory_ppe', 'safety_checklist'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

class PermitWorkerInline(admin.TabularInline):
    model = PermitWorker
    extra = 0
    readonly_fields = ['assigned_at']

class PermitApprovalInline(admin.TabularInline):
    model = PermitApproval
    extra = 0
    readonly_fields = ['timestamp']

class PermitAuditInline(admin.TabularInline):
    model = PermitAudit
    extra = 0
    readonly_fields = ['timestamp']
    can_delete = False

class PermitPhotoInline(admin.TabularInline):
    model = PermitPhoto
    extra = 0
    readonly_fields = ['taken_at', 'photo_preview']
    
    def photo_preview(self, obj):
        if obj.photo:
            return format_html(
                '<img src="{}" style="max-height: 50px; max-width: 100px;" />',
                obj.photo.url
            )
        return "No photo"
    photo_preview.short_description = "Preview"

class GasReadingInline(admin.TabularInline):
    model = GasReading
    extra = 0
    readonly_fields = ['tested_at']

@admin.register(Permit)
class PermitAdmin(admin.ModelAdmin):
    list_display = [
        'permit_number', 'permit_type', 'status_badge', 'risk_badge', 
        'location', 'created_by', 'planned_start_time', 'created_at'
    ]
    list_filter = [
        'status', 'permit_type', 'risk_level', 'priority', 'mobile_created',
        'requires_isolation', 'created_at', 'planned_start_time'
    ]
    search_fields = ['permit_number', 'title', 'location', 'description']
    readonly_fields = [
        'permit_number', 'qr_code', 'risk_score', 'created_at', 'updated_at',
        'submitted_at', 'approved_at', 'qr_code_display'
    ]
    
    inlines = [PermitWorkerInline, PermitApprovalInline, PermitPhotoInline, GasReadingInline, PermitAuditInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('permit_number', 'permit_type', 'title', 'description', 'work_order_id')
        }),
        ('Location & Time', {
            'fields': ('location', 'gps_coordinates', 'site_layout', 
                      'planned_start_time', 'planned_end_time', 
                      'actual_start_time', 'actual_end_time')
        }),
        ('People & Contacts', {
            'fields': ('created_by', 'issuer', 'receiver',
                      'issuer_designation', 'issuer_department', 'issuer_contact',
                      'receiver_designation', 'receiver_department', 'receiver_contact')
        }),
        ('Status & Priority', {
            'fields': ('status', 'priority', 'current_approval_level')
        }),
        ('Risk Assessment', {
            'fields': ('risk_assessment_id', 'risk_assessment_completed',
                      'probability', 'severity', 'risk_score', 'risk_level')
        }),
        ('Safety Information', {
            'fields': ('control_measures', 'ppe_requirements', 'special_instructions', 'safety_checklist')
        }),
        ('Isolation', {
            'fields': ('requires_isolation', 'isolation_details', 'isolation_verified_by', 'isolation_certificate'),
            'classes': ('collapse',)
        }),
        ('Authorization', {
            'fields': ('approver', 'area_incharge', 'department_head')
        }),
        ('Documentation', {
            'fields': ('work_procedure', 'method_statement', 'risk_assessment_doc'),
            'classes': ('collapse',)
        }),
        ('Mobile & QR', {
            'fields': ('qr_code_display', 'mobile_created', 'offline_id'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'submitted_at', 'approved_at'),
            'classes': ('collapse',)
        }),
        ('Compliance', {
            'fields': ('compliance_standards', 'project'),
            'classes': ('collapse',)
        })
    )
    
    def status_badge(self, obj):
        colors = {
            'draft': 'gray',
            'submitted': 'blue',
            'under_review': 'orange',
            'approved': 'green',
            'active': 'green',
            'suspended': 'orange',
            'completed': 'purple',
            'cancelled': 'gray',
            'expired': 'red',
            'rejected': 'red'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 3px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def risk_badge(self, obj):
        colors = {
            'low': 'green',
            'medium': 'orange',
            'high': 'red',
            'extreme': 'darkred'
        }
        color = colors.get(obj.risk_level, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 3px;">{}</span>',
            color, obj.get_risk_level_display()
        )
    risk_badge.short_description = 'Risk Level'
    
    def qr_code_display(self, obj):
        if obj.qr_code:
            return format_html(
                '<div style="font-family: monospace; font-size: 10px; word-break: break-all; max-width: 300px;">{}</div>',
                obj.qr_code[:100] + '...' if len(obj.qr_code) > 100 else obj.qr_code
            )
        return "Not generated"
    qr_code_display.short_description = 'QR Code'

@admin.register(HazardLibrary)
class HazardLibraryAdmin(admin.ModelAdmin):
    list_display = ['hazard_id', 'name', 'category', 'risk_level', 'is_active']
    list_filter = ['category', 'risk_level', 'is_active']
    search_fields = ['hazard_id', 'name', 'description']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('hazard_id', 'name', 'category', 'description', 'is_active')
        }),
        ('Risk & Controls', {
            'fields': ('risk_level', 'control_measures', 'ppe_requirements')
        })
    )

@admin.register(WorkflowTemplate)
class WorkflowTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'permit_type', 'risk_level', 'auto_escalation', 'is_active', 'created_at']
    list_filter = ['permit_type', 'risk_level', 'auto_escalation', 'parallel_processing', 'is_active']
    search_fields = ['name']
    readonly_fields = ['created_at']

class WorkflowStepInline(admin.TabularInline):
    model = WorkflowStep
    extra = 0
    readonly_fields = ['completed_at']

@admin.register(WorkflowInstance)
class WorkflowInstanceAdmin(admin.ModelAdmin):
    list_display = ['permit', 'template', 'current_step', 'status', 'started_at']
    list_filter = ['template', 'status']
    readonly_fields = ['started_at', 'completed_at']
    inlines = [WorkflowStepInline]

@admin.register(PermitExtension)
class PermitExtensionAdmin(admin.ModelAdmin):
    list_display = ['permit', 'extension_hours', 'status', 'requested_by', 'requested_at']
    list_filter = ['status', 'requested_at']
    readonly_fields = ['requested_at', 'approved_at', 'extension_hours']

@admin.register(GasReading)
class GasReadingAdmin(admin.ModelAdmin):
    list_display = ['permit', 'gas_type', 'reading', 'unit', 'status', 'tested_by', 'tested_at']
    list_filter = ['gas_type', 'status', 'tested_at']
    readonly_fields = ['tested_at']

@admin.register(PermitPhoto)
class PermitPhotoAdmin(admin.ModelAdmin):
    list_display = ['permit', 'photo_type', 'photo_preview', 'taken_by', 'taken_at']
    list_filter = ['photo_type', 'taken_at']
    readonly_fields = ['taken_at', 'photo_preview']
    
    def photo_preview(self, obj):
        if obj.photo:
            return format_html(
                '<img src="{}" style="max-height: 100px; max-width: 150px;" />',
                obj.photo.url
            )
        return "No photo"
    photo_preview.short_description = "Preview"

@admin.register(DigitalSignature)
class DigitalSignatureAdmin(admin.ModelAdmin):
    list_display = ['permit', 'signature_type', 'signatory', 'signed_at']
    list_filter = ['signature_type', 'signed_at']
    readonly_fields = ['signed_at', 'signature_preview']
    
    def signature_preview(self, obj):
        return format_html(
            '<div style="font-family: monospace; font-size: 10px;">Signature Data: {}...</div>',
            obj.signature_data[:50]
        )
    signature_preview.short_description = "Signature Preview"

@admin.register(EscalationRule)
class EscalationRuleAdmin(admin.ModelAdmin):
    list_display = ['permit_type', 'step_name', 'time_limit_hours', 'escalate_to_role', 'is_active']
    list_filter = ['permit_type', 'notification_method', 'is_active']

@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'trigger', 'method', 'is_active']
    list_filter = ['trigger', 'method', 'is_active']
    search_fields = ['name', 'subject']

@admin.register(SystemIntegration)
class SystemIntegrationAdmin(admin.ModelAdmin):
    list_display = ['name', 'integration_type', 'status_badge', 'data_flow', 'last_sync', 'is_active']
    list_filter = ['integration_type', 'status', 'data_flow', 'is_active']
    readonly_fields = ['last_sync']
    
    def status_badge(self, obj):
        colors = {
            'connected': 'green',
            'disconnected': 'gray',
            'error': 'red',
            'syncing': 'blue'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 3px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'

@admin.register(ComplianceReport)
class ComplianceReportAdmin(admin.ModelAdmin):
    list_display = ['name', 'report_type', 'generated_by', 'generated_at', 'file_link']
    list_filter = ['report_type', 'generated_at']
    readonly_fields = ['generated_at']
    
    def file_link(self, obj):
        if obj.file_path:
            return format_html(
                '<a href="{}" target="_blank">Download</a>',
                obj.file_path
            )
        return "No file"
    file_link.short_description = "File"

@admin.register(PermitAudit)
class PermitAuditAdmin(admin.ModelAdmin):
    list_display = ['permit', 'action', 'user', 'timestamp']
    list_filter = ['action', 'timestamp']
    readonly_fields = ['timestamp']
    can_delete = False
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False

# Custom admin site configuration
admin.site.site_header = "PTW System Administration"
admin.site.site_title = "PTW Admin"
admin.site.index_title = "Permit to Work Management"

@admin.register(IsolationPointLibrary)
class IsolationPointLibraryAdmin(admin.ModelAdmin):
    list_display = ['point_code', 'point_type', 'energy_type', 'location', 'project', 'is_active']
    list_filter = ['point_type', 'energy_type', 'is_active', 'project']
    search_fields = ['point_code', 'location', 'asset_tag', 'description']
    fieldsets = (
        ('Basic Information', {
            'fields': ('project', 'point_code', 'point_type', 'energy_type')
        }),
        ('Location', {
            'fields': ('site', 'asset_tag', 'location', 'description')
        }),
        ('Isolation Details', {
            'fields': ('isolation_method', 'verification_method', 'requires_lock', 'default_lock_count', 'ppe_required')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )

@admin.register(PermitIsolationPoint)
class PermitIsolationPointAdmin(admin.ModelAdmin):
    list_display = ['get_point_name', 'permit', 'status', 'required', 'lock_applied', 'verified_at']
    list_filter = ['status', 'required', 'lock_applied']
    search_fields = ['permit__permit_number', 'point__point_code', 'custom_point_name']
    readonly_fields = ['isolated_at', 'verified_at', 'deisolated_at', 'created_at', 'updated_at']
    
    def get_point_name(self, obj):
        return obj.point.point_code if obj.point else obj.custom_point_name
    get_point_name.short_description = 'Point'


@admin.register(WebhookEndpoint)
class WebhookEndpointAdmin(admin.ModelAdmin):
    list_display = ['name', 'url', 'project', 'enabled', 'last_sent_at', 'last_status_code']
    list_filter = ['enabled', 'project']
    search_fields = ['name', 'url']
    readonly_fields = ['created_at', 'updated_at', 'last_sent_at', 'last_status_code', 'last_error']
    fieldsets = (
        ('Basic Info', {
            'fields': ('name', 'project', 'url', 'secret', 'enabled')
        }),
        ('Events', {
            'fields': ('events',)
        }),
        ('Status', {
            'fields': ('last_sent_at', 'last_status_code', 'last_error')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'created_by')
        }),
    )

@admin.register(WebhookDeliveryLog)
class WebhookDeliveryLogAdmin(admin.ModelAdmin):
    list_display = ['webhook', 'event', 'permit_id', 'status', 'response_code', 'sent_at']
    list_filter = ['status', 'event', 'webhook']
    search_fields = ['permit_id', 'event']
    readonly_fields = ['webhook', 'event', 'permit_id', 'dedupe_key', 'payload', 'response_code', 
                       'response_body', 'error', 'status', 'sent_at', 'retry_count']
    
    def has_add_permission(self, request):
        return False  # Logs are created automatically
