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
    user.save()
    
    # Generate tokens
    refresh = RefreshToken.for_user(user)
    refresh['user_type'] = user.user_type
    refresh['company_id'] = user.company_id
    
    log_security_event(
        request, user, SecurityLog.EventType.LOGIN_SUCCESS,
        SecurityLog.Severity.INFO,
        {}
    )
    
    # Determine next route based on user type
    next_route_map = {
        UserType.SUPERADMIN: '/superadmin/dashboard',
        UserType.MASTERADMIN: '/master-admin',
        UserType.COMPANYUSER: '/app',
        UserType.SERVICEUSER: '/service',
    }
    
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'email': user.email,
            'user_type': user.user_type,
            'company_id': user.company_id,
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
@permission_classes([IsAuthenticated])
def list_users(request):
    """List users for member assignment (MasterAdmin and Superadmin only)"""
    user = request.user
    
    if user.user_type not in [UserType.SUPERADMIN, UserType.MASTERADMIN]:
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Superadmin sees all, MasterAdmin sees only their company
    if user.user_type == UserType.SUPERADMIN:
        users = User.objects.filter(is_active=True)
    else:
        users = User.objects.filter(company_id=user.company_id, is_active=True)
    
    # Filter by company if requested
    company_filter = request.query_params.get('company')
    if company_filter == 'me' and user.company_id:
        users = users.filter(company_id=user.company_id)
    
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
