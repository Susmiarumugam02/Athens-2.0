from authentication.models import SecurityLog


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


def get_device_fingerprint(request):
    """Extract device fingerprint from request headers"""
    return request.META.get('HTTP_X_DEVICE_FINGERPRINT', '')


def log_security_event(request, user, event_type, severity, metadata=None):
    """
    Log security event
    
    Args:
        request: Django request object
        user: User instance or None
        event_type: SecurityLog.EventType choice
        severity: SecurityLog.Severity choice
        metadata: dict of additional data
    """
    company_id = None
    if user and hasattr(user, 'company_id'):
        company_id = user.company_id
    
    SecurityLog.objects.create(
        event_type=event_type,
        severity=severity,
        user=user,
        company_id=company_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        device_fingerprint=get_device_fingerprint(request),
        metadata=metadata or {}
    )


def extract_company_id(request):
    """Extract company_id from JWT claims or headers"""
    # From JWT token
    if hasattr(request, 'user') and hasattr(request.user, 'company_id'):
        return request.user.company_id
    
    # From header (for internal service calls)
    return request.META.get('HTTP_X_COMPANY_ID')


def extract_project_id(request):
    """Extract project_id from headers or query params"""
    # From header
    project_id = request.META.get('HTTP_X_PROJECT_ID')
    if project_id:
        return int(project_id)
    
    # From query param
    project_id = request.GET.get('project_id')
    if project_id:
        return int(project_id)
    
    return None
