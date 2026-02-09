from rest_framework import serializers
from .models import (
    EnvironmentAspect, GenerationData, EmissionFactor,
    GHGActivity, WasteManifest, BiodiversityEvent,
    ESGPolicy, Grievance, EnvironmentalMonitoring,
    CarbonFootprint, WaterManagement, EnergyManagement,
    EnvironmentalIncident, SustainabilityTarget
)

class EnvironmentAspectSerializer(serializers.ModelSerializer):
    risk_level = serializers.ReadOnlyField()
    compliance_status = serializers.ReadOnlyField()
    
    class Meta:
        model = EnvironmentAspect
        fields = '__all__'
        read_only_fields = ['significance', 'risk_level', 'compliance_status', 'created_by', 'created_at', 'updated_at']

class GenerationDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = GenerationData
        fields = '__all__'
        read_only_fields = ['co2_avoided_kg', 'created_at']

class EmissionFactorSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmissionFactor
        fields = '__all__'

class GHGActivitySerializer(serializers.ModelSerializer):
    emission_factor_name = serializers.CharField(source='emission_factor.source', read_only=True)
    
    class Meta:
        model = GHGActivity
        fields = '__all__'
        read_only_fields = ['ghg_co2e', 'created_by', 'created_at']

class WasteManifestSerializer(serializers.ModelSerializer):
    transporter_name = serializers.CharField(source='transporter.name', read_only=True)
    
    class Meta:
        model = WasteManifest
        fields = '__all__'
        read_only_fields = ['manifest_number', 'created_by', 'created_at', 'updated_at']

class BiodiversityEventSerializer(serializers.ModelSerializer):
    related_incident_id = serializers.CharField(source='related_incident.incident_id', read_only=True)
    
    class Meta:
        model = BiodiversityEvent
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']

class ESGPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = ESGPolicy
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at']

class GrievanceSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    
    class Meta:
        model = Grievance
        fields = '__all__'
        read_only_fields = ['created_at']

# === ADVANCED ENVIRONMENTAL SERIALIZERS ===

class EnvironmentalMonitoringSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnvironmentalMonitoring
        fields = '__all__'
        read_only_fields = ['compliance_status', 'created_by', 'created_at']

class CarbonFootprintSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarbonFootprint
        fields = '__all__'
        read_only_fields = ['co2_equivalent_tonnes', 'created_by', 'created_at']

class WaterManagementSerializer(serializers.ModelSerializer):
    class Meta:
        model = WaterManagement
        fields = '__all__'
        read_only_fields = ['recycling_rate', 'created_by', 'created_at']

class EnergyManagementSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnergyManagement
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at']

class EnvironmentalIncidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnvironmentalIncident
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']

class SustainabilityTargetSerializer(serializers.ModelSerializer):
    class Meta:
        model = SustainabilityTarget
        fields = '__all__'
        read_only_fields = ['progress_percentage', 'on_track', 'created_by', 'created_at', 'updated_at', 'site']