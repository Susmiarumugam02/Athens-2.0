from rest_framework import serializers
from .models import PermissionRequest, PermissionGrant

class PermissionRequestSerializer(serializers.ModelSerializer):
    requester_name = serializers.CharField(source='requester.username', read_only=True)
    approver_name = serializers.CharField(source='approver.username', read_only=True)
    object_name = serializers.SerializerMethodField()
    
    class Meta:
        model = PermissionRequest
        fields = ['id', 'requester_name', 'approver_name', 'permission_type', 'status', 
                 'reason', 'object_name', 'created_at', 'approved_at']
    
    def get_object_name(self, obj):
        return str(obj.content_object)

class PermissionGrantSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermissionGrant
        fields = ['id', 'used', 'used_at', 'expires_at']