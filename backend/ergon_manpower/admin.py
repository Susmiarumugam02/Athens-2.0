from django.contrib import admin
from .models import WorkType, ManpowerEntry, DailyManpowerSummary


@admin.register(WorkType)
class WorkTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'athens_tenant_id', 'color_code', 'is_active', 'created_at']
    list_filter = ['is_active', 'athens_tenant_id']
    search_fields = ['name', 'description']
    ordering = ['athens_tenant_id', 'name']


@admin.register(ManpowerEntry)
class ManpowerEntryAdmin(admin.ModelAdmin):
    list_display = ['date', 'category', 'gender', 'count', 'shift', 'athens_tenant_id', 'project_id']
    list_filter = ['date', 'gender', 'shift', 'attendance_status', 'athens_tenant_id']
    search_fields = ['category', 'notes']
    ordering = ['-date', 'category']
    date_hierarchy = 'date'


@admin.register(DailyManpowerSummary)
class DailyManpowerSummaryAdmin(admin.ModelAdmin):
    list_display = ['date', 'total_workers', 'total_hours', 'athens_tenant_id', 'project_id']
    list_filter = ['date', 'athens_tenant_id']
    ordering = ['-date']
    date_hierarchy = 'date'
    readonly_fields = ['created_at', 'updated_at']
