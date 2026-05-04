from django.contrib import admin
from .models import Tenant, Subscription, Service, TenantService


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


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'service_type', 'is_active']
    list_filter = ['service_type', 'is_active']
    search_fields = ['name', 'code']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(TenantService)
class TenantServiceAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'service', 'tier', 'is_enabled', 'enabled_at']
    list_filter = ['tier', 'is_enabled', 'service__service_type']
    search_fields = ['tenant__name', 'service__name']
    readonly_fields = ['enabled_at', 'disabled_at']
    list_editable = ['tier']
    ordering = ['-enabled_at']
