from django.contrib import admin
from .models import SafetyObservation, SafetyObservationFile


@admin.register(SafetyObservation)
class SafetyObservationAdmin(admin.ModelAdmin):
    list_display = ['observationID', 'typeOfObservation', 'severity', 'observationStatus', 'correctiveActionAssignedTo', 'created_at']
    list_filter = ['observationStatus', 'typeOfObservation', 'severity', 'created_at']
    search_fields = ['observationID', 'workLocation', 'correctiveActionAssignedTo']
    readonly_fields = ['observationID', 'created_at', 'updated_at']


@admin.register(SafetyObservationFile)
class SafetyObservationFileAdmin(admin.ModelAdmin):
    list_display = ['safety_observation', 'file_name', 'file_type', 'uploaded_at', 'uploaded_by']
    list_filter = ['file_type', 'uploaded_at']
    search_fields = ['file_name', 'safety_observation__observationID']
