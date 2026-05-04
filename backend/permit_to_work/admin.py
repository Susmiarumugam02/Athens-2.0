from django.contrib import admin
from .models import (
    PermitType, Permit, WorkflowTemplate, WorkflowInstance, WorkflowStep,
    PermitExtension, DigitalSignature, PermitAudit, GasReading,
    IsolationPointLibrary, PermitIsolationPoint, CloseoutChecklistTemplate, PermitCloseout
)


@admin.register(PermitType)
class PermitTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'risk_level', 'is_active']
    list_filter = ['category', 'risk_level', 'is_active']
    search_fields = ['name', 'description']


@admin.register(Permit)
class PermitAdmin(admin.ModelAdmin):
    list_display = ['permit_number', 'permit_type', 'status', 'risk_level', 'created_at']
    list_filter = ['status', 'risk_level', 'permit_type']
    search_fields = ['permit_number', 'title', 'description']
    readonly_fields = ['permit_number', 'qr_code', 'created_at', 'updated_at']


@admin.register(PermitExtension)
class PermitExtensionAdmin(admin.ModelAdmin):
    list_display = ['permit', 'extension_hours', 'status', 'requested_at']
    list_filter = ['status']
    readonly_fields = ['requested_at', 'approved_at']


@admin.register(DigitalSignature)
class DigitalSignatureAdmin(admin.ModelAdmin):
    list_display = ['permit', 'signature_type', 'signatory', 'signed_at']
    list_filter = ['signature_type']
    readonly_fields = ['signed_at']


@admin.register(PermitAudit)
class PermitAuditAdmin(admin.ModelAdmin):
    list_display = ['permit', 'action', 'user', 'timestamp']
    list_filter = ['action']
    readonly_fields = ['timestamp']


@admin.register(GasReading)
class GasReadingAdmin(admin.ModelAdmin):
    list_display = ['permit', 'gas_type', 'reading', 'status', 'tested_at']
    list_filter = ['gas_type', 'status']
    readonly_fields = ['tested_at']


@admin.register(IsolationPointLibrary)
class IsolationPointLibraryAdmin(admin.ModelAdmin):
    list_display = ['point_code', 'point_type', 'location', 'is_active']
    list_filter = ['point_type', 'is_active']
    search_fields = ['point_code', 'location']


@admin.register(PermitIsolationPoint)
class PermitIsolationPointAdmin(admin.ModelAdmin):
    list_display = ['permit', 'point', 'status', 'isolated_at']
    list_filter = ['status']


@admin.register(CloseoutChecklistTemplate)
class CloseoutChecklistTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'permit_type', 'risk_level', 'is_active']
    list_filter = ['permit_type', 'risk_level', 'is_active']


@admin.register(PermitCloseout)
class PermitCloseoutAdmin(admin.ModelAdmin):
    list_display = ['permit', 'completed', 'completed_at']
    list_filter = ['completed']
    readonly_fields = ['created_at']
