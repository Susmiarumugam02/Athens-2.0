from rest_framework import permissions
from control_plane.models import TenantService, Service
from system.utils import get_current_tenant
from authentication.permissions import IsServiceAdmin

class ErgonServiceEnabled(permissions.BasePermission):
    def has_permission(self, request, view):
        tenant, error = get_current_tenant(request.user)
        if error:
            return False
        
        try:
            service = Service.objects.get(code='ergon')
            tenant_service = TenantService.objects.get(tenant=tenant, service=service)
            return tenant_service.is_enabled
        except (Service.DoesNotExist, TenantService.DoesNotExist):
            return False

class IsErgonAdmin(IsServiceAdmin):
    """ERGON admin permission (deprecated: use IsServiceAdmin directly)"""
    pass
