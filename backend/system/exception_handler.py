"""
Custom DRF Exception Handler

Provides standardized error responses with opt-in envelope support.

Handles:
- ValidationError (field errors)
- PermissionDenied (403)
- NotAuthenticated (401)
- Http404 (404)
- All other DRF exceptions
"""

from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.exceptions import ValidationError, PermissionDenied, NotAuthenticated
from django.http import Http404
from rest_framework.response import Response
from system.api_response import is_envelope


def custom_exception_handler(exc, context):
    """
    Custom exception handler for DRF.
    
    Envelope mode (X-Athens-Envelope: 1):
        {"ok": false, "data": null, "meta": {}, "error": {"code": <code>, "message": <message>, "details": <details>}}
    
    Legacy mode (default):
        Preserves DRF default error format ({"detail": "..."} or field errors)
    
    Args:
        exc: Exception instance
        context: Exception context dict with 'view' and 'request'
        
    Returns:
        Response: DRF Response object or None
    """
    # Call DRF's default exception handler first to get standard error response
    response = drf_exception_handler(exc, context)
    
    if response is None:
        return None
    
    request = context.get('request')
    
    # Legacy mode: return DRF default response unchanged
    if not is_envelope(request):
        return response
    
    # Envelope mode: wrap error in standard envelope
    error_code = 'UNKNOWN_ERROR'
    error_message = 'An error occurred'
    error_details = None
    
    # Extract error information based on exception type
    if isinstance(exc, ValidationError):
        error_code = 'VALIDATION_ERROR'
        error_message = 'Validation failed'
        error_details = response.data
    elif isinstance(exc, PermissionDenied):
        error_code = 'PERMISSION_DENIED'
        error_message = str(exc) if str(exc) else 'You do not have permission to perform this action'
        error_details = response.data if isinstance(response.data, dict) else None
    elif isinstance(exc, NotAuthenticated):
        error_code = 'NOT_AUTHENTICATED'
        error_message = str(exc) if str(exc) else 'Authentication credentials were not provided'
        error_details = response.data if isinstance(response.data, dict) else None
    elif isinstance(exc, Http404):
        error_code = 'NOT_FOUND'
        error_message = 'Resource not found'
        error_details = response.data if isinstance(response.data, dict) else None
    else:
        # Generic DRF exception
        if hasattr(exc, 'default_code'):
            error_code = exc.default_code.upper()
        if hasattr(exc, 'detail'):
            if isinstance(exc.detail, str):
                error_message = exc.detail
            elif isinstance(exc.detail, dict):
                error_message = 'Request failed'
                error_details = exc.detail
            else:
                error_message = str(exc.detail)
        error_details = response.data if isinstance(response.data, dict) and error_details is None else error_details
    
    # Build envelope response
    envelope_data = {
        'ok': False,
        'data': None,
        'meta': {},
        'error': {
            'code': error_code,
            'message': error_message,
            'details': error_details
        }
    }
    
    return Response(envelope_data, status=response.status_code)
