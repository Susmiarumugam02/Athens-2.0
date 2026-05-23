from django.contrib import admin
from django.utils.safestring import mark_safe
from .models import ToolboxTalk, ToolboxTalkAttendance

class ToolboxTalkAttendanceInline(admin.TabularInline):
    model = ToolboxTalkAttendance
    extra = 1
    readonly_fields = ['timestamp']

@admin.register(ToolboxTalk)
class ToolboxTalkAdmin(admin.ModelAdmin):
    list_display = ('title', 'date', 'location', 'conducted_by', 'status', 'created_by', 'has_evidence_photo')
    list_filter = ('status', 'date', 'created_by')
    search_fields = ('title', 'location', 'conducted_by')
    date_hierarchy = 'date'
    inlines = [ToolboxTalkAttendanceInline]
    readonly_fields = ['evidence_photo_preview']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(created_by=request.user)
    
    def has_evidence_photo(self, obj):
        return bool(obj.evidence_photo)
    has_evidence_photo.boolean = True
    has_evidence_photo.short_description = 'Evidence Photo'
    
    def evidence_photo_preview(self, obj):
        if obj.evidence_photo:
            return mark_safe(f'<img src="{obj.evidence_photo.url}" width="300" />')
        return "No evidence photo"
    evidence_photo_preview.short_description = 'Evidence Photo Preview'
    
    fieldsets = (
        (None, {
            'fields': ('title', 'description', 'date', 'duration', 'duration_unit', 'location', 'conducted_by', 'status', 'created_by')
        }),
        ('Evidence', {
            'fields': ('evidence_photo', 'evidence_photo_preview')
        }),
    )

@admin.register(ToolboxTalkAttendance)
class ToolboxTalkAttendanceAdmin(admin.ModelAdmin):
    list_display = ('worker', 'toolbox_talk', 'status', 'match_score', 'timestamp')
    list_filter = ('status', 'toolbox_talk')
    search_fields = ('worker__name', 'worker__worker_id', 'toolbox_talk__title')
    readonly_fields = ['timestamp']
