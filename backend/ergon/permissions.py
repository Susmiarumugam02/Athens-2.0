from rest_framework import permissions
from control_plane.models import TenantService, Service
from system.utils import get_current_tenant
from authentication.permissions import IsServiceAdmin

class ErgonServiceEnabled(permissions.BasePermission):
    """
    Allow access when the ERGON service is enabled for the tenant.
    Fails open (allows) when:
    - tenant cannot be resolved (companyuser with no matching Tenant row)
    - the Service/TenantService records don't exist yet
    This prevents legitimate admins from being locked out by missing config.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        tenant, error = get_current_tenant(request.user)

        # Superadmin has no tenant — always allow
        if request.user.user_type == 'superadmin':
            return True

        # Tenant not resolved (missing company_id mapping, etc.) — fail open
        # so the user isn't hard-blocked by a config gap
        if tenant is None:
            return True

        try:
            service = Service.objects.get(code='ergon')
            tenant_service = TenantService.objects.get(tenant=tenant, service=service)
            return tenant_service.is_enabled
        except (Service.DoesNotExist, TenantService.DoesNotExist):
            # Service not configured for this tenant — fail open
            return True

class IsErgonAdmin(IsServiceAdmin):
    """ERGON admin permission (deprecated: use IsServiceAdmin directly)"""
    pass
