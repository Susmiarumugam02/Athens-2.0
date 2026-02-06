from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from authentication.permissions import IsSuperAdmin
from authentication.models import User, UserType, SecurityLog
from authentication.utils import log_security_event
from .models import Tenant, Subscription, MasterAdmin
from .serializers import (
    TenantSerializer, SubscriptionSerializer, MasterAdminSerializer,
    SecurityLogSerializer
)


class TenantViewSet(viewsets.ModelViewSet):
    """Tenant management for superadmin"""
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def perform_create(self, serializer):
        tenant = serializer.save(created_by=self.request.user)
        log_security_event(
            self.request, self.request.user,
            SecurityLog.EventType.TENANT_CREATED,
            SecurityLog.Severity.INFO,
            {'tenant_id': tenant.id, 'tenant_name': tenant.name}
        )
    
    @action(detail=True, methods=['post'])
    def disable(self, request, pk=None):
        """Disable a tenant"""
        tenant = self.get_object()
        tenant.is_active = False
        tenant.save()
        
        log_security_event(
            request, request.user,
            SecurityLog.EventType.TENANT_DISABLED,
            SecurityLog.Severity.WARNING,
            {'tenant_id': tenant.id, 'tenant_name': tenant.name}
        )
        
        return Response({'message': 'Tenant disabled'})
    
    @action(detail=True, methods=['post'])
    def enable(self, request, pk=None):
        """Enable a tenant"""
        tenant = self.get_object()
        tenant.is_active = True
        tenant.save()
        
        log_security_event(
            request, request.user,
            SecurityLog.EventType.TENANT_CREATED,
            SecurityLog.Severity.INFO,
            {'tenant_id': tenant.id, 'tenant_name': tenant.name, 'action': 'enabled'}
        )
        
        return Response({'message': 'Tenant enabled'})


class SubscriptionViewSet(viewsets.ModelViewSet):
    """Subscription management for superadmin"""
    queryset = Subscription.objects.all()
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def perform_create(self, serializer):
        subscription = serializer.save(created_by=self.request.user)
        log_security_event(
            self.request, self.request.user,
            SecurityLog.EventType.SUBSCRIPTION_CHANGED,
            SecurityLog.Severity.INFO,
            {
                'subscription_id': subscription.id,
                'tenant_id': subscription.tenant.id,
                'plan': subscription.plan_name
            }
        )


class MasterAdminViewSet(viewsets.ModelViewSet):
    """Master admin management for superadmin"""
    queryset = MasterAdmin.objects.select_related('user', 'tenant').all()
    serializer_class = MasterAdminSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def perform_create(self, serializer):
        master = serializer.save(created_by=self.request.user)
        log_security_event(
            self.request, self.request.user,
            SecurityLog.EventType.MASTER_CREATED,
            SecurityLog.Severity.INFO,
            {
                'master_id': master.id,
                'user_email': master.user.email,
                'tenant_id': master.tenant.id
            }
        )
    
    @action(detail=True, methods=['post'])
    def disable(self, request, pk=None):
        """Disable a master admin"""
        master = self.get_object()
        master.is_active = False
        master.user.is_active = False
        master.save()
        master.user.save()
        
        log_security_event(
            request, request.user,
            SecurityLog.EventType.MASTER_DISABLED,
            SecurityLog.Severity.WARNING,
            {'master_id': master.id, 'user_email': master.user.email}
        )
        
        return Response({'message': 'Master admin disabled'})
    
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Reset master admin password"""
        master = self.get_object()
        new_password = User.objects.make_random_password()
        master.user.set_password(new_password)
        master.user.password_changed_at = timezone.now()
        master.user.save()
        
        log_security_event(
            request, request.user,
            SecurityLog.EventType.PASSWORD_CHANGE,
            SecurityLog.Severity.INFO,
            {'master_id': master.id, 'user_email': master.user.email, 'action': 'admin_reset'}
        )
        
        return Response({
            'message': 'Password reset',
            'new_password': new_password
        })


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Audit log viewing for superadmin"""
    queryset = SecurityLog.objects.all()
    serializer_class = SecurityLogSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        
        # Filter by company
        company_id = self.request.query_params.get('company_id')
        if company_id:
            queryset = queryset.filter(company_id=company_id)
        
        # Filter by user
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filter by event type
        event_type = self.request.query_params.get('event_type')
        if event_type:
            queryset = queryset.filter(event_type=event_type)
        
        return queryset
