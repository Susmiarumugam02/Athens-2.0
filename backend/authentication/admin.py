from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, SecurityLog, ServiceUserSession


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'user_type', 'company_id', 'is_active', 'created_at']
    list_filter = ['user_type', 'is_active', 'requires_2fa']
    search_fields = ['email']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Type & Company', {'fields': ('user_type', 'company_id')}),
        ('Security', {'fields': ('requires_2fa', 'totp_secret', 'password_changed_at', 'failed_login_count', 'locked_until')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
        ('Dates', {'fields': ('created_at', 'updated_at')}),
    )
    
    readonly_fields = ['created_at', 'updated_at']
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'user_type', 'company_id'),
        }),
    )


@admin.register(SecurityLog)
class SecurityLogAdmin(admin.ModelAdmin):
    list_display = ['event_type', 'severity', 'user', 'company_id', 'ip_address', 'created_at']
    list_filter = ['event_type', 'severity', 'created_at']
    search_fields = ['user__email', 'ip_address']
    readonly_fields = ['event_type', 'severity', 'user', 'company_id', 'ip_address', 'user_agent', 'device_fingerprint', 'metadata', 'created_at']
    ordering = ['-created_at']


@admin.register(ServiceUserSession)
class ServiceUserSessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'company_id', 'session_key', 'created_at', 'expires_at']
    list_filter = ['created_at', 'expires_at']
    search_fields = ['user__email', 'session_key']
    readonly_fields = ['created_at', 'last_activity']
    ordering = ['-created_at']
