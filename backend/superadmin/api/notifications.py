from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from superadmin.models import Announcement, NotificationDelivery
from superadmin.serializers import AnnouncementSerializer, NotificationDeliverySerializer
from superadmin.permissions import IsSuperAdmin
from superadmin.services.audit import log_audit, get_client_ip, get_user_agent
from authentication.models import User, UserType


class AnnouncementViewSet(viewsets.ModelViewSet):
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get_queryset(self):
        queryset = Announcement.objects.all()
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by type
        announcement_type = self.request.query_params.get('type')
        if announcement_type:
            queryset = queryset.filter(type=announcement_type)
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        announcement = serializer.save(created_by=self.request.user)
        
        # Create delivery records
        self._create_deliveries(announcement)
        
        log_audit(
            user=self.request.user,
            action='notifications.create_announcement',
            module='notifications',
            resource_type='Announcement',
            resource_id=str(announcement.id),
            ip_address=get_client_ip(self.request),
            user_agent=get_user_agent(self.request),
            request_data=self.request.data,
        )
    
    def _create_deliveries(self, announcement):
        """Create notification delivery records for target audience"""
        if announcement.target_audience == 'all':
            users = User.objects.filter(user_type=UserType.SUPERADMIN, is_active=True)
        else:
            users = User.objects.filter(
                user_type=UserType.SUPERADMIN,
                is_active=True,
                superadmin_roles__role__in=announcement.target_roles.all()
            ).distinct()
        
        deliveries = [
            NotificationDelivery(
                announcement=announcement,
                user=user,
                delivery_status='pending'
            )
            for user in users
        ]
        NotificationDelivery.objects.bulk_create(deliveries)
    
    @action(detail=True, methods=['get'])
    def delivery_status(self, request, pk=None):
        """Get delivery status for an announcement"""
        announcement = self.get_object()
        deliveries = NotificationDelivery.objects.filter(
            announcement=announcement
        ).select_related('user')
        
        serializer = NotificationDeliverySerializer(deliveries, many=True)
        
        stats = {
            'total': deliveries.count(),
            'pending': deliveries.filter(delivery_status='pending').count(),
            'delivered': deliveries.filter(delivery_status='delivered').count(),
            'read': deliveries.filter(delivery_status='read').count(),
            'failed': deliveries.filter(delivery_status='failed').count(),
        }
        
        return Response({
            'stats': stats,
            'deliveries': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """Activate/deactivate announcement"""
        announcement = self.get_object()
        announcement.is_active = not announcement.is_active
        announcement.save()
        
        log_audit(
            user=request.user,
            action='notifications.toggle_announcement',
            module='notifications',
            resource_type='Announcement',
            resource_id=str(announcement.id),
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
        )
        
        return Response({
            'message': f"Announcement {'activated' if announcement.is_active else 'deactivated'}",
            'is_active': announcement.is_active
        })


class NotificationDeliveryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationDeliverySerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get_queryset(self):
        return NotificationDelivery.objects.select_related(
            'announcement', 'user'
        ).all().order_by('-delivered_at')
