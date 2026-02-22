"""
Canonical API Response Utilities

Provides standardized response envelopes with opt-in support via X-Athens-Envelope header.

Usage:
    from system.api_response import ok, fail, paginate, is_envelope
    
    # Success response
    return ok(data={'user': user_data}, request=request)
    
    # Error response
    return fail('INVALID_INPUT', 'Email is required', status=400, request=request)
    
    # Paginated response
    return paginate(request, queryset, UserSerializer)
"""

from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination


def is_envelope(request):
    """
    Check if request wants envelope format via X-Athens-Envelope header.
    
    Args:
        request: DRF Request object
        
    Returns:
        bool: True if envelope format requested, False for legacy format
    """
    if not request:
        return False
    return request.headers.get('X-Athens-Envelope') == '1'


def ok(data=None, meta=None, status=200, request=None):
    """
    Return success response.
    
    Envelope mode (X-Athens-Envelope: 1):
        {"ok": true, "data": <data>, "meta": <meta>, "error": null}
    
    Legacy mode (default):
        <data> (raw payload)
    
    Args:
        data: Response payload
        meta: Optional metadata dict
        status: HTTP status code (default 200)
        request: DRF Request object (required for envelope detection)
        
    Returns:
        Response: DRF Response object
    """
    if is_envelope(request):
        payload = {
            'ok': True,
            'data': data,
            'meta': meta or {},
            'error': None
        }
        return Response(payload, status=status)
    
    # Legacy mode: return raw data
    return Response(data, status=status)


def fail(code, message, details=None, status=400, request=None, meta=None):
    """
    Return error response.
    
    Envelope mode (X-Athens-Envelope: 1):
        {"ok": false, "data": null, "meta": <meta>, "error": {"code": <code>, "message": <message>, "details": <details>}}
    
    Legacy mode (default):
        {"error": <message>} or {"detail": <message>} (DRF-compatible)
    
    Args:
        code: Error code string (e.g., 'INVALID_INPUT', 'NOT_FOUND')
        message: Human-readable error message
        details: Optional additional error details (dict or any)
        status: HTTP status code (default 400)
        request: DRF Request object (required for envelope detection)
        meta: Optional metadata dict
        
    Returns:
        Response: DRF Response object
    """
    if is_envelope(request):
        payload = {
            'ok': False,
            'data': None,
            'meta': meta or {},
            'error': {
                'code': code,
                'message': message,
                'details': details
            }
        }
        return Response(payload, status=status)
    
    # Legacy mode: DRF-compatible error format
    return Response({'error': message}, status=status)


class AthensPagination(PageNumberPagination):
    """
    Custom pagination class supporting both envelope and legacy modes.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


def paginate(request, queryset, serializer_class, meta_extra=None):
    """
    Paginate queryset and return response.
    
    Envelope mode (X-Athens-Envelope: 1):
        {"ok": true, "data": [results], "meta": {"count": N, "next": url, "previous": url, ...}, "error": null}
    
    Legacy mode (default):
        {"count": N, "next": url, "previous": url, "results": [results]} (DRF default)
    
    Args:
        request: DRF Request object
        queryset: Django QuerySet to paginate
        serializer_class: Serializer class for results
        meta_extra: Optional extra metadata to include in meta dict
        
    Returns:
        Response: DRF Response object
    """
    paginator = AthensPagination()
    page = paginator.paginate_queryset(queryset, request)
    
    if page is not None:
        serializer = serializer_class(page, many=True, context={'request': request})
        
        if is_envelope(request):
            # Envelope mode
            meta = {
                'count': paginator.page.paginator.count,
                'next': paginator.get_next_link(),
                'previous': paginator.get_previous_link(),
            }
            if meta_extra:
                meta.update(meta_extra)
            
            return ok(data=serializer.data, meta=meta, request=request)
        
        # Legacy mode: DRF default pagination format
        return paginator.get_paginated_response(serializer.data)
    
    # No pagination (queryset too small or pagination disabled)
    serializer = serializer_class(queryset, many=True, context={'request': request})
    return ok(data=serializer.data, request=request)
