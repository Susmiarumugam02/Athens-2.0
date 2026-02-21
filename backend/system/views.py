from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError

from .serializers import ServiceSerializer, TenantServiceSerializer
from .utils import get_current_tenant, check_service_admin_permission
from .service_manager import ServiceManager


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return Response({"status": "ok"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_services(request):
    """List all available services"""
    services = ServiceManager.get_available_services()
    serializer = ServiceSerializer(services, many=True)
    return Response(serializer.data)


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
            return Response(serializer.data)
        
        from control_plane.models import Tenant
        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return Response({"error": "Tenant not found"}, status=status.HTTP_404_NOT_FOUND)
    else:
        tenant, error = get_current_tenant(request.user)
        if error:
            return error
    
    tenant_services = ServiceManager.get_tenant_services(tenant, enabled_only=True)
    serializer = TenantServiceSerializer(tenant_services, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def enable_service(request, service_code):
    """Enable a service for current tenant (Owner/Admin only) or any tenant (Superadmin)"""
    # Superadmin can manage services for any tenant
    if request.user.user_type == 'superadmin':
        tenant_id = request.data.get('tenant_id') or request.headers.get('X-Tenant-ID')
        if not tenant_id:
            return Response({"error": "tenant_id required for Superadmin"}, status=status.HTTP_400_BAD_REQUEST)
        
        from control_plane.models import Tenant
        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return Response({"error": "Tenant not found"}, status=status.HTTP_404_NOT_FOUND)
    else:
        # Regular users need permission check
        has_permission, error = check_service_admin_permission(request.user)
        if error:
            return error
        
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
        return Response({
            "message": f"Service {tenant_service.service.name} {'enabled' if created else 'already enabled'}",
            "data": serializer.data
        }, status=status.HTTP_200_OK)
        
    except ValidationError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": "Failed to enable service"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def disable_service(request, service_code):
    """Disable a service for current tenant (Owner/Admin only) or any tenant (Superadmin)"""
    # Superadmin can manage services for any tenant
    if request.user.user_type == 'superadmin':
        tenant_id = request.data.get('tenant_id') or request.headers.get('X-Tenant-ID')
        if not tenant_id:
            return Response({"error": "tenant_id required for Superadmin"}, status=status.HTTP_400_BAD_REQUEST)
        
        from control_plane.models import Tenant
        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return Response({"error": "Tenant not found"}, status=status.HTTP_404_NOT_FOUND)
    else:
        # Regular users need permission check
        has_permission, error = check_service_admin_permission(request.user)
        if error:
            return error
        
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
        
        if disabled:
            return Response({"message": f"Service disabled"}, status=status.HTTP_200_OK)
        else:
            return Response({"message": "Service already disabled"}, status=status.HTTP_200_OK)
            
    except ValidationError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": "Failed to disable service"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def service_stats(request):
    """Get service usage statistics for current tenant"""
    tenant, error = get_current_tenant(request.user)
    if error:
        return error
    
    stats = ServiceManager.get_service_stats(tenant)
    return Response(stats)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_service_config(request, service_code):
    """Update service configuration (Owner/Admin only)"""
    has_permission, error = check_service_admin_permission(request.user)
    if error:
        return error
    
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
        return Response({
            "message": "Configuration updated",
            "data": serializer.data
        }, status=status.HTTP_200_OK)
        
    except ValidationError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": "Failed to update configuration"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_service_tier(request, service_code):
    """Change service tier (Owner/Admin only)"""
    has_permission, error = check_service_admin_permission(request.user)
    if error:
        return error
    
    tenant, error = get_current_tenant(request.user)
    if error:
        return error
    
    try:
        new_tier = request.data.get('tier')
        if not new_tier:
            return Response({"error": "Tier is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        tenant_service = ServiceManager.change_service_tier(
            tenant=tenant,
            service_code=service_code,
            user=request.user,
            new_tier=new_tier
        )
        
        serializer = TenantServiceSerializer(tenant_service)
        return Response({
            "message": f"Tier changed to {new_tier}",
            "data": serializer.data
        }, status=status.HTTP_200_OK)
        
    except ValidationError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": "Failed to change tier"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
