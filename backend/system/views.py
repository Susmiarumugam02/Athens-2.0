from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError

from authentication.permissions import IsServiceAdmin
from .serializers import ServiceSerializer, TenantServiceSerializer
from .utils import get_current_tenant
from .service_manager import ServiceManager
from .api_response import ok, fail


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return ok(data={"status": "ok"}, request=request)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_services(request):
    """List all available services"""
    services = ServiceManager.get_available_services()
    serializer = ServiceSerializer(services, many=True)
    return ok(data=serializer.data, request=request)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_tenant_services(request):
    """List enabled services for current tenant or specific tenant (Superadmin)"""
    # Superadmin can query services for any tenant
    if request.user.user_type == 'superadmin':
        tenant_id = request.query_params.get('tenant_id')
        if not tenant_id:
            # Return all tenant services for all tenants
            from control_plane.models import TenantService
            tenant_services = TenantService.objects.filter(is_enabled=True).select_related('service', 'tenant')
            serializer = TenantServiceSerializer(tenant_services, many=True)
            return ok(data=serializer.data, request=request)
        
        from control_plane.models import Tenant
        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return fail('NOT_FOUND', 'Tenant not found', status=404, request=request)
    else:
        tenant, error = get_current_tenant(request.user)
        if error:
            return error
    
    tenant_services = ServiceManager.get_tenant_services(tenant, enabled_only=True)
    serializer = TenantServiceSerializer(tenant_services, many=True)
    return ok(data=serializer.data, request=request)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def enable_service(request, service_code):
    """Enable a service for current tenant (Owner/Admin only) or any tenant (Superadmin)"""
    # Superadmin can manage services for any tenant
    if request.user.user_type == 'superadmin':
        tenant_id = request.data.get('tenant_id') or request.headers.get('X-Tenant-ID')
        if not tenant_id:
            return fail('INVALID_INPUT', 'tenant_id required for Superadmin', status=400, request=request)
        
        from control_plane.models import Tenant
        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return fail('NOT_FOUND', 'Tenant not found', status=404, request=request)
    else:
        # Regular users need Owner/Admin permission
        service_admin_perm = IsServiceAdmin()
        if not service_admin_perm.has_permission(request, None):
            return Response(
                service_admin_perm.message if hasattr(service_admin_perm, 'message') else {"error": "Permission denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        tenant, error = get_current_tenant(request.user)
        if error:
            return error
    
    try:
        tier = request.data.get('tier')  # Optional, will auto-derive from subscription
        config = request.data.get('config', {})
        
        tenant_service, created = ServiceManager.enable_service(
            tenant=tenant,
            service_code=service_code,
            user=request.user,
            tier=tier,
            config=config
        )
        
        serializer = TenantServiceSerializer(tenant_service)
        return ok(
            data={
                "message": f"Service {tenant_service.service.name} {'enabled' if created else 'already enabled'}",
                "service": serializer.data
            },
            request=request
        )
        
    except ValidationError as e:
        return fail('VALIDATION_ERROR', str(e), status=400, request=request)
    except Exception as e:
        return fail('INTERNAL_ERROR', 'Failed to enable service', details=str(e), status=500, request=request)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def disable_service(request, service_code):
    """Disable a service for current tenant (Owner/Admin only) or any tenant (Superadmin)"""
    # Superadmin can manage services for any tenant
    if request.user.user_type == 'superadmin':
        tenant_id = request.data.get('tenant_id') or request.headers.get('X-Tenant-ID')
        if not tenant_id:
            return fail('INVALID_INPUT', 'tenant_id required for Superadmin', status=400, request=request)
        
        from control_plane.models import Tenant
        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return fail('NOT_FOUND', 'Tenant not found', status=404, request=request)
    else:
        # Regular users need Owner/Admin permission
        service_admin_perm = IsServiceAdmin()
        if not service_admin_perm.has_permission(request, None):
            return Response(
                service_admin_perm.message if hasattr(service_admin_perm, 'message') else {"error": "Permission denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        tenant, error = get_current_tenant(request.user)
        if error:
            return error
    
    try:
        reason = request.data.get('reason')
        disabled = ServiceManager.disable_service(
            tenant=tenant,
            service_code=service_code,
            user=request.user,
            reason=reason
        )
        
        message = "Service disabled" if disabled else "Service already disabled"
        return ok(data={"message": message}, request=request)
            
    except ValidationError as e:
        return fail('VALIDATION_ERROR', str(e), status=400, request=request)
    except Exception as e:
        return fail('INTERNAL_ERROR', 'Failed to disable service', details=str(e), status=500, request=request)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def service_stats(request):
    """Get service usage statistics for current tenant"""
    tenant, error = get_current_tenant(request.user)
    if error:
        return error
    
    stats = ServiceManager.get_service_stats(tenant)
    return ok(data=stats, request=request)


@api_view(["POST"])
@permission_classes([IsServiceAdmin])
def update_service_config(request, service_code):
    """Update service configuration (Owner/Admin only)"""
    tenant, error = get_current_tenant(request.user)
    if error:
        return error
    
    try:
        config = request.data.get('config', {})
        merge = request.data.get('merge', True)
        
        tenant_service = ServiceManager.update_service_config(
            tenant=tenant,
            service_code=service_code,
            user=request.user,
            config=config,
            merge=merge
        )
        
        serializer = TenantServiceSerializer(tenant_service)
        return ok(
            data={
                "message": "Configuration updated",
                "service": serializer.data
            },
            request=request
        )
        
    except ValidationError as e:
        return fail('VALIDATION_ERROR', str(e), status=400, request=request)
    except Exception as e:
        return fail('INTERNAL_ERROR', 'Failed to update configuration', details=str(e), status=500, request=request)


@api_view(["POST"])
@permission_classes([IsServiceAdmin])
def change_service_tier(request, service_code):
    """Change service tier (Owner/Admin only)"""
    tenant, error = get_current_tenant(request.user)
    if error:
        return error
    
    try:
        new_tier = request.data.get('tier')
        if not new_tier:
            return fail('INVALID_INPUT', 'Tier is required', status=400, request=request)
        
        tenant_service = ServiceManager.change_service_tier(
            tenant=tenant,
            service_code=service_code,
            user=request.user,
            new_tier=new_tier
        )
        
        serializer = TenantServiceSerializer(tenant_service)
        return ok(
            data={
                "message": f"Tier changed to {new_tier}",
                "service": serializer.data
            },
            request=request
        )
        
    except ValidationError as e:
        return fail('VALIDATION_ERROR', str(e), status=400, request=request)
    except Exception as e:
        return fail('INTERNAL_ERROR', 'Failed to change tier', details=str(e), status=500, request=request)
