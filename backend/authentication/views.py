from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta

from .models import User, UserType, SecurityLog
from .utils import log_security_event
from .tenant_utils import get_tenant_for_user, get_tenant_id_for_filtering
from .permissions import IsSuperAdmin


class LoginThrottle(AnonRateThrottle):
    rate = '5/min'


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
def unified_login(request):
    """Unified login endpoint for all user types"""
    email = request.data.get('email')
    password = request.data.get('password')
    totp_code = request.data.get('totp_code')
    
    if not email or not password:
        return Response(
            {'error': 'Email and password required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        log_security_event(
            request, None, SecurityLog.EventType.LOGIN_FAILED,
            SecurityLog.Severity.WARNING,
            {'email': email, 'reason': 'user_not_found'}
        )
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Check if account is locked
    if user.is_locked:
        log_security_event(
            request, user, SecurityLog.EventType.LOGIN_FAILED,
            SecurityLog.Severity.WARNING,
            {'reason': 'account_locked'}
        )
        return Response(
            {
                'error': 'Account is locked',
                'locked_until': user.locked_until,
                'account_locked': True,
                'lockout_expires_at': user.locked_until,
            },
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Verify password
    if not user.check_password(password):
        user.failed_login_count += 1
        if user.failed_login_count >= 5:
            user.locked_until = timezone.now() + timedelta(minutes=30)
            log_security_event(
                request, user, SecurityLog.EventType.ACCOUNT_LOCKED,
                SecurityLog.Severity.CRITICAL,
                {'failed_attempts': user.failed_login_count}
            )
        user.save()
        
        log_security_event(
            request, user, SecurityLog.EventType.LOGIN_FAILED,
            SecurityLog.Severity.WARNING,
            {'reason': 'invalid_password', 'attempts': user.failed_login_count}
        )
        if user.failed_login_count >= 5:
            return Response(
                {
                    'error': 'Account is locked',
                    'locked_until': user.locked_until,
                    'account_locked': True,
                    'lockout_expires_at': user.locked_until,
                },
                status=status.HTTP_403_FORBIDDEN
            )

        attempts_remaining = max(0, 5 - user.failed_login_count)
        return Response(
            {
                'error': 'Invalid credentials',
                'attempts_remaining': attempts_remaining,
                'remaining_attempts': attempts_remaining,
            },
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Check 2FA if required
    if user.requires_2fa and not totp_code:
        return Response(
            {'requires_2fa': True, 'user_id': user.id},
            status=status.HTTP_200_OK
        )
    
    # Reset failed login count
    user.failed_login_count = 0
    user.locked_until = None
    user.last_login = timezone.now()
    user.save()
    
    # Check if MasterAdmin has tenant assigned
    if user.user_type == UserType.MASTERADMIN:
        tenant, error = get_tenant_for_user(user)
        if not tenant:
            log_security_event(
                request, user, SecurityLog.EventType.LOGIN_FAILED,
                SecurityLog.Severity.WARNING,
                {'reason': 'tenant_not_assigned'}
            )
            return Response(
                {
                    'code': 'TENANT_MISSING',
                    'detail': 'Tenant not assigned. Contact Superadmin.',
                    'error': 'Tenant not assigned'
                },
                status=status.HTTP_403_FORBIDDEN
            )
    
    # Generate tokens
    refresh = RefreshToken.for_user(user)
    refresh['user_type'] = user.user_type
    tenant_id = get_tenant_id_for_filtering(user)
    refresh['company_id'] = tenant_id
    
    log_security_event(
        request, user, SecurityLog.EventType.LOGIN_SUCCESS,
        SecurityLog.Severity.INFO,
        {}
    )
    
    # Get tenant name if available
    tenant_name = None
    if user.tenant:
        tenant_name = user.tenant.name
    
    # Determine next route based on user type
    next_route_map = {
        UserType.SUPERADMIN: '/superadmin/dashboard',
        UserType.MASTERADMIN: '/master-admin',
        UserType.COMPANYUSER: '/services/athens_sustainability/dashboard',
        UserType.SERVICEUSER: '/service',
    }
    
    tenant_id = get_tenant_id_for_filtering(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'email': user.email,
            'user_type': user.user_type,
            'company_id': tenant_id,
            'athens_tenant_id': tenant_id,
            'admin_type': user.admin_type,
            'company_name': user.company_name or tenant_name,
        },
        'password_expired': user.password_expired,
        'requires_2fa': False,
        'next_route': next_route_map.get(user.user_type, '/app'),
    })


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
def token_refresh(request):
    """Refresh access token"""
    refresh_token = request.data.get('refresh')
    
    if not refresh_token:
        return Response(
            {'error': 'Refresh token required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        refresh = RefreshToken(refresh_token)
        return Response({
            'access': str(refresh.access_token),
        })
    except TokenError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """Logout and blacklist refresh token"""
    refresh_token = request.data.get('refresh')
    
    if refresh_token:
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            pass
    
    log_security_event(
        request, request.user, SecurityLog.EventType.LOGOUT,
        SecurityLog.Severity.INFO,
        {}
    )
    
    return Response({'message': 'Logged out successfully'})


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def list_users(request):
    """List users for member assignment (Superadmin only)"""
    user = request.user
    
    users = User.objects.filter(is_active=True)
    
    # Filter by company if requested
    company_filter = request.query_params.get('company')
    tenant_id = get_tenant_id_for_filtering(user)
    if company_filter == 'me' and tenant_id:
        users = users.filter(company_id=tenant_id)
    
    data = [
        {
            'id': u.id,
            'email': u.email,
            'user_type': u.user_type,
            'is_active': u.is_active,
        }
        for u in users
    ]
    
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_overview(request):
    """Dashboard statistics placeholder"""
    return Response({
        'projects': {'total': 0, 'active': 0},
        'users': {'total': 0, 'active': 0},
        'companies': {'total': 0, 'active': 0},
        'notifications': {'total': 0, 'unread': 0}
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def company_data(request):
    """Get company/tenant data"""
    user = request.user
    
    tenant, error = get_tenant_for_user(user)
    if not tenant:
        return Response({'error': 'No company associated'}, status=status.HTTP_404_NOT_FOUND)
    
    return Response({
        'success': True,
        'company_name': tenant.name,
        'company_logo': None,
        'registered_address': '',
        'contact_phone': '',
        'contact_email': tenant.admin_email,
        'athens_tenant_id': str(tenant.id),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_profile(request):
    """Get current user profile"""
    user = request.user
    
    return Response({
        'name': user.email.split('@')[0],
        'employee_id': str(user.id),
        'designation': user.user_type,
        'department': 'N/A',
        'user_type': user.user_type,
        'admin_type': user.admin_type,
        'project_name': None,
        'profile_picture_url': None,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_projects(request):
    """Get all projects/tenants"""
    return Response({'results': []})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_admin_users(request):
    """Get all admin users"""
    return Response({'results': []})


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def reset_user_password(request, user_id):
    """Reset user password (Superadmin only)"""
    try:
        target_user = User.objects.get(id=user_id)
        # In production, send email with reset link
        return Response({'message': 'Password reset email sent'})
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def toggle_user_status(request, user_id):
    """Enable/disable user (Superadmin only)"""
    try:
        target_user = User.objects.get(id=user_id)
        target_user.is_active = not target_user.is_active
        target_user.save()
        return Response({'message': 'User status updated', 'is_active': target_user.is_active})
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    """Get user notifications"""
    return Response({'results': []})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def induction_status(request):
    """Get induction status"""
    return Response({
        'hasCompleted': True,
        'isEPCSafety': False,
        'isMasterAdmin': False,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subscription_status(request):
    """Get subscription status"""
    tenant_id = get_tenant_id_for_filtering(request.user)
    return Response({
        'isTrialing': False,
        'subscriptionStatus': 'active',
        'tenantId': str(tenant_id) if tenant_id else None,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_tenant(request):
    """Get current user's tenant details"""
    user = request.user
    
    tenant, error = get_tenant_for_user(user)
    if not tenant:
        return Response({'error': 'No tenant assigned'}, status=status.HTTP_404_NOT_FOUND)
    
    return Response({
        'id': tenant.id,
        'name': tenant.name,
        'athens_tenant_id': tenant.id,
        'admin_email': tenant.admin_email,
    })




