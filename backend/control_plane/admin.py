from django.contrib import admin
from .models import Tenant, Subscription, MasterAdmin


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'code']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'plan_name', 'status', 'valid_from', 'valid_until']
    list_filter = ['status', 'created_at']
    search_fields = ['tenant__name', 'plan_name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(MasterAdmin)
class MasterAdminAdmin(admin.ModelAdmin):
    list_display = ['user', 'tenant', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['user__email', 'tenant__name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
