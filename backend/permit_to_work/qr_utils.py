"""
QR Code generation for permits
"""
import json
import base64


def generate_permit_qr_data(permit):
    """Generate QR code data for permit"""
    data = {
        'permit_id': permit.id,
        'permit_number': permit.permit_number,
        'permit_type': permit.permit_type.name,
        'status': permit.status,
        'location': permit.location,
        'start_time': permit.planned_start_time.isoformat() if permit.planned_start_time else None,
        'end_time': permit.planned_end_time.isoformat() if permit.planned_end_time else None,
    }
    
    # Encode as base64 JSON
    json_str = json.dumps(data)
    qr_data = base64.b64encode(json_str.encode()).decode()
    
    return qr_data


def decode_permit_qr_data(qr_data):
    """Decode QR code data"""
    try:
        json_str = base64.b64decode(qr_data.encode()).decode()
        return json.loads(json_str)
    except Exception:
        return None
