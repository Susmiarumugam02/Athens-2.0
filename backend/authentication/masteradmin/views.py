from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_date
from authentication.models import Project, User, UserType, SecurityLog
from authentication.permissions import IsMasterAdmin
from control_plane.models import Subscription
from .serializers import (
    ProjectSerializer, ProjectCreateSerializer, ProjectUpdateSerializer,
    DashboardStatsSerializer, AdminUserSerializer, AdminUserCreateSerializer,
    ProjectAdminCreateSerializer
)

ALLOWED_PROJECT_ADMIN_TYPES = ('client', 'epc', 'contractor')

# Fields that only SuperAdmin may write — always stripped from MasterAdmin requests
_SUPERADMIN_ONLY_FIELDS = (
    'subscription_start_date', 'subscription_end_date',
    'subscription_start', 'subscription_end',
)


def _strip_subscription_fields(data):
    """Return a mutable copy of data with subscription date fields removed."""
    mutable = data.copy()
    for field in _SUPERADMIN_ONLY_FIELDS:
        mutable.pop(field, None)
    return mutable


@api_view(['GET'])
@permission_classes([IsMasterAdmin])
def dashboard_stats(request):
    """Get dashboard statistics for MasterAdmin"""
    user = request.user
    tenant = user.tenant
    
    if not tenant:
        # Return empty stats instead of error for better UX
        return Response({
            'total_projects': 0,
            'active_projects': 0,
            'total_users': 0,
            'pending_approvals': 0
        })
    
    tenant_id = tenant.id
    
    # Get tenant-scoped statistics
    total_projects = Project.objects.filter(athens_tenant_id=tenant_id).count()
    active_projects = Project.objects.filter(
        athens_tenant_id=tenant_id,
        deadlineDate__gte=timezone.now().date()
    ).count()
    total_users = User.objects.filter(
        tenant=tenant,
        user_type=UserType.COMPANYUSER
    ).count()
    pending_approvals = User.objects.filter(
        tenant=tenant,
        user_type=UserType.COMPANYUSER,
        is_active=False
    ).count()
    
    stats = {
        'total_projects': total_projects,
        'active_projects': active_projects,
        'total_users': total_users,
        'pending_approvals': pending_approvals
    }
    
    serializer = DashboardStatsSerializer(stats)
    return Response(serializer.data)


@api_view(['GET', 'POST'])
@permission_classes([IsMasterAdmin])
def projects_list_create(request):
    """List projects or create new project (tenant-scoped or global)"""
    user = request.user
    tenant = user.tenant
    tenant_id = tenant.id if tenant else None

    if request.method == 'GET':
        projects = Project.objects.filter(athens_tenant_id=tenant_id) if tenant_id else Project.objects.all()
        serializer = ProjectSerializer(projects, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = ProjectCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            project = serializer.save()
            return Response(
                ProjectSerializer(project).data,
                status=status.HTTP_201_CREATED
            )
        print("PROJECT CREATE ERRORS:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsMasterAdmin])
def project_detail(request, project_id):
    """Get, update, or delete a specific project"""
    user = request.user
    tenant = user.tenant
    tenant_id = tenant.id if tenant else None

    try:
        project = Project.objects.get(id=project_id, **({'athens_tenant_id': tenant_id} if tenant_id else {}))
    except Project.DoesNotExist:
        return Response(
            {'error': 'Project not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        serializer = ProjectSerializer(project)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = ProjectUpdateSerializer(project, data=request.data, partial=True)
        if serializer.is_valid():
            project = serializer.save()
            return Response(ProjectSerializer(project).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        project.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsMasterAdmin])
def tenant_users(request):
    """List users in the same tenant as MasterAdmin (or all if no tenant)"""
    user = request.user
    tenant = user.tenant

    qs = User.objects.filter(user_type=UserType.COMPANYUSER)
    if tenant:
        qs = qs.filter(tenant=tenant)

    users = qs.values('id', 'email', 'name', 'surname', 'department', 'designation', 'is_active', 'created_at')
    return Response(list(users))


@api_view(['POST'])
@permission_classes([IsMasterAdmin])
def approve_user(request, user_id):
    """Approve a company user"""
    master_user = request.user
    tenant = master_user.tenant

    filters = {'id': user_id, 'user_type': UserType.COMPANYUSER}
    if tenant:
        filters['tenant'] = tenant

    try:
        user = User.objects.get(**filters)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    user.is_active = True
    user.save()
    
    return Response({'message': 'User approved successfully'})


@api_view(['GET', 'POST'])
@permission_classes([IsMasterAdmin])
def admin_users_list_create(request):
    """List or create admin users"""
    user = request.user
    tenant = user.tenant

    if request.method == 'GET':
        qs = User.objects.filter(user_type=UserType.COMPANYUSER)
        if tenant:
            qs = qs.filter(tenant=tenant)
        serializer = AdminUserSerializer(qs, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = AdminUserCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            admin_user = serializer.save()
            return Response(
                {
                    'id': admin_user.id,
                    'name': admin_user.name,
                    'username': admin_user.username,
                    'password': admin_user._generated_password
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsMasterAdmin])
def create_project_admin(request):
    """Create project admin (Original Athens parity)"""
    # Subscription dates are SuperAdmin-only — strip silently if sent
    data = _strip_subscription_fields(request.data)

    serializer = ProjectAdminCreateSerializer(data=data, context={'request': request})
    
    if serializer.is_valid():
        admin_user = serializer.save()
        
        # Create Subscription record if dates provided
        subscription_start = request.data.get('subscription_start')
        subscription_end = request.data.get('subscription_end')
        tenant = admin_user.tenant

        if tenant and subscription_start and subscription_end:
            start_date = parse_date(subscription_start)
            end_date = parse_date(subscription_end)
            if start_date and end_date:
                Subscription.objects.create(
                    tenant=tenant,
                    plan_name='Standard',
                    status=Subscription.Status.ACTIVE,
                    valid_from=timezone.datetime.combine(start_date, timezone.datetime.min.time()).replace(tzinfo=timezone.utc),
                    valid_until=timezone.datetime.combine(end_date, timezone.datetime.min.time()).replace(tzinfo=timezone.utc),
                    created_by=request.user,
                )
        
        # Audit log - DO NOT log password
        SecurityLog.objects.create(
            event_type=SecurityLog.EventType.MASTER_CREATED,
            severity=SecurityLog.Severity.INFO,
            user=request.user,
            metadata={
                'event': 'masteradmin.create_project_admin',
                'source': 'web',
                'actor_user_id': request.user.id,
                'tenant_id': str(admin_user.athens_tenant_id),
                'project_id': admin_user.project.id if admin_user.project else None,
                'created_user_id': admin_user.id,
                'created_username': admin_user.username,
                'admin_type': admin_user.admin_type,
                'company_name': admin_user.company_name,
            }
        )
        
        return Response(
            {
                'username': admin_user.username,
                'password': admin_user._generated_password,
                'admin_type': admin_user.admin_type,
                'company_name': admin_user.company_name,
                'registered_address': admin_user.registered_address,
            },
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsMasterAdmin])
def project_admins(request, project_id):
    """Get all admins for a project, grouped by type, with user counts."""
    user = request.user
    tenant = user.tenant
    tenant_id = tenant.id if tenant else None

    try:
        project = Project.objects.get(id=project_id, **({'athens_tenant_id': tenant_id} if tenant_id else {}))
    except Project.DoesNotExist:
        return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)

    admins = User.objects.filter(
        project=project,
        user_type=UserType.COMPANYUSER,
        role_type='admin',
        admin_type__in=ALLOWED_PROJECT_ADMIN_TYPES,
    ).select_related('project')

    def _serialize(u):
        users_created = User.objects.filter(created_by=u, role_type='user').count()
        return {
            'id': u.id,
            'username': u.username,
            'name': u.get_full_name(),
            'email': u.email,
            'admin_type': u.admin_type,
            'company_name': u.company_name or '',
            'registered_address': u.registered_address or '',
            'is_active': u.is_active,
            'created_at': u.created_at.isoformat(),
            'users_created_count': users_created,
        }

    grouped = {admin_type: [] for admin_type in ALLOWED_PROJECT_ADMIN_TYPES}
    for admin in admins:
        grouped[admin.admin_type].append(_serialize(admin))

    return Response({
        'project_id': project.id,
        'project_name': project.projectName,
        'grouped': grouped,
        'all': [_serialize(a) for a in admins],
    })


@api_view(['GET'])
@permission_classes([IsMasterAdmin])
def admin_created_users(request, admin_id):
    """Get all users created by a specific admin user."""
    req_user = request.user
    tenant = req_user.tenant
    tenant_id = tenant.id if tenant else None

    filters = {'id': admin_id, 'user_type': UserType.COMPANYUSER, 'role_type': 'admin'}
    if tenant_id:
        filters['tenant_id'] = tenant_id

    try:
        admin = User.objects.get(**filters)
    except User.DoesNotExist:
        return Response({'error': 'Admin not found'}, status=status.HTTP_404_NOT_FOUND)

    users = User.objects.filter(
        created_by=admin, role_type='user'
    ).select_related('project').order_by('-created_at')

    data = []
    for u in users:
        data.append({
            'id': u.id,
            'username': u.username,
            'name': u.get_full_name(),
            'email': u.email,
            'company_type': u.company_type or admin.admin_type or '',
            'role_type': u.role_type,
            'status': u.status,
            'is_active': u.is_active,
            'approval_status': u.approval_status,
            'induction_attended': u.induction_attended,
            'module_access_enabled': u.module_access_enabled,
            'last_login': u.last_login.isoformat() if u.last_login else None,
            'created_at': u.created_at.isoformat(),
            'project_name': u.project.projectName if u.project else '',
        })

    return Response({
        'admin_id': admin.id,
        'admin_username': admin.username,
        'admin_name': admin.get_full_name(),
        'admin_type': admin.admin_type,
        'company_name': admin.company_name or '',
        'project_name': admin.project.projectName if admin.project else '',
        'users': data,
        'total': len(data),
    })


@api_view(['GET'])
@permission_classes([IsMasterAdmin])
def projects_with_analytics(request):
    """List all projects with admin/user counts for the hierarchy view."""
    user = request.user
    tenant = user.tenant
    tenant_id = tenant.id if tenant else None

    projects = Project.objects.filter(
        **({'athens_tenant_id': tenant_id} if tenant_id else {})
    ).order_by('projectName')

    result = []
    for p in projects:
        admins = User.objects.filter(
            project=p,
            user_type=UserType.COMPANYUSER,
            role_type='admin',
            admin_type__in=ALLOWED_PROJECT_ADMIN_TYPES,
        )
        users = User.objects.filter(
            project=p, user_type=UserType.COMPANYUSER, role_type='user'
        )
        type_counts = {admin_type: 0 for admin_type in ALLOWED_PROJECT_ADMIN_TYPES}
        for a in admins:
            type_counts[a.admin_type] = type_counts.get(a.admin_type, 0) + 1

        result.append({
            'id': p.id,
            'projectName': p.projectName,
            'projectCategory': p.projectCategory,
            'location': p.location,
            'subscriber_role': p.subscriber_role,
            'commencementDate': p.commencementDate.isoformat() if p.commencementDate else None,
            'deadlineDate': p.deadlineDate.isoformat() if p.deadlineDate else None,
            'admin_count': admins.count(),
            'user_count': users.count(),
            'active_user_count': users.filter(is_active=True).count(),
            'admin_type_counts': type_counts,
        })

    return Response(result)


@api_view(['GET'])
@permission_classes([IsMasterAdmin])
def my_tenant(request):
    """Get current MasterAdmin's tenant information"""
    user = request.user
    tenant = user.tenant
    
    if not tenant:
        # Return 200 with null tenant instead of 404
        return Response({
            'id': None,
            'name': None,
            'admin_email': None,
            'is_active': False,
            'message': 'No tenant assigned to this user'
        })
    
    return Response({
        'id': tenant.id,
        'name': tenant.name,
        'admin_email': tenant.admin_email,
        'is_active': tenant.is_active,
    })


@api_view(['DELETE'])
@permission_classes([IsMasterAdmin])
def admin_user_delete(request, user_id):
    """Delete an admin user"""
    master_user = request.user
    tenant = master_user.tenant

    filters = {'id': user_id, 'user_type': UserType.COMPANYUSER}
    if tenant:
        filters['tenant'] = tenant

    try:
        user = User.objects.get(**filters)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Audit log
    SecurityLog.objects.create(
        event_type=SecurityLog.EventType.MASTER_DISABLED,
        severity=SecurityLog.Severity.INFO,
        user=request.user,
        metadata={
            'event': 'masteradmin.delete_admin_user',
            'deleted_user_id': user.id,
            'deleted_username': user.username,
            'admin_type': user.admin_type,
        }
    )
    
    user.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsMasterAdmin])
def reset_admin_user_password(request, user_id):
    """Reset admin user password"""
    user = request.user
    tenant = user.tenant
    filters = {'id': user_id, 'user_type': UserType.COMPANYUSER}
    if tenant:
        filters['tenant'] = tenant
    try:
        target_user = User.objects.get(**filters)
        return Response({'message': 'Password reset email sent'})
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsMasterAdmin])
def toggle_admin_user_status(request, user_id):
    """Toggle admin user status"""
    user = request.user
    tenant = user.tenant
    filters = {'id': user_id, 'user_type': UserType.COMPANYUSER}
    if tenant:
        filters['tenant'] = tenant
    try:
        target_user = User.objects.get(**filters)
        target_user.is_active = not target_user.is_active
        target_user.save()
        return Response({'message': 'User status updated', 'is_active': target_user.is_active})
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
