from django.contrib import admin
from .models import Worker

@admin.register(Worker)
class WorkerAdmin(admin.ModelAdmin):
    list_display = ('worker_id', 'name', 'surname', 'designation', 'department', 'status')
    list_filter = ('status', 'employment_type', 'category', 'department', 'designation')
    search_fields = ('worker_id', 'name', 'surname', 'aadhaar', 'phone_number')
    readonly_fields = ('worker_id', 'created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('worker_id', 'name', 'surname', 'father_or_spouse_name', 'date_of_birth', 
                      'gender', 'nationality', 'photo')
        }),
        ('Education', {
            'fields': ('education_level', 'education_other')
        }),
        ('Employment Details', {
            'fields': ('date_of_joining', 'designation', 'category', 'employment_type', 'department')
        }),
        ('Contact Information', {
            'fields': ('phone_number', 'present_address', 'permanent_address')
        }),
        ('Identification', {
            'fields': ('uan', 'pan', 'aadhaar', 'esic_ip', 'lwf', 'mark_of_identification')
        }),
        ('Status', {
            'fields': ('status',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at')
        }),
    )