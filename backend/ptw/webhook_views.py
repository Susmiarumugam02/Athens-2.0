from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import models
from .models import WebhookEndpoint, WebhookDeliveryLog
from .webhook_serializers import (
    WebhookEndpointSerializer,
    WebhookEndpointCreateSerializer,
    WebhookDeliveryLogSerializer
)
from .webhook_dispatcher import send_webhook
from .permissions import CanManagePermits


class WebhookEndpointViewSet(viewsets.ModelViewSet):
    """
    Webhook endpoint management (admin only)
    """
    permission_classes = [IsAuthenticated, CanManagePermits]
    
    def get_queryset(self):
        """Filter by project scope"""
        user = self.request.user
        qs = WebhookEndpoint.objects.all()
        
        # Project scoping
        if hasattr(user, 'project') and user.project:
            qs = qs.filter(models.Q(project=user.project) | models.Q(project__isnull=True))
        
        return qs.order_by('-created_at')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return WebhookEndpointCreateSerializer
        return WebhookEndpointSerializer
    
    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Test webhook endpoint with sample payload"""
        webhook = self.get_object()
        
        # Create test payload
        from .models import Permit
        test_permit = Permit.objects.filter(project=webhook.project).first()
        
        if not test_permit:
            return Response(
                {'error': 'No permits available for testing'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Send test webhook
        try:
            send_webhook(webhook, 'webhook_test', test_permit, {'test': True})
            return Response({'message': 'Test webhook sent successfully'})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def deliveries(self, request, pk=None):
        """Get delivery logs for this webhook"""
        webhook = self.get_object()
        logs = WebhookDeliveryLog.objects.filter(webhook=webhook).order_by('-sent_at')[:50]
        serializer = WebhookDeliveryLogSerializer(logs, many=True)
        return Response(serializer.data)
