from django.contrib import admin
from .models import Inspection, InspectionItem, InspectionReport

@admin.register(Inspection)
class InspectionAdmin(admin.ModelAdmin):
    list_display = ['title', 'inspection_type', 'status', 'priority', 'inspector', 'scheduled_date', 'created_at']
    list_filter = ['inspection_type', 'status', 'priority', 'created_at']
    search_fields = ['title', 'description', 'location']
    readonly_fields = ['id', 'created_at', 'updated_at']

@admin.register(InspectionItem)
class InspectionItemAdmin(admin.ModelAdmin):
    list_display = ['inspection', 'item_number', 'compliance_status', 'created_at']
    list_filter = ['compliance_status', 'created_at']
    search_fields = ['description', 'findings']

@admin.register(InspectionReport)
class InspectionReportAdmin(admin.ModelAdmin):
    list_display = ['inspection', 'overall_score', 'total_items', 'compliant_items', 'report_date']
    readonly_fields = ['id', 'report_date']