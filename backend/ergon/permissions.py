from rest_framework import permissions
from control_plane.models import TenantService, Service
from system.utils import get_current_tenant

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

class IsErgonAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.user_type == 'masteradmin' or request.user.admin_type
