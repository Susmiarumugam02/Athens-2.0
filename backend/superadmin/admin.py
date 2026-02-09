from django.contrib import admin
from superadmin.models import (
    Role, Permission, RolePermission, UserRole, AuditLog,
    PasswordPolicy, TwoFactorSettings, IPRestriction, SessionSettings,
    Announcement, NotificationDelivery, SystemSettings, DatabaseBackup
)


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_system_role', 'created_at']
    search_fields = ['name']
    list_filter = ['is_system_role']


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ['codename', 'name', 'module', 'action']
    search_fields = ['codename', 'name']
    list_filter = ['module', 'action']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'user', 'action', 'module', 'status']
    search_fields = ['action', 'module']
    list_filter = ['status', 'module', 'timestamp']
    readonly_fields = ['timestamp', 'user', 'action', 'module', 'resource_type', 
                       'resource_id', 'ip_address', 'user_agent', 'request_data', 
                       'response_data', 'status']


@admin.register(IPRestriction)
class IPRestrictionAdmin(admin.ModelAdmin):
    list_display = ['ip_address', 'restriction_type', 'is_active', 'created_at']
    list_filter = ['restriction_type', 'is_active']


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ['title', 'type', 'target_audience', 'is_active', 'created_at']
    list_filter = ['type', 'target_audience', 'is_active']
    search_fields = ['title', 'message']


@admin.register(DatabaseBackup)
class DatabaseBackupAdmin(admin.ModelAdmin):
    list_display = ['filename', 'backup_type', 'status', 'file_size', 'created_at']
    list_filter = ['backup_type', 'status']
    readonly_fields = ['filename', 'file_path', 'file_size', 'created_at', 'completed_at']
