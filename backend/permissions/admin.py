from django.contrib import admin
from .models import PermissionRequest, PermissionGrant

@admin.register(PermissionRequest)
class PermissionRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'requester', 'approver', 'permission_type', 'status', 'created_at']
    list_filter = ['permission_type', 'status', 'created_at']
    search_fields = ['requester__username', 'approver__username', 'reason']
    readonly_fields = ['created_at']

@admin.register(PermissionGrant)
class PermissionGrantAdmin(admin.ModelAdmin):
    list_display = ['id', 'permission_request', 'used', 'used_at', 'expires_at']
    list_filter = ['used', 'expires_at']
    readonly_fields = ['used_at']