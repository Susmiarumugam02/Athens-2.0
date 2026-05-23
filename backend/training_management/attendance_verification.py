"""
Attendance Verification API endpoints for Induction Training.
Supports: QR, OTP, Face, Admin Manual, Geolocation methods.
"""
import math
import random
import string
import base64
from io import BytesIO
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Training, TrainingAttendance, TrainingQRSession
from .ownership import get_training_queryset


def _is_admin(user):
    return user.user_type in ('superadmin', 'masteradmin') or getattr(user, 'role_type', 'user') == 'admin'


def _generate_otp():
    return ''.join(random.choices(string.digits, k=6))


def _training_exists(training_id):
    return Training.objects.filter(id=training_id).exists()


def _get_admin_training_or_response(user, training_id):
    try:
        training = get_training_queryset(user).get(id=training_id)
    except Training.DoesNotExist:
        if _training_exists(training_id):
            return None, Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        return None, Response({'error': 'Training not found'}, status=status.HTTP_404_NOT_FOUND)
    return training, None


def _get_user_training_or_response(user, training_id, induction_only=False):
    qs = get_training_queryset(user)
    if induction_only:
        qs = qs.filter(training_type__in=Training.INDUCTION_TYPES)
    try:
        training = qs.get(id=training_id)
    except Training.DoesNotExist:
        if _training_exists(training_id):
            return None, Response({'error': 'You are not assigned to this training'}, status=status.HTTP_403_FORBIDDEN)
        return None, Response({'error': 'Training not found'}, status=status.HTTP_404_NOT_FOUND)
    return training, None


def _qr_image_data_uri(payload):
    try:
        import qrcode
    except ImportError:
        return ''

    image = qrcode.make(payload)
    buffer = BytesIO()
    image.save(buffer, format='PNG')
    encoded = base64.b64encode(buffer.getvalue()).decode('ascii')
    return f'data:image/png;base64,{encoded}'


def _haversine_meters(lat1, lng1, lat2, lng2):
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ─── ADMIN: Generate OTP for a training session ───────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_otp(request, training_id):
    if not _is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    training, error_response = _get_admin_training_or_response(request.user, training_id)
    if error_response:
        return error_response

    otp = _generate_otp()
    training.otp_code = otp
    training.otp_expires_at = timezone.now() + timedelta(minutes=30)
    training.save(update_fields=['otp_code', 'otp_expires_at'])

    return Response({
        'otp': otp,
        'expires_at': training.otp_expires_at,
        'valid_minutes': 30,
    })


# ─── USER: Verify OTP ─────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_otp(request, training_id):
    otp_input = request.data.get('otp', '').strip()
    if not otp_input:
        return Response({'error': 'OTP is required'}, status=status.HTTP_400_BAD_REQUEST)

    training, error_response = _get_user_training_or_response(request.user, training_id)
    if error_response:
        return error_response

    if not training.otp_code:
        return Response({'error': 'No OTP generated for this session. Ask your admin.'}, status=status.HTTP_400_BAD_REQUEST)

    if training.otp_expires_at and timezone.now() > training.otp_expires_at:
        return Response({'error': 'OTP has expired. Ask admin to regenerate.'}, status=status.HTTP_400_BAD_REQUEST)

    if training.otp_code != otp_input:
        return Response({'error': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)

    attendance = TrainingAttendance.objects.filter(training=training, user=request.user).first()
    if not attendance:
        return Response({'error': 'You are not assigned to this training'}, status=status.HTTP_403_FORBIDDEN)
    if attendance.attendance_status in ('present', 'completed'):
        request.user.refresh_from_db()
        return Response({'message': 'Attendance already verified', 'already_done': True, **_access_payload(request.user)})

    _mark_verified(attendance, method='otp', verified_by='OTP Verification', marked_by=request.user)
    request.user.refresh_from_db()

    return Response({
        'message': 'Attendance verified via OTP',
        'attendance_status': 'verified',
        'user_activated': request.user.status == 'active',
        **_access_payload(request.user),
    })


# ─── ADMIN: Generate QR session for a training ────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_qr_session(request, training_id):
    if not _is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    training, error_response = _get_admin_training_or_response(request.user, training_id)
    if error_response:
        return error_response

    valid_hours = int(request.data.get('valid_hours', 24))
    valid_hours = max(1, min(valid_hours, 168))  # clamp 1h–7d

    session = TrainingQRSession.generate_for(training, request.user, valid_hours=valid_hours)

    # Build the QR payload that the scanner will read
    qr_payload = {
        'training_id': training.id,
        'session_token': session.qr_token,
        'tenant_id': training.tenant_id,
        'expires_at': session.expires_at.isoformat(),
        'title': training.title,
    }
    import json
    qr_payload_text = json.dumps(qr_payload)
    qr_image = _qr_image_data_uri(qr_payload_text)
    if qr_image and session.qr_image != qr_image:
        session.qr_image = qr_image
        session.save(update_fields=['qr_image'])
    return Response({
        'success': True,
        'training_id': training.id,
        'qr_token': session.qr_token,
        'session_token': session.session_token or session.qr_token,
        'qr_code': qr_image,
        'qr_image': qr_image or session.qr_image,
        'qr_payload': qr_payload_text,
        'expires_at': session.expires_at,
        'valid_hours': valid_hours,
        'session_id': session.id,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_qr(request):
    training_id = request.data.get('training_id')
    if not training_id:
        return Response({'error': 'training_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    return generate_qr_session(request, training_id)


# ─── ADMIN: Get active QR session ─────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_qr_session(request, training_id):
    if not _is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    training, error_response = _get_admin_training_or_response(request.user, training_id)
    if error_response:
        return error_response

    session = TrainingQRSession.objects.filter(
        training=training, is_active=True
    ).order_by('-created_at').first()

    if not session or not session.is_valid:
        return Response({'active': False, 'qr_token': None})

    import json
    qr_payload = json.dumps({
        'training_id': training.id,
        'session_token': session.qr_token,
        'tenant_id': session.training.tenant_id,
        'expires_at': session.expires_at.isoformat(),
    })
    return Response({
        'success': True,
        'training_id': training_id,
        'active': True,
        'qr_token': session.qr_token,
        'session_token': session.session_token or session.qr_token,
        'qr_code': session.qr_image,
        'qr_image': session.qr_image,
        'qr_payload': qr_payload,
        'expires_at': session.expires_at,
        'session_id': session.id,
    })


# ─── USER: Scan QR — validate token and mark attendance ───────────────────────

def _parse_qr_token(raw):
    """
    Parse raw QR scan data into (token, payload_training_id, payload_tenant_id).
    Returns (None, None, None) with an error string on failure.
    Only extracts data — never trusts payload training_id as authoritative.
    """
    import json as _json
    if not raw:
        return None, None, None, 'QR data is required'
    token = str(raw).strip()
    payload_training_id = None
    payload_tenant_id = None
    try:
        parsed = _json.loads(raw)
        # Prefer session_token; fall back to qr_token — never fall back to raw string
        token = parsed.get('session_token') or parsed.get('qr_token') or ''
        if not token:
            return None, None, None, 'Invalid QR code'
        payload_training_id = parsed.get('training_id')
        payload_tenant_id = parsed.get('tenant_id')
    except (ValueError, TypeError):
        pass  # bare token — training_id must come from URL, not payload
    return token, payload_training_id, payload_tenant_id, None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_qr(request, training_id):
    """Called after user scans QR. training_id MUST come from the URL — never from the payload."""
    import json as _json

    raw = request.data.get('qr_payload') or request.data.get('qr_token', '')
    token, payload_training_id, payload_tenant_id, parse_error = _parse_qr_token(raw)
    if parse_error:
        return Response({'error': parse_error}, status=status.HTTP_400_BAD_REQUEST)

    # Step 1 — training_id from URL is authoritative; reject if payload disagrees
    try:
        url_training_id = int(training_id)
    except (TypeError, ValueError):
        return Response({'error': 'Invalid training ID'}, status=status.HTTP_400_BAD_REQUEST)

    if payload_training_id is not None:
        try:
            if int(payload_training_id) != url_training_id:
                return Response(
                    {'error': 'This QR belongs to another training'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except (TypeError, ValueError):
            return Response({'error': 'Invalid QR code'}, status=status.HTTP_400_BAD_REQUEST)

    # Step 2 — look up session by token AND training_id together (no cross-training match)
    try:
        session = TrainingQRSession.objects.select_related('training').get(
            qr_token=token, training_id=url_training_id
        )
    except TrainingQRSession.DoesNotExist:
        return Response({'error': 'Invalid QR code'}, status=status.HTTP_400_BAD_REQUEST)

    attendance = TrainingAttendance.objects.filter(training=session.training, user=request.user).first()
    if not attendance:
        return Response(
            {'error': 'You are not assigned to this training session'},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Step 3 — session must be active
    if not session.is_active:
        return Response({'error': 'This QR code has been deactivated'}, status=status.HTTP_400_BAD_REQUEST)

    # Step 4 — expiry check (DB value is authoritative; payload expiry is secondary)
    now = timezone.now()
    if now > session.expires_at:
        return Response({'error': 'QR code has expired. Ask your admin to regenerate.'}, status=status.HTTP_400_BAD_REQUEST)

    # Step 5 — tenant isolation: session tenant must match user's tenant when both are set
    session_tenant = session.training.tenant_id
    user_tenant = getattr(request.user, 'tenant_id', None) or getattr(getattr(request.user, 'tenant', None), 'id', None)
    if session_tenant is not None and user_tenant is not None:
        try:
            if int(user_tenant) != int(session_tenant):
                return Response({'error': 'QR code does not match this tenant'}, status=status.HTTP_400_BAD_REQUEST)
        except (TypeError, ValueError):
            return Response({'error': 'Invalid QR code'}, status=status.HTTP_400_BAD_REQUEST)
    # Also check payload tenant if present
    if payload_tenant_id is not None and session_tenant is not None:
        try:
            if int(payload_tenant_id) != int(session_tenant):
                return Response({'error': 'QR code does not match this tenant'}, status=status.HTTP_400_BAD_REQUEST)
        except (TypeError, ValueError):
            return Response({'error': 'Invalid QR code'}, status=status.HTTP_400_BAD_REQUEST)

    training = session.training

    # Step 5b — training session must be active (not cancelled or completed)
    if training.status == Training.STATUS_CANCELLED:
        return Response({'error': 'This training session has been cancelled'}, status=status.HTTP_400_BAD_REQUEST)
    if training.status == Training.STATUS_COMPLETED:
        return Response({'error': 'This training session has already ended'}, status=status.HTTP_400_BAD_REQUEST)

    # Step 7 — duplicate attendance guard
    if attendance.attendance_status in ('present', 'completed'):
        request.user.refresh_from_db()
        return Response({
            'message': 'Attendance already marked',
            'already_done': True,
            'attendance_status': 'completed',
            'training_completed': True,
            'access_unlocked': True,
            **_access_payload(request.user),
        })

    _mark_verified(
        attendance,
        method='qr',
        verified_by=f'QR Scan — session {session.id}',
        marked_by=request.user,
        gps_location=request.data.get('gps_location') or {},
        device_info=_device_info(request),
    )
    request.user.refresh_from_db()

    return Response({
        'message': 'Attendance verified via QR code',
        'success': True,
        'attendance_marked': True,
        'training_completed': True,
        **_access_payload(request.user),
        'attendance_status': 'completed',
        'user_status': request.user.status,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def validate_qr(request):
    """Pre-scan validation — does NOT mark attendance."""
    raw = request.data.get('qr_payload') or request.data.get('qr_token', '')
    token, payload_training_id, payload_tenant_id, parse_error = _parse_qr_token(raw)
    if parse_error:
        return Response({'valid': False, 'error': parse_error}, status=status.HTTP_400_BAD_REQUEST)
    if not payload_training_id:
        return Response({'valid': False, 'error': 'QR code missing training reference'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        session = TrainingQRSession.objects.select_related('training').get(
            qr_token=token, training_id=int(payload_training_id)
        )
    except TrainingQRSession.DoesNotExist:
        return Response({'valid': False, 'error': 'Invalid QR code'}, status=status.HTTP_400_BAD_REQUEST)
    assigned = TrainingAttendance.objects.filter(training=session.training, user=request.user).exists()
    if not assigned:
        return Response({'valid': False, 'error': 'You are not assigned to this training'}, status=status.HTTP_403_FORBIDDEN)
    if not session.is_active:
        return Response({'valid': False, 'error': 'This QR code has been deactivated'}, status=status.HTTP_400_BAD_REQUEST)
    if timezone.now() > session.expires_at:
        return Response({'valid': False, 'error': 'QR code has expired'}, status=status.HTTP_400_BAD_REQUEST)
    session_tenant = session.training.tenant_id
    if payload_tenant_id is not None and session_tenant is not None:
        try:
            if int(payload_tenant_id) != int(session_tenant):
                return Response({'valid': False, 'error': 'QR code does not match this tenant'}, status=status.HTTP_400_BAD_REQUEST)
        except (TypeError, ValueError):
            return Response({'valid': False, 'error': 'Invalid QR code'}, status=status.HTTP_400_BAD_REQUEST)
    return Response({
        'valid': True,
        'assigned': True,
        'training_id': session.training_id,
        'expires_at': session.expires_at,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_attendance(request):
    """Generic mark-attendance endpoint — training_id MUST be present in the QR payload."""
    raw = request.data.get('qr_payload') or request.data.get('qr_token', '')
    token, payload_training_id, payload_tenant_id, parse_error = _parse_qr_token(raw)
    if parse_error:
        return Response({'error': parse_error}, status=status.HTTP_400_BAD_REQUEST)

    # Require training_id in payload — bare-token fallback removed to prevent cross-training reuse
    if not payload_training_id:
        return Response(
            {'error': 'Invalid QR code — missing training reference'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate token is bound to the claimed training_id (no cross-training match)
    try:
        session = TrainingQRSession.objects.select_related('training').get(
            qr_token=token, training_id=int(payload_training_id)
        )
    except (TrainingQRSession.DoesNotExist, ValueError, TypeError):
        return Response({'error': 'Invalid QR code'}, status=status.HTTP_400_BAD_REQUEST)

    if not TrainingAttendance.objects.filter(training=session.training, user=request.user).exists():
        return Response({'error': 'You are not assigned to this training'}, status=status.HTTP_403_FORBIDDEN)

    if not session.is_active:
        return Response({'error': 'This QR code has been deactivated'}, status=status.HTTP_400_BAD_REQUEST)

    if timezone.now() > session.expires_at:
        return Response({'error': 'QR code has expired. Ask your admin to regenerate.'}, status=status.HTTP_400_BAD_REQUEST)

    # Tenant isolation — reject if tenant mismatch (treat null tenant as unscoped, not a bypass)
    session_tenant = session.training.tenant_id
    if payload_tenant_id is not None and session_tenant is not None:
        try:
            if int(payload_tenant_id) != int(session_tenant):
                return Response({'error': 'QR code does not match this tenant'}, status=status.HTTP_400_BAD_REQUEST)
        except (TypeError, ValueError):
            return Response({'error': 'Invalid QR code'}, status=status.HTTP_400_BAD_REQUEST)

    return verify_qr(request, session.training_id)


# ─── USER: Request Admin Verification ─────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_admin_verification(request, training_id):
    training, error_response = _get_user_training_or_response(request.user, training_id)
    if error_response:
        return error_response

    attendance = TrainingAttendance.objects.filter(training=training, user=request.user).first()
    if not attendance:
        return Response({'error': 'You are not assigned to this training'}, status=status.HTTP_403_FORBIDDEN)

    if attendance.attendance_status in ('present', 'completed'):
        request.user.refresh_from_db()
        return Response({'message': 'Attendance already verified', 'already_done': True, **_access_payload(request.user)})

    # Mark as pending admin approval (status stays 'pending', method recorded)
    attendance.attendance_method = 'admin'
    attendance.verified_by = 'Pending admin approval'
    attendance.save(update_fields=['attendance_method', 'verified_by'])

    return Response({
        'message': 'Admin verification requested. Your admin will mark your attendance.',
        'attendance_status': 'pending',
    })


# ─── USER: Verify Geolocation ─────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_geolocation(request, training_id):
    lat = request.data.get('latitude')
    lng = request.data.get('longitude')

    if lat is None or lng is None:
        return Response({'error': 'latitude and longitude are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        lat, lng = float(lat), float(lng)
    except (TypeError, ValueError):
        return Response({'error': 'Invalid coordinates'}, status=status.HTTP_400_BAD_REQUEST)

    training, error_response = _get_user_training_or_response(request.user, training_id)
    if error_response:
        return error_response

    if training.site_lat is None or training.site_lng is None:
        return Response({'error': 'Site location not configured for this training'}, status=status.HTTP_400_BAD_REQUEST)

    distance = _haversine_meters(lat, lng, training.site_lat, training.site_lng)
    radius = training.geo_radius_meters or 200

    if distance > radius:
        return Response({
            'error': f'You are {int(distance)}m from the training site (allowed: {radius}m)',
            'distance_meters': int(distance),
            'allowed_radius': radius,
        }, status=status.HTTP_400_BAD_REQUEST)

    attendance = TrainingAttendance.objects.filter(training=training, user=request.user).first()
    if not attendance:
        return Response({'error': 'You are not assigned to this training'}, status=status.HTTP_403_FORBIDDEN)
    if attendance.attendance_status in ('present', 'completed'):
        return Response({'message': 'Attendance already verified', 'already_done': True})

    attendance.geo_lat = lat
    attendance.geo_lng = lng
    _mark_verified(attendance, method='geo', verified_by='Geolocation Verified', marked_by=request.user)
    request.user.refresh_from_db()

    return Response({
        'message': f'Attendance verified via geolocation ({int(distance)}m from site)',
        'attendance_status': 'verified',
        'distance_meters': int(distance),
        'user_activated': request.user.status == 'active',
        **_access_payload(request.user),
    })


# ─── ADMIN: Manually approve a pending attendance request ─────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_approve_attendance(request, training_id, user_id):
    if not _is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    training, error_response = _get_admin_training_or_response(request.user, training_id)
    if error_response:
        return error_response
    try:
        from authentication.models import User
        target_user = User.objects.get(id=user_id)
    except Exception:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    attendance = TrainingAttendance.objects.filter(training=training, user=target_user).first()
    if not attendance:
        return Response({'error': 'User is not assigned to this training'}, status=status.HTTP_403_FORBIDDEN)
    _mark_verified(
        attendance,
        method='admin',
        verified_by=request.user.get_full_name() or request.user.email,
        marked_by=request.user,
    )
    target_user.refresh_from_db()

    return Response({
        'message': f'Attendance approved for {target_user.email}',
        'user_activated': target_user.status == 'active',
        'user_status': target_user.status,
    })


# ─── ADMIN: Get live attendance count ─────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def live_attendance_count(request, training_id):
    if not _is_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    training, error_response = _get_admin_training_or_response(request.user, training_id)
    if error_response:
        return error_response

    qs = training.attendances.all()
    total = qs.count()
    verified = qs.filter(attendance_status__in=('present', 'completed')).count()
    pending = qs.filter(attendance_status='pending').count()
    absent = qs.filter(attendance_status='absent').count()

    by_method = {}
    for att in qs.filter(attendance_status__in=('present', 'completed')):
        m = att.attendance_method or 'unknown'
        by_method[m] = by_method.get(m, 0) + 1

    return Response({
        'total': total,
        'verified': verified,
        'pending': pending,
        'absent': absent,
        'completion_percentage': round((verified / total) * 100) if total else 0,
        'by_method': by_method,
        'otp_active': bool(training.otp_code and training.otp_expires_at and timezone.now() < training.otp_expires_at),
        'otp_expires_at': training.otp_expires_at,
    })


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _access_payload(user):
    return {
        'training_completed': True,
        'induction_completed': bool(getattr(user, 'induction_completed', False)),
        'attendance_verified': bool(getattr(user, 'attendance_verified', False)),
        'modules_unlocked': bool(getattr(user, 'modules_unlocked', getattr(user, 'module_access_enabled', False))),
        'onboarding_completed': bool(getattr(user, 'onboarding_completed', getattr(user, 'onboarding_status', '') == 'completed')),
        'access_status': getattr(user, 'access_status', 'active' if getattr(user, 'module_access_enabled', False) else 'restricted'),
        'onboarding_status': getattr(user, 'onboarding_status', 'completed' if getattr(user, 'onboarding_completed', False) else 'pending_training'),
        'induction_status': 'completed' if getattr(user, 'induction_completed', False) else 'pending',
        'platform_access': bool(getattr(user, 'module_access_enabled', False)),
        'access_unlocked': bool(getattr(user, 'module_access_enabled', False)),
    }



def _device_info(request):
    supplied = request.data.get('device_info') or {}
    if not isinstance(supplied, dict):
        supplied = {'value': str(supplied)}
    supplied.setdefault('user_agent', request.META.get('HTTP_USER_AGENT', ''))
    supplied.setdefault('ip_address', request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', '')).split(',')[0])
    supplied.setdefault('logged_at', timezone.now().isoformat())
    return supplied


def _mark_verified(attendance, method, verified_by, marked_by, gps_location=None, device_info=None):
    now = timezone.now()
    attendance.attendance_status = TrainingAttendance.STATUS_COMPLETED
    attendance.attendance_method = method
    attendance.verification_status = 'verified'
    attendance.verified_by = verified_by
    attendance.marked_by = marked_by
    attendance.marked_at = now
    attendance.completed_at = now
    if gps_location is not None:
        attendance.gps_location = gps_location
        try:
            attendance.geo_lat = gps_location.get('latitude')
            attendance.geo_lng = gps_location.get('longitude')
        except AttributeError:
            pass
    if device_info is not None:
        attendance.device_info = device_info
    attendance.save()
