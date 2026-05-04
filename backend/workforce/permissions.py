from rest_framework import permissions
from control_plane.models import TenantService, Service
from system.utils import get_current_tenant
from authentication.permissions import IsServiceAdmin


class WorkforceServiceEnabled(permissions.BasePermission):
    """Check if Workforce service is enabled for tenant.
    MasterAdmin and SuperAdmin always bypass this check.
    """
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # MasterAdmin, SuperAdmin, and project admins (EPC/Client/Contractor) always have access
        if user.user_type in ('masteradmin', 'superadmin'):
            return True
        if user.user_type == 'companyuser' and getattr(user, 'admin_type', None):
            return True

        tenant, error = get_current_tenant(user)
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
