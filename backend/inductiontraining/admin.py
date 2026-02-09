from django.contrib import admin
from .models import InductionTraining, InductionAttendance

class InductionAttendanceInline(admin.TabularInline):
    model = InductionAttendance
    extra = 1
    fields = ('worker_id', 'worker_name', 'status')

@admin.register(InductionTraining)
class InductionTrainingAdmin(admin.ModelAdmin):
    list_display = ('title', 'date', 'location', 'conducted_by', 'status', 'created_by')
    list_filter = ('status', 'date')
    search_fields = ('title', 'description', 'location')
    date_hierarchy = 'date'
    inlines = [InductionAttendanceInline]
    fieldsets = (
        (None, {
            'fields': ('title', 'description', 'date', 'location', 'conducted_by', 'status', 'created_by')
        }),
    )

@admin.register(InductionAttendance)
class InductionAttendanceAdmin(admin.ModelAdmin):
    list_display = ('worker_name', 'worker_id', 'induction', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('worker_name',)
