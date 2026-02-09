from superadmin.models import AuditLog
from django.utils import timezone
import json


def log_audit(user, action, module, status='success', **kwargs):
    """
    Log an audit event
    
    Args:
        user: User object
        action: Action performed (e.g., 'user.create', 'role.update')
        module: Module name (e.g., 'users', 'roles', 'security')
        status: 'success' or 'failure'
        **kwargs: Additional fields (resource_type, resource_id, request_data, response_data, etc.)
    """
    try:
        audit_data = {
            'user': user,
            'action': action,
            'module': module,
            'status': status,
            'timestamp': timezone.now(),
        }
        
        # Add optional fields
        for key in ['resource_type', 'resource_id', 'ip_address', 'user_agent', 
                    'request_data', 'response_data']:
            if key in kwargs:
                audit_data[key] = kwargs[key]
        
        # Sanitize sensitive data
        if 'request_data' in audit_data:
            audit_data['request_data'] = sanitize_data(audit_data['request_data'])
        if 'response_data' in audit_data:
            audit_data['response_data'] = sanitize_data(audit_data['response_data'])
        
        AuditLog.objects.create(**audit_data)
    except Exception as e:
        # Don't let audit logging break the main flow
        print(f"Audit logging error: {e}")


def sanitize_data(data):
    """Remove sensitive fields from audit data"""
    if not isinstance(data, dict):
        return data
    
    sensitive_fields = ['password', 'token', 'secret', 'api_key', 'totp_secret']
    sanitized = data.copy()
    
    for field in sensitive_fields:
        if field in sanitized:
            sanitized[field] = '***REDACTED***'
    
    return sanitized


def get_client_ip(request):
    """Extract client IP from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def get_user_agent(request):
    """Extract user agent from request"""
    return request.META.get('HTTP_USER_AGENT', '')


class AuditLogMixin:
    """Mixin for ViewSets to automatically log audit events"""
    
    audit_module = None
    
    def perform_create(self, serializer):
        instance = serializer.save()
        log_audit(
            user=self.request.user,
            action=f"{self.audit_module}.create",
            module=self.audit_module,
            resource_type=instance.__class__.__name__,
            resource_id=str(instance.id),
            ip_address=get_client_ip(self.request),
            user_agent=get_user_agent(self.request),
            request_data=self.request.data,
        )
        return instance
    
    def perform_update(self, serializer):
        instance = serializer.save()
        log_audit(
            user=self.request.user,
            action=f"{self.audit_module}.update",
            module=self.audit_module,
            resource_type=instance.__class__.__name__,
            resource_id=str(instance.id),
            ip_address=get_client_ip(self.request),
            user_agent=get_user_agent(self.request),
            request_data=self.request.data,
        )
        return instance
    
    def perform_destroy(self, instance):
        log_audit(
            user=self.request.user,
            action=f"{self.audit_module}.delete",
            module=self.audit_module,
            resource_type=instance.__class__.__name__,
            resource_id=str(instance.id),
            ip_address=get_client_ip(self.request),
            user_agent=get_user_agent(self.request),
        )
        instance.delete()
