from django.core.exceptions import PermissionDenied


def ensure_tenant_context(request):
    tenant_id = getattr(request, 'athens_tenant_id', None)
    if not tenant_id:
        user = getattr(request, 'user', None)
        if user and hasattr(user, 'company_id'):
            request.athens_tenant_id = user.company_id
    return getattr(request, 'athens_tenant_id', None)


def ensure_project(request):
    user = getattr(request, 'user', None)
    if not user:
        return None
    return getattr(user, 'project', None)


def enforce_collaboration_read_only(request, domain=None):
    collaboration_project_id = request.query_params.get('collaboration_project_id')
    if collaboration_project_id and request.method not in {'GET', 'HEAD', 'OPTIONS'}:
        raise PermissionDenied('Cross-tenant writes are not allowed.')
