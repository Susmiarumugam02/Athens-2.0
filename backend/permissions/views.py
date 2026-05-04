from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from datetime import timedelta
from .models import PermissionRequest, PermissionGrant
from .serializers import PermissionRequestSerializer
from authentication.tenant_scoped_utils import ensure_tenant_context
from authentication.project_isolation import validate_project_access

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_permission(request):
    """AdminUser requests edit/delete permission"""
    ensure_tenant_context(request)
    if request.user.user_type != 'adminuser':
        return Response({'error': 'Only adminusers can request permissions'}, status=403)
    
    data = request.data
    content_type = ContentType.objects.get(app_label=data['app_label'], model=data['model'])
    
    # Get the object to check who created the adminuser
    obj = content_type.get_object_for_this_type(id=data['object_id'])
    validate_project_access(request.user, obj)
    approver = request.user.created_by  # ProjectAdmin who created this adminuser
    
    # Check if there's already a pending request
    existing_request = PermissionRequest.objects.filter(
        requester=request.user,
        content_type=content_type,
        object_id=data['object_id'],
        permission_type=data['permission_type'],
        status='pending'
    ).first()
    
    if existing_request:
        # Update the existing request with new reason
        existing_request.reason = data['reason']
        existing_request.save()
        permission_request = existing_request
    else:
        # Create new request
        permission_request = PermissionRequest.objects.create(
            requester=request.user,
            approver=approver,
            permission_type=data['permission_type'],
            reason=data['reason'],
            content_type=content_type,
            object_id=data['object_id']
        )
    
    # Send notification to approver (only for new requests)
    if not existing_request:
        from authentication.models_notification import Notification
        Notification.objects.create(
            user=approver,
            title='Permission Request',
            message=f'{request.user.get_full_name()} requests {data["permission_type"]} permission',
            notification_type='permission_request',
            data={
                'request_id': permission_request.id,
                'requester': request.user.username,
                'permission_type': data['permission_type'],
                'object_id': data['object_id']
            },
            link=f'/dashboard/permissions/requests'
        )
    
    if existing_request:
        return Response({'message': 'Permission request updated', 'request_id': permission_request.id})
    else:
        return Response({'message': 'Permission request sent', 'request_id': permission_request.id})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_permission(request, request_id):
    """ProjectAdmin approves/denies permission request"""
    ensure_tenant_context(request)
    if request.user.user_type != 'projectadmin':
        return Response({'error': 'Only projectadmins can approve permissions'}, status=403)
    
    try:
        permission_request = PermissionRequest.objects.get(id=request_id, approver=request.user)
        try:
            obj = permission_request.content_type.get_object_for_this_type(id=permission_request.object_id)
            validate_project_access(request.user, obj)
        except Exception:
            return Response({'error': 'Access denied to target object'}, status=403)
        
        if request.data.get('action') == 'approve':
            # Check if there's already an approved request for the same combination
            existing_approved = PermissionRequest.objects.filter(
                requester=permission_request.requester,
                content_type=permission_request.content_type,
                object_id=permission_request.object_id,
                permission_type=permission_request.permission_type,
                status='approved'
            ).exclude(id=permission_request.id).first()
            
            if existing_approved:
                # Delete the existing approved request to avoid constraint violation
                existing_approved.delete()
            
            permission_request.status = 'approved'
            permission_request.approved_at = timezone.now()
            permission_request.save()
            
            # Create one-time grant (or get existing one)
            grant, created = PermissionGrant.objects.get_or_create(
                permission_request=permission_request,
                defaults={
                    'expires_at': timezone.now() + timedelta(minutes=15),
                    'used': False
                }
            )
            
            # If grant already exists, reset it
            if not created:
                grant.used = False
                grant.used_at = None
                grant.expires_at = timezone.now() + timedelta(minutes=15)
                grant.save()
            
            # Send approval notification to requester
            from authentication.models_notification import Notification
            Notification.objects.create(
                user=permission_request.requester,
                title='Permission Approved',
                message=f'Your {permission_request.permission_type} permission has been approved (expires in 15 minutes)',
                notification_type='permission_approved',
                data={
                    'request_id': permission_request.id,
                    'permission_type': permission_request.permission_type,
                    'object_id': permission_request.object_id,
                    'expires_at': (timezone.now() + timedelta(minutes=15)).isoformat()
                }
            )
            
            return Response({'message': 'Permission approved'})
        else:
            permission_request.status = 'denied'
            permission_request.save()
            
            # Send denial notification to requester
            from authentication.models_notification import Notification
            Notification.objects.create(
                user=permission_request.requester,
                title='Permission Denied',
                message=f'Your {permission_request.permission_type} permission has been denied',
                notification_type='permission_denied',
                data={
                    'request_id': permission_request.id,
                    'permission_type': permission_request.permission_type
                }
            )
            
            return Response({'message': 'Permission denied'})
            
    except PermissionRequest.DoesNotExist:
        return Response({'error': 'Permission request not found'}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_permission_requests(request):
    """Get user's permission requests"""
    ensure_tenant_context(request)
    if request.user.user_type == 'adminuser':
        requests = PermissionRequest.objects.filter(requester=request.user)
    else:
        requests = PermissionRequest.objects.filter(approver=request.user, status='pending')
    
    serializer = PermissionRequestSerializer(requests, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_permission(request):
    """Check if user has active permission for specific object"""
    ensure_tenant_context(request)
    if request.user.user_type != 'adminuser':
        return Response({'has_permission': True})
    
    permission_type = request.query_params.get('permission_type')
    object_id = request.query_params.get('object_id')
    app_label = request.query_params.get('app_label')
    model = request.query_params.get('model')
    
    if not all([permission_type, object_id, app_label, model]):
        return Response({'error': 'Missing required parameters'}, status=400)
    
    try:
        content_type = ContentType.objects.get(app_label=app_label, model=model)
        
        # Check for valid permission grant
        grant = PermissionGrant.objects.filter(
            permission_request__requester=request.user,
            permission_request__content_type=content_type,
            permission_request__object_id=object_id,
            permission_request__permission_type=permission_type,
            permission_request__status='approved',
            used=False,
            expires_at__gt=timezone.now()
        ).first()
        
        return Response({
            'has_permission': bool(grant),
            'grant_id': grant.id if grant else None,
            'expires_at': grant.expires_at.isoformat() if grant else None
        })
        
    except ContentType.DoesNotExist:
        return Response({'error': 'Invalid content type'}, status=400)
