try:
    import qrcode
except ImportError:
    qrcode = None
import base64
import hashlib
import hmac
from io import BytesIO
from django.conf import settings
from django.utils import timezone
import json
import uuid
from django.core.cache import cache

def _build_mobile_url(permit):
    base_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:5173')
    return f"{base_url}/mobile/permit/{permit.id}"


def _sign_qr_payload(payload):
    secret = getattr(settings, 'SECRET_KEY', '') or ''
    if not secret:
        return ''
    parts = [
        str(payload.get('permit_id') or ''),
        str(payload.get('permit_number') or ''),
        str(payload.get('project_id') or ''),
        str(payload.get('ts') or ''),
    ]
    message = '|'.join(parts).encode()
    return hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()[:16]


def generate_permit_qr_code(permit, qr_payload=None, size='medium'):
    """Generate QR code image for permit payload with enhanced options."""
    
    if qrcode is None:
        return None
    
    # Check cache first
    cache_key = f"qr_code_{permit.id}_{permit.version}_{size}"
    cached_qr = cache.get(cache_key)
    if cached_qr:
        return cached_qr
    
    payload = qr_payload or generate_permit_qr_data(permit)
    
    # Size configurations
    size_configs = {
        'small': {'box_size': 6, 'border': 2},
        'medium': {'box_size': 10, 'border': 4},
        'large': {'box_size': 15, 'border': 6}
    }
    config = size_configs.get(size, size_configs['medium'])
    
    # Create QR code with better error correction for mobile scanning
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,  # Better error correction
        box_size=config['box_size'],
        border=config['border'],
    )
    
    qr.add_data(payload)
    qr.make(fit=True)
    
    # Create QR code image with better contrast
    img = qr.make_image(fill_color="#000000", back_color="#FFFFFF")
    
    # Convert to base64 string
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    result = f"data:image/png;base64,{img_str}"
    
    # Cache for 1 hour
    cache.set(cache_key, result, 3600)
    
    return result

def generate_permit_qr_data(permit):
    """Generate QR code data string for permit with enhanced metadata."""
    ts = timezone.now().isoformat()
    mobile_url = _build_mobile_url(permit)
    
    # Enhanced QR data with offline support
    qr_data = {
        'v': '2.0',  # QR data version
        'id': permit.id,
        'permit_id': permit.id,
        'number': permit.permit_number,
        'permit_number': permit.permit_number,
        'project_id': permit.project_id,
        'type': permit.permit_type.category if permit.permit_type else '',
        'type_name': permit.permit_type.name if permit.permit_type else '',
        'location': permit.location,
        'status': permit.status,
        'risk_level': permit.risk_level,
        'created_by': permit.created_by.username if permit.created_by else '',
        'planned_start': permit.planned_start_time.isoformat() if permit.planned_start_time else None,
        'planned_end': permit.planned_end_time.isoformat() if permit.planned_end_time else None,
        'mobile_url': mobile_url,
        'web_url': f"{getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:5173')}/dashboard/ptw/view/{permit.id}",
        'ts': ts,
        'expires': (timezone.now() + timezone.timedelta(hours=24)).isoformat(),  # QR expires in 24h
    }
    
    # Add offline data for basic permit info
    qr_data['offline_data'] = {
        'description': permit.description[:200] if permit.description else '',  # Truncate for QR size
        'control_measures': permit.control_measures[:200] if permit.control_measures else '',
        'ppe_requirements': permit.ppe_requirements[:5] if permit.ppe_requirements else [],  # First 5 items
        'work_nature': permit.work_nature,
    }
    
    qr_data['sig'] = _sign_qr_payload(qr_data)
    return base64.b64encode(json.dumps(qr_data).encode()).decode()

def validate_qr_data(qr_string):
    """Validate and decode QR data with signature verification."""
    try:
        decoded_data = json.loads(base64.b64decode(qr_string).decode())
        
        # Check expiration
        if 'expires' in decoded_data:
            expires = timezone.datetime.fromisoformat(decoded_data['expires'].replace('Z', '+00:00'))
            if timezone.now() > expires:
                return None, 'QR code has expired'
        
        # Verify signature
        stored_sig = decoded_data.pop('sig', '')
        calculated_sig = _sign_qr_payload(decoded_data)
        
        if stored_sig != calculated_sig:
            return None, 'Invalid QR code signature'
        
        return decoded_data, None
        
    except Exception as e:
        return None, f'Invalid QR code format: {str(e)}'

def generate_batch_qr_codes(permits, size='medium'):
    """Generate QR codes for multiple permits efficiently."""
    results = {}
    
    for permit in permits:
        try:
            qr_image = generate_permit_qr_code(permit, size=size)
            qr_data = generate_permit_qr_data(permit)
            
            results[permit.id] = {
                'permit_number': permit.permit_number,
                'qr_image': qr_image,
                'qr_data': qr_data,
                'mobile_url': _build_mobile_url(permit),
                'success': True
            }
        except Exception as e:
            results[permit.id] = {
                'permit_number': permit.permit_number,
                'error': str(e),
                'success': False
            }
    
    return results
