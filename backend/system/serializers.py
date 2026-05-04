from rest_framework import serializers
from control_plane.models import Service, TenantService


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['id', 'name', 'code', 'description', 'service_type', 'base_url', 'icon', 'is_active']


class TenantServiceSerializer(serializers.ModelSerializer):
    service = ServiceSerializer(read_only=True)
    
    class Meta:
        model = TenantService
        fields = ['id', 'service', 'tier', 'is_enabled', 'enabled_at']
