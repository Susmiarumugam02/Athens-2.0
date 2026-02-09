from django.contrib import admin
from .models import (
    EnvironmentAspect, GenerationData, EmissionFactor, 
    GHGActivity, WasteManifest, BiodiversityEvent, 
    ESGPolicy, Grievance
)

@admin.register(EnvironmentAspect)
class EnvironmentAspectAdmin(admin.ModelAdmin):
    list_display = ['aspect_type', 'site', 'severity', 'likelihood', 'significance', 'created_at']
    list_filter = ['aspect_type', 'severity', 'likelihood', 'site']
    search_fields = ['description', 'site__projectName']

@admin.register(GenerationData)
class GenerationDataAdmin(admin.ModelAdmin):
    list_display = ['asset_id', 'asset_type', 'kwh', 'timestamp', 'site']
    list_filter = ['asset_type', 'site', 'timestamp']
    search_fields = ['asset_id', 'site__projectName']

@admin.register(EmissionFactor)
class EmissionFactorAdmin(admin.ModelAdmin):
    list_display = ['source', 'factor_value', 'unit', 'scope', 'is_active']
    list_filter = ['scope', 'is_active']
    search_fields = ['source']

@admin.register(GHGActivity)
class GHGActivityAdmin(admin.ModelAdmin):
    list_display = ['activity_type', 'category_scope', 'quantity', 'ghg_co2e', 'site', 'created_at']
    list_filter = ['category_scope', 'site', 'created_at']
    search_fields = ['activity_type', 'site__projectName']

@admin.register(WasteManifest)
class WasteManifestAdmin(admin.ModelAdmin):
    list_display = ['waste_type', 'quantity', 'uom', 'status', 'site', 'created_at']
    list_filter = ['status', 'site', 'created_at']
    search_fields = ['waste_type', 'site__projectName']

@admin.register(BiodiversityEvent)
class BiodiversityEventAdmin(admin.ModelAdmin):
    list_display = ['species', 'date', 'severity', 'site', 'created_at']
    list_filter = ['severity', 'site', 'date']
    search_fields = ['species', 'site__projectName']

@admin.register(ESGPolicy)
class ESGPolicyAdmin(admin.ModelAdmin):
    list_display = ['title', 'version', 'status', 'effective_date', 'created_at']
    list_filter = ['status', 'effective_date']
    search_fields = ['title']

@admin.register(Grievance)
class GrievanceAdmin(admin.ModelAdmin):
    list_display = ['type', 'source', 'status', 'assigned_to', 'site', 'created_at']
    list_filter = ['source', 'status', 'site']
    search_fields = ['type', 'description']