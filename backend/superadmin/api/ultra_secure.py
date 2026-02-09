from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone
from datetime import timedelta
import secrets

from authentication.models import User
from superadmin.models import IPRestriction
from superadmin.permissions import IsSuperAdmin
from superadmin.services.audit import log_audit, get_client_ip, get_user_agent


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def ultra_secure_settings(request):
    """Get ultra-secure settings overview"""
    user = request.user
    
    # Calculate security score
    score = 0
    if user.requires_2fa: score += 30
    if hasattr(user, 'api_key') and user.api_key: score += 20
    if user.password_changed_at: score += 20
    if IPRestriction.objects.filter(is_active=True).exists(): score += 15
    score += 15  # Base score
    
    # Determine security level
    if score >= 90: level = 'ULTRA_SECURE'
    elif score >= 75: level = 'HIGH_SECURITY'
    elif score >= 60: level = 'MEDIUM_SECURITY'
    else: level = 'LOW_SECURITY'
    
    # Calculate days until password expiry
    days_until_expiry = 90
    if user.password_changed_at:
        expiry_date = user.password_changed_at + timedelta(days=90)
        days_until_expiry = (expiry_date - timezone.now()).days
    
    return Response({
        'profile': {
            'email': user.email,
            'company_name': getattr(user, 'company_name', 'Athens 2.0'),
            'created_at': user.date_joined,
            'days_until_expiry': days_until_expiry,
            'api_key': getattr(user, 'api_key', None),
        },
        'security_features': {
            'two_factor_authentication': user.requires_2fa,
            'api_key_enabled': bool(getattr(user, 'api_key', None)),
            'password_expiry': True,
            'ip_restrictions': IPRestriction.objects.filter(is_active=True).exists(),
        },
        'security_stats': {
            'recovery_codes_count': 0,  # Implement if needed
        },
        'security_score': score,
        'security_level': level,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def change_ultra_password(request):
    """Change password with ultra-secure requirements"""
    user = request.user
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')
    
    if not check_password(current_password, user.password):
        return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate ultra-secure requirements (16+ chars, etc.)
    if len(new_password) < 16:
        return Response({'error': 'Password must be at least 16 characters'}, status=status.HTTP_400_BAD_REQUEST)
    
    user.password = make_password(new_password)
    user.password_changed_at = timezone.now()
    user.save()
    
    log_audit(
        user=user,
        action='ultra_secure.change_password',
        module='security',
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    
    return Response({'message': 'Password changed successfully'})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def regenerate_api_key(request):
    """Regenerate API key"""
    user = request.user
    current_password = request.data.get('current_password')
    
    if not check_password(current_password, user.password):
        return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
    
    new_api_key = secrets.token_urlsafe(48)
    user.api_key = new_api_key
    user.save()
    
    log_audit(
        user=user,
        action='ultra_secure.regenerate_api_key',
        module='security',
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    
    return Response({'new_api_key': new_api_key})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def regenerate_recovery_codes(request):
    """Generate recovery codes"""
    user = request.user
    current_password = request.data.get('current_password')
    
    if not check_password(current_password, user.password):
        return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Generate 10 recovery codes
    recovery_codes = [f"{secrets.token_hex(4)}-{secrets.token_hex(4)}-{secrets.token_hex(4)}-{secrets.token_hex(4)}".upper() for _ in range(10)]
    
    log_audit(
        user=user,
        action='ultra_secure.regenerate_recovery_codes',
        module='security',
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    
    return Response({'recovery_codes': recovery_codes})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def two_factor_status(request):
    """Get 2FA status"""
    user = request.user
    return Response({
        'two_factor_enabled': user.requires_2fa,
        'pending_setup': False,
        'qr_code_url': None,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def toggle_two_factor(request):
    """Enable/disable 2FA"""
    user = request.user
    action = request.data.get('action')
    current_password = request.data.get('current_password')
    
    if not check_password(current_password, user.password):
        return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
    
    if action == 'enable':
        # Generate TOTP secret (simplified - install pyotp for full implementation)
        secret = secrets.token_urlsafe(16)
        provisioning_uri = f"otpauth://totp/Athens2.0:{user.email}?secret={secret}&issuer=Athens2.0"
        
        user.totp_secret = secret
        user.requires_2fa = True
        user.save()
        
        log_audit(
            user=user,
            action='ultra_secure.enable_2fa',
            module='security',
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
        )
        
        return Response({
            'two_factor_enabled': True,
            'qr_code_url': provisioning_uri,
            'pending_verification': False,
        })
    
    elif action == 'disable':
        user.requires_2fa = False
        user.totp_secret = None
        user.save()
        
        log_audit(
            user=user,
            action='ultra_secure.disable_2fa',
            module='security',
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
        )
        
        return Response({'two_factor_enabled': False})
    
    return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def security_status(request):
    """Get real-time security status"""
    user = request.user
    
    score = 0
    if user.requires_2fa: score += 30
    if hasattr(user, 'api_key') and user.api_key: score += 20
    if user.password_changed_at: score += 20
    if IPRestriction.objects.filter(is_active=True).exists(): score += 15
    score += 15
    
    if score >= 90: level = 'ULTRA_SECURE'
    elif score >= 75: level = 'HIGH_SECURITY'
    elif score >= 60: level = 'MEDIUM_SECURITY'
    else: level = 'LOW_SECURITY'
    
    recommendations = []
    if not user.requires_2fa:
        recommendations.append({'priority': 'critical', 'message': 'Enable Two-Factor Authentication'})
    if not getattr(user, 'api_key', None):
        recommendations.append({'priority': 'high', 'message': 'Generate API Key for secure integrations'})
    
    return Response({
        'security_score': score,
        'security_level': level,
        'recommendations': recommendations,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def security_log(request):
    """Get security activity log"""
    from superadmin.models import AuditLog
    
    logs = AuditLog.objects.filter(
        user=request.user,
        module='security'
    ).order_by('-timestamp')[:50]
    
    log_data = [{
        'id': log.id,
        'timestamp': log.timestamp,
        'event_type': log.action,
        'details': f"{log.action} performed",
        'ip_address': log.ip_address,
        'user_agent': log.user_agent,
        'severity': 'low',
    } for log in logs]
    
    return Response({
        'logs': log_data,
        'security_summary': {
            'total_logins': 0,
            'failed_attempts': 0,
            'password_changes': 0,
            'suspicious_activities': 0,
        }
    })
