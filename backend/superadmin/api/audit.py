from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.db.models import Q, Count
import csv
from datetime import datetime

from superadmin.models import AuditLog
from superadmin.serializers import AuditLogSerializer
from superadmin.permissions import IsSuperAdmin


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get_queryset(self):
        queryset = AuditLog.objects.select_related('user').all()
        
        # Date range filter
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(timestamp__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__lte=end_date)
        
        # User filter
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Action filter
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action__icontains=action)
        
        # Module filter
        module = self.request.query_params.get('module')
        if module:
            queryset = queryset.filter(module=module)
        
        # Status filter
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # IP address filter
        ip_address = self.request.query_params.get('ip_address')
        if ip_address:
            queryset = queryset.filter(ip_address=ip_address)
        
        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(action__icontains=search) |
                Q(module__icontains=search) |
                Q(resource_type__icontains=search)
            )
        
        return queryset.order_by('-timestamp')
    
    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export audit logs to CSV"""
        queryset = self.get_queryset()[:10000]  # Limit to 10k records
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="audit_logs_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Timestamp', 'User', 'Action', 'Module', 'Resource Type',
            'Resource ID', 'IP Address', 'Status'
        ])
        
        for log in queryset:
            writer.writerow([
                log.timestamp,
                log.user.email if log.user else 'N/A',
                log.action,
                log.module,
                log.resource_type,
                log.resource_id,
                log.ip_address,
                log.status,
            ])
        
        return response
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get audit log statistics"""
        queryset = self.get_queryset()
        
        stats = {
            'total_count': queryset.count(),
            'success_count': queryset.filter(status='success').count(),
            'failure_count': queryset.filter(status='failure').count(),
            'by_module': {},
            'by_action': {},
        }
        
        # Group by module
        for module in queryset.values_list('module', flat=True).distinct():
            stats['by_module'][module] = queryset.filter(module=module).count()
        
        # Group by action (top 10)
        from django.db import models
        actions = queryset.values('action').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        for action in actions:
            stats['by_action'][action['action']] = action['count']
        
        return Response(stats)
