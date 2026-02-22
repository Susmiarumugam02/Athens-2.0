from rest_framework import permissions
from control_plane.models import TenantService, Service
from system.utils import get_current_tenant
from authentication.permissions import IsServiceAdmin


class WorkforceServiceEnabled(permissions.BasePermission):
    """Check if Workforce service is enabled for tenant"""
    
    def has_permission(self, request, view):
        tenant, error = get_current_tenant(request.user)
        if error:
            return False
        
        try:
            service = Service.objects.get(code='workforce')
            tenant_service = TenantService.objects.get(tenant=tenant, service=service)
            if not tenant_service.is_enabled:
                self.message = {'error': 'SERVICE_DISABLED', 'detail': 'Workforce service is not enabled'}
                return False
            return True
        except (Service.DoesNotExist, TenantService.DoesNotExist):
            self.message = {'error': 'SERVICE_NOT_FOUND', 'detail': 'Workforce service not configured'}
            return False


class IsWorkforceAdmin(IsServiceAdmin):
    """Owner/Admin can manage workforce (deprecated: use IsServiceAdmin directly)"""
    pass
