"""
Unit tests for API response utilities and exception handler.

Tests envelope mode (X-Athens-Envelope: 1) vs legacy mode.
"""

import pytest
from unittest.mock import Mock
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied, NotAuthenticated
from rest_framework.test import APIRequestFactory
from django.http import Http404

from system.api_response import is_envelope, ok, fail, paginate
from system.exception_handler import custom_exception_handler


class TestIsEnvelope:
    """Test envelope header detection"""
    
    def test_envelope_header_present(self):
        """Should return True when X-Athens-Envelope: 1"""
        request = Mock()
        request.headers = {'X-Athens-Envelope': '1'}
        assert is_envelope(request) is True
    
    def test_envelope_header_absent(self):
        """Should return False when header is missing"""
        request = Mock()
        request.headers = {}
        assert is_envelope(request) is False
    
    def test_envelope_header_wrong_value(self):
        """Should return False when header value is not '1'"""
        request = Mock()
        request.headers = {'X-Athens-Envelope': '0'}
        assert is_envelope(request) is False
    
    def test_no_request(self):
        """Should return False when request is None"""
        assert is_envelope(None) is False


class TestOkResponse:
    """Test success response helper"""
    
    def test_envelope_mode(self):
        """Should return envelope format when header present"""
        request = Mock()
        request.headers = {'X-Athens-Envelope': '1'}
        
        response = ok(data={'user': 'test'}, meta={'count': 1}, request=request)
        
        assert response.status_code == 200
        assert response.data == {
            'ok': True,
            'data': {'user': 'test'},
            'meta': {'count': 1},
            'error': None
        }
    
    def test_legacy_mode(self):
        """Should return raw data when header absent"""
        request = Mock()
        request.headers = {}
        
        response = ok(data={'user': 'test'}, request=request)
        
        assert response.status_code == 200
        assert response.data == {'user': 'test'}
    
    def test_custom_status_code(self):
        """Should respect custom status code"""
        request = Mock()
        request.headers = {'X-Athens-Envelope': '1'}
        
        response = ok(data={'created': True}, status=201, request=request)
        
        assert response.status_code == 201


class TestFailResponse:
    """Test error response helper"""
    
    def test_envelope_mode(self):
        """Should return envelope format when header present"""
        request = Mock()
        request.headers = {'X-Athens-Envelope': '1'}
        
        response = fail(
            'INVALID_INPUT',
            'Email is required',
            details={'field': 'email'},
            status=400,
            request=request
        )
        
        assert response.status_code == 400
        assert response.data == {
            'ok': False,
            'data': None,
            'meta': {},
            'error': {
                'code': 'INVALID_INPUT',
                'message': 'Email is required',
                'details': {'field': 'email'}
            }
        }
    
    def test_legacy_mode(self):
        """Should return DRF-compatible format when header absent"""
        request = Mock()
        request.headers = {}
        
        response = fail('INVALID_INPUT', 'Email is required', status=400, request=request)
        
        assert response.status_code == 400
        assert response.data == {'error': 'Email is required'}
    
    def test_custom_status_code(self):
        """Should respect custom status code"""
        request = Mock()
        request.headers = {'X-Athens-Envelope': '1'}
        
        response = fail('NOT_FOUND', 'User not found', status=404, request=request)
        
        assert response.status_code == 404


class TestExceptionHandler:
    """Test custom exception handler"""
    
    def test_validation_error_envelope_mode(self):
        """Should wrap ValidationError in envelope format"""
        factory = APIRequestFactory()
        request = factory.get('/', HTTP_X_ATHENS_ENVELOPE='1')
        
        exc = ValidationError({'email': ['This field is required.']})
        context = {'request': request, 'view': Mock()}
        
        response = custom_exception_handler(exc, context)
        
        assert response.status_code == 400
        assert response.data['ok'] is False
        assert response.data['error']['code'] == 'VALIDATION_ERROR'
        assert response.data['error']['message'] == 'Validation failed'
        assert response.data['error']['details'] == {'email': ['This field is required.']}
    
    def test_validation_error_legacy_mode(self):
        """Should preserve DRF format for ValidationError in legacy mode"""
        factory = APIRequestFactory()
        request = factory.get('/')
        
        exc = ValidationError({'email': ['This field is required.']})
        context = {'request': request, 'view': Mock()}
        
        response = custom_exception_handler(exc, context)
        
        assert response.status_code == 400
        assert response.data == {'email': ['This field is required.']}
    
    def test_permission_denied_envelope_mode(self):
        """Should wrap PermissionDenied in envelope format"""
        factory = APIRequestFactory()
        request = factory.get('/', HTTP_X_ATHENS_ENVELOPE='1')
        
        exc = PermissionDenied('You do not have permission')
        context = {'request': request, 'view': Mock()}
        
        response = custom_exception_handler(exc, context)
        
        assert response.status_code == 403
        assert response.data['ok'] is False
        assert response.data['error']['code'] == 'PERMISSION_DENIED'
        assert response.data['error']['message'] == 'You do not have permission'
    
    def test_not_authenticated_envelope_mode(self):
        """Should wrap NotAuthenticated in envelope format"""
        factory = APIRequestFactory()
        request = factory.get('/', HTTP_X_ATHENS_ENVELOPE='1')
        
        exc = NotAuthenticated()
        context = {'request': request, 'view': Mock()}
        
        response = custom_exception_handler(exc, context)
        
        assert response.status_code == 401
        assert response.data['ok'] is False
        assert response.data['error']['code'] == 'NOT_AUTHENTICATED'
    
    def test_not_authenticated_legacy_mode(self):
        """Should preserve DRF format for NotAuthenticated in legacy mode"""
        factory = APIRequestFactory()
        request = factory.get('/')
        
        exc = NotAuthenticated()
        context = {'request': request, 'view': Mock()}
        
        response = custom_exception_handler(exc, context)
        
        assert response.status_code == 401
        assert 'detail' in response.data
