from django.contrib import admin
from django.utils.safestring import mark_safe
from .models import JobTraining, JobTrainingAttendance

class JobTrainingAttendanceInline(admin.TabularInline):
    model = JobTrainingAttendance
    extra = 1
    readonly_fields = ['timestamp']

@admin.register(JobTraining)
class JobTrainingAdmin(admin.ModelAdmin):
    list_display = ('title', 'date', 'location', 'conducted_by', 'status', 'created_by')
    list_filter = ('status', 'date', 'created_by')
    search_fields = ('title', 'location', 'conducted_by')
    date_hierarchy = 'date'
    inlines = [JobTrainingAttendanceInline]
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(created_by=request.user)
    
    fieldsets = (
        (None, {
            'fields': ('title', 'description', 'date', 'location', 'conducted_by', 'status', 'created_by')
        }),
    )

@admin.register(JobTrainingAttendance)
class JobTrainingAttendanceAdmin(admin.ModelAdmin):
    list_display = ('job_training', 'worker', 'status', 'timestamp')
    list_filter = ('status', 'timestamp')
    search_fields = ('job_training__title', 'worker__name', 'worker__worker_id')
    readonly_fields = ['attendance_photo_preview', 'timestamp']
    
    def attendance_photo_preview(self, obj):
        if obj.attendance_photo:
            return mark_safe(f'<img src="{obj.attendance_photo}" width="300" />')
        return "No attendance photo"
    attendance_photo_preview.short_description = 'Attendance Photo Preview'