from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction

from authentication.permissions import IsSuperAdmin
from authentication.models import User, UserType, SecurityLog
from authentication.utils import log_security_event
from authentication.tenant_utils import get_tenant_for_user
from .models import Tenant, Subscription, AthensTenantLink, AthensModuleSubscription, AthensAuditLog, DEFAULT_ATHENS_MODULES, Service, TenantService
from .serializers import (
    TenantSerializer, SubscriptionSerializer,
    SecurityLogSerializer, MasterAdminSerializer, MasterAdminCreateSerializer
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
    
    def destroy(self, request, *args, **kwargs):
        """Delete tenant - simple cascade delete"""
        tenant = self.get_object()
        tenant_id = tenant.id
        tenant_name = tenant.name
        
        try:
            tenant.delete()
            log_security_event(
                request, request.user,
                'tenant_deleted',
                SecurityLog.Severity.WARNING,
                {'tenant_id': tenant_id, 'tenant_name': tenant_name}
            )
            return Response({'message': 'Tenant deleted successfully'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
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

    @action(detail=True, methods=['post'])
    def sync_athens(self, request, pk=None):
        """Sync tenant with Athens - create AthensTenantLink if missing"""
        tenant = self.get_object()
        
        athens_link, created = AthensTenantLink.objects.get_or_create(
            tenant=tenant,
            defaults={
                'created_by': request.user,
                'enabled_modules': DEFAULT_ATHENS_MODULES.copy(),
                'is_active': True
            }
        )
        
        if not created:
            athens_link.synced_at = timezone.now()
            athens_link.save()
        
        AthensAuditLog.objects.create(
            actor=request.user,
            action='tenant_synced',
            entity_type='tenant',
            entity_id=str(tenant.id),
            after_data={'enabled_modules': athens_link.enabled_modules}
        )
        
        return Response({
            'status': 'synced',
            'created': created,
            'enabled_modules': athens_link.enabled_modules
        })

    @action(detail=True, methods=['get', 'patch'])
    def athens_modules(self, request, pk=None):
        """Get or update Athens modules for tenant"""
        tenant = self.get_object()
        
        try:
            athens_link = tenant.athens_link
        except AthensTenantLink.DoesNotExist:
            return Response({'error': 'Athens tenant link not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if request.method == 'GET':
            return Response({
                'enabled_modules': athens_link.enabled_modules,
                'available_modules': DEFAULT_ATHENS_MODULES
            })
        
        elif request.method == 'PATCH':
            enabled_modules = request.data.get('enabled_modules', [])
            
            # Validate modules
            invalid = [m for m in enabled_modules if m not in DEFAULT_ATHENS_MODULES]
            if invalid:
                return Response(
                    {'error': f'Invalid modules: {invalid}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            before_data = {'enabled_modules': athens_link.enabled_modules}
            athens_link.enabled_modules = enabled_modules
            athens_link.save()
            
            # Update module subscriptions
            AthensModuleSubscription.objects.filter(tenant=tenant).delete()
            for module_code in enabled_modules:
                AthensModuleSubscription.objects.create(
                    tenant=tenant,
                    module_code=module_code,
                    enabled=True
                )
            
            AthensAuditLog.objects.create(
                actor=request.user,
                action='modules_updated',
                entity_type='tenant',
                entity_id=str(tenant.id),
                before_data=before_data,
                after_data={'enabled_modules': enabled_modules}
            )
            
            return Response({'enabled_modules': enabled_modules, 'status': 'updated'})


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


class AthensAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Athens audit log viewing for superadmin"""
    queryset = AthensAuditLog.objects.all()
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def list(self, request):
        queryset = self.get_queryset()
        
        # Filter by query parameters
        tenant_id = request.query_params.get('tenant_id')
        actor_id = request.query_params.get('actor_id')
        action = request.query_params.get('action')
        from_date = request.query_params.get('from')
        to_date = request.query_params.get('to')
        
        if tenant_id:
            queryset = queryset.filter(entity_id=tenant_id, entity_type='tenant')
        if actor_id:
            queryset = queryset.filter(actor_id=actor_id)
        if action:
            queryset = queryset.filter(action=action)
        if from_date:
            queryset = queryset.filter(created_at__gte=from_date)
        if to_date:
            queryset = queryset.filter(created_at__lte=to_date)
        
        data = []
        for log in queryset:
            data.append({
                'id': log.id,
                'actor': log.actor.email if log.actor else None,
                'action': log.action,
                'entity_type': log.entity_type,
                'entity_id': log.entity_id,
                'before_data': log.before_data,
                'after_data': log.after_data,
                'ip_address': log.ip_address,
                'created_at': log.created_at
            })
        
        return Response(data)


class TenantServiceViewSet(viewsets.ReadOnlyModelViewSet):
    """Tenant service management for superadmin"""
    queryset = TenantService.objects.all()
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def list(self, request):
        tenant_services = TenantService.objects.select_related('tenant', 'service').all()
        data = []
        for ts in tenant_services:
            data.append({
                'id': ts.id,
                'tenant': ts.tenant.id,
                'service_code': ts.service.code,
                'is_enabled': ts.is_enabled,
                'enabled_at': ts.enabled_at,
                'disabled_at': ts.disabled_at
            })
        return Response(data)
    
    @action(detail=False, methods=['post'], url_path='toggle')
    def toggle(self, request):
        """Toggle service for a tenant"""
        tenant_id = request.data.get('tenant_id')
        service_code = request.data.get('service_code')
        enable = request.data.get('enable', True)
        
        try:
            tenant = Tenant.objects.get(id=tenant_id)
            service = Service.objects.get(code=service_code)
        except (Tenant.DoesNotExist, Service.DoesNotExist):
            return Response({'error': 'Tenant or Service not found'}, status=status.HTTP_404_NOT_FOUND)
        
        ts, created = TenantService.objects.get_or_create(
            tenant=tenant,
            service=service,
            defaults={'created_by': request.user, 'is_enabled': enable}
        )
        
        if not created:
            ts.is_enabled = enable
            if enable:
                ts.enabled_at = timezone.now()
                ts.disabled_at = None
            else:
                ts.disabled_at = timezone.now()
            ts.save()
        
        log_security_event(
            request, request.user,
            'service_toggled',
            SecurityLog.Severity.INFO,
            {'tenant_id': tenant_id, 'service_code': service_code, 'enabled': enable}
        )
        
        return Response({'message': 'Service toggled', 'is_enabled': ts.is_enabled})


class MasterAdminViewSet(viewsets.ModelViewSet):
    """Master Admin management for superadmin"""
    queryset = User.objects.filter(user_type=UserType.MASTERADMIN)
    serializer_class = MasterAdminSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return MasterAdminCreateSerializer
        return MasterAdminSerializer
    
    def perform_create(self, serializer):
        master_admin = serializer.save()
        log_security_event(
            self.request, self.request.user,
            SecurityLog.EventType.MASTER_CREATED,
            SecurityLog.Severity.INFO,
            {'master_admin_id': master_admin.id, 'email': master_admin.email}
        )
    
    def update(self, request, *args, **kwargs):
        """Update master admin"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Get data
        data = request.data.copy()
        
        # Update fields
        if 'name' in data:
            instance.name = data['name']
        if 'surname' in data:
            instance.surname = data['surname']
        if 'athens_tenant_id' in data:
            tenant_id = data['athens_tenant_id']
            try:
                tenant = Tenant.objects.get(id=tenant_id)
                instance.tenant = tenant
                instance.athens_tenant_id = tenant.id
                instance.company_id = tenant.id
            except Tenant.DoesNotExist:
                return Response(
                    {'error': 'Tenant not found'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        instance.save()
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """Delete master admin"""
        instance = self.get_object()
        email = instance.email
        user_id = instance.id
        
        # Just delete - all FKs are SET_NULL
        instance.delete()
        
        log_security_event(
            request, request.user,
            SecurityLog.EventType.MASTER_DISABLED,
            SecurityLog.Severity.WARNING,
            {'deleted_user_id': user_id, 'email': email}
        )
        
        return Response(status=status.HTTP_204_NO_CONTENT)
