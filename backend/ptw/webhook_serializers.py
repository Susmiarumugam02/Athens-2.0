from rest_framework import serializers
from .models import WebhookEndpoint, WebhookDeliveryLog


class WebhookEndpointSerializer(serializers.ModelSerializer):
    secret_masked = serializers.SerializerMethodField()
    
    class Meta:
        model = WebhookEndpoint
        fields = [
            'id', 'name', 'project', 'url', 'enabled', 'events',
            'created_at', 'updated_at', 'last_sent_at', 'last_status_code',
            'last_error', 'secret_masked'
        ]
        read_only_fields = ['created_at', 'updated_at', 'last_sent_at', 'last_status_code', 'last_error']
    
    def get_secret_masked(self, obj):
        if obj.secret:
            return f"{'*' * 8}{obj.secret[-4:]}"
        return None
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class WebhookEndpointCreateSerializer(serializers.ModelSerializer):
    """Separate serializer for creation to include secret"""
    
    class Meta:
        model = WebhookEndpoint
        fields = ['id', 'name', 'project', 'url', 'secret', 'enabled', 'events']
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class WebhookDeliveryLogSerializer(serializers.ModelSerializer):
    webhook_name = serializers.CharField(source='webhook.name', read_only=True)
    
    class Meta:
        model = WebhookDeliveryLog
        fields = [
            'id', 'webhook', 'webhook_name', 'event', 'permit_id',
            'response_code', 'error', 'status', 'sent_at', 'retry_count'
        ]
        read_only_fields = fields
