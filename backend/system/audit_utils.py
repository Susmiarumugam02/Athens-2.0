"""
Centralized Audit Logging Utility for Athens 2.0
Tenant-scoped, safe, and integrated with TenantResolver + RBAC
"""
import logging
from typing import Optional, Dict, Any
from django.utils import timezone
from authentication.tenant_resolver import TenantResolver

logger = logging.getLogger(__name__)


def audit_log(
    request,
    action: str,
    *,
    target_type: Optional[str] = None,
    target_id: Optional[Any] = None,
    status: str = "SUCCESS",
    meta: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Centralized audit logging function.
    
    Args:
        request: Django request object (must have user and optionally tenant)
        action: Action code (e.g., 'tenant.create', 'user.update', 'project.delete')
        target_type: Type of entity affected (e.g., 'Tenant', 'User', 'Project')
        target_id: ID of entity affected
        status: 'SUCCESS' or 'FAILURE'
        meta: Additional metadata (will be JSON-serialized)
    
    Returns:
        bool: True if logged successfully, False otherwise
    
    Note:
        This function NEVER raises exceptions - failures are logged but swallowed
        to prevent audit logging from breaking the main request flow.
    """
    try:
        from control_plane.models import AthensAuditLog
        
        # Extract user info
        user = getattr(request, 'user', None)
        actor_id = user.id if user and user.is_authenticated else None
        actor_email = user.email if user and user.is_authenticated else 'anonymous'
        
        # Extract tenant context (use TenantResolver if not already attached)
        tenant_id = None
        if hasattr(request, 'tenant') and request.tenant:
            tenant_id = request.tenant.id
        elif user and user.is_authenticated:
            # Try to resolve tenant
            try:
                resolver = TenantResolver()
                tenant = resolver.resolve_tenant(request)
                tenant_id = tenant.id if tenant else None
            except Exception:
                pass
        
        # Extract request metadata
        ip_address = _get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]
        
        # Prepare metadata
        audit_meta = meta or {}
        audit_meta['status'] = status
        if target_type:
            audit_meta['target_type'] = target_type
        if target_id:
            audit_meta['target_id'] = str(target_id)
        
        # Create audit log entry
        AthensAuditLog.objects.create(
            actor_id=actor_id,
            action=action,
            entity_type=target_type or 'unknown',
            entity_id=str(target_id) if target_id else '',
            after_data=audit_meta,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        
        return True
        
    except Exception as e:
        # Log error but don't raise - audit logging should never break the request
        logger.error(f"Audit logging failed for action '{action}': {e}", exc_info=True)
        return False


def _get_client_ip(request) -> Optional[str]:
    """Extract client IP from request, handling proxies"""
    try:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')
    except Exception:
        return None


class AuditLogMixin:
    """
    DRF ViewSet mixin for automatic audit logging.
    
    Usage:
        class MyViewSet(AuditLogMixin, viewsets.ModelViewSet):
            audit_action_map = {
                'create': 'resource.create',
                'update': 'resource.update',
                'destroy': 'resource.delete',
            }
            audit_target_type = 'Resource'
    """
    audit_action_map = {}
    audit_target_type = None
    
    def perform_create(self, serializer):
        instance = serializer.save()
        action = self.audit_action_map.get('create', f'{self.audit_target_type}.create')
        audit_log(
            self.request,
            action,
            target_type=self.audit_target_type,
            target_id=instance.pk,
            status='SUCCESS'
        )
        return instance
    
    def perform_update(self, serializer):
        instance = serializer.save()
        action = self.audit_action_map.get('update', f'{self.audit_target_type}.update')
        audit_log(
            self.request,
            action,
            target_type=self.audit_target_type,
            target_id=instance.pk,
            status='SUCCESS'
        )
        return instance
    
    def perform_destroy(self, instance):
        action = self.audit_action_map.get('destroy', f'{self.audit_target_type}.delete')
        audit_log(
            self.request,
            action,
            target_type=self.audit_target_type,
            target_id=instance.pk,
            status='SUCCESS'
        )
        instance.delete()
