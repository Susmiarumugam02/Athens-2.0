from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
import logging

logger = logging.getLogger(__name__)

class PTWError(Exception):
    """Base PTW error class"""
    def __init__(self, message, code=None, details=None):
        self.message = message
        self.code = code or 'PTW_ERROR'
        self.details = details or {}
        super().__init__(self.message)

class PTWValidationError(PTWError):
    """PTW validation error"""
    def __init__(self, message, field=None, details=None):
        super().__init__(message, 'VALIDATION_ERROR', details)
        self.field = field

class PTWPermissionError(PTWError):
    """PTW permission error"""
    def __init__(self, message, action=None, details=None):
        super().__init__(message, 'PERMISSION_ERROR', details)
        self.action = action

class PTWWorkflowError(PTWError):
    """PTW workflow error"""
    def __init__(self, message, current_status=None, target_status=None, details=None):
        super().__init__(message, 'WORKFLOW_ERROR', details)
        self.current_status = current_status
        self.target_status = target_status

class PTWSignatureError(PTWError):
    """PTW signature error"""
    def __init__(self, message, signature_type=None, details=None):
        super().__init__(message, 'SIGNATURE_ERROR', details)
        self.signature_type = signature_type

class PTWConflictError(PTWError):
    """PTW conflict error for offline sync"""
    def __init__(self, message, entity=None, server_version=None, client_version=None, details=None):
        super().__init__(message, 'CONFLICT_ERROR', details)
        self.entity = entity
        self.server_version = server_version
        self.client_version = client_version

def unified_exception_handler(exc, context):
    """
    Unified exception handler for PTW module
    
    Provides consistent error response format:
    {
        "error": {
            "code": "ERROR_CODE",
            "message": "Human readable message",
            "details": {...},
            "field": "field_name" (for validation errors),
            "timestamp": "2024-01-01T00:00:00Z"
        }
    }
    """
    from django.utils import timezone
    
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # Custom error handling for PTW errors
    if isinstance(exc, PTWError):
        error_data = {
            'error': {
                'code': exc.code,
                'message': exc.message,
                'details': exc.details,
                'timestamp': timezone.now().isoformat()
            }
        }
        
        # Add specific fields for different error types
        if isinstance(exc, PTWValidationError) and exc.field:
            error_data['error']['field'] = exc.field
        
        if isinstance(exc, PTWPermissionError) and exc.action:
            error_data['error']['action'] = exc.action
        
        if isinstance(exc, PTWWorkflowError):
            error_data['error']['current_status'] = exc.current_status
            error_data['error']['target_status'] = exc.target_status
        
        if isinstance(exc, PTWSignatureError) and exc.signature_type:
            error_data['error']['signature_type'] = exc.signature_type
        
        if isinstance(exc, PTWConflictError):
            error_data['error']['entity'] = exc.entity
            error_data['error']['server_version'] = exc.server_version
            error_data['error']['client_version'] = exc.client_version
        
        # Determine HTTP status code
        status_code = status.HTTP_400_BAD_REQUEST
        if isinstance(exc, PTWPermissionError):
            status_code = status.HTTP_403_FORBIDDEN
        elif isinstance(exc, PTWConflictError):
            status_code = status.HTTP_409_CONFLICT
        
        return Response(error_data, status=status_code)
    
    # Handle Django validation errors
    elif isinstance(exc, DjangoValidationError):
        error_data = {
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': 'Validation failed',
                'details': exc.message_dict if hasattr(exc, 'message_dict') else {'non_field_errors': exc.messages},
                'timestamp': timezone.now().isoformat()
            }
        }
        return Response(error_data, status=status.HTTP_400_BAD_REQUEST)
    
    # Handle database integrity errors
    elif isinstance(exc, IntegrityError):
        error_data = {
            'error': {
                'code': 'INTEGRITY_ERROR',
                'message': 'Database constraint violation',
                'details': {'database_error': str(exc)},
                'timestamp': timezone.now().isoformat()
            }
        }
        return Response(error_data, status=status.HTTP_400_BAD_REQUEST)
    
    # Enhance standard DRF error responses
    elif response is not None:
        custom_response_data = {
            'error': {
                'code': 'API_ERROR',
                'message': 'Request failed',
                'details': response.data,
                'timestamp': timezone.now().isoformat()
            }
        }
        response.data = custom_response_data
    
    return response

class PTWErrorHandler:
    """Utility class for consistent error handling in PTW views"""
    
    @staticmethod
    def handle_validation_error(message, field=None, details=None):
        """Raise standardized validation error"""
        raise PTWValidationError(message, field, details)
    
    @staticmethod
    def handle_permission_error(message, action=None, details=None):
        """Raise standardized permission error"""
        raise PTWPermissionError(message, action, details)
    
    @staticmethod
    def handle_workflow_error(message, current_status=None, target_status=None, details=None):
        """Raise standardized workflow error"""
        raise PTWWorkflowError(message, current_status, target_status, details)
    
    @staticmethod
    def handle_signature_error(message, signature_type=None, details=None):
        """Raise standardized signature error"""
        raise PTWSignatureError(message, signature_type, details)
    
    @staticmethod
    def handle_conflict_error(message, entity=None, server_version=None, client_version=None, details=None):
        """Raise standardized conflict error"""
        raise PTWConflictError(message, entity, server_version, client_version, details)
    
    @staticmethod
    def log_error(error, context=None):
        """Log error with context"""
        context_str = f" Context: {context}" if context else ""
        logger.error(f"PTW Error: {str(error)}{context_str}")
    
    @staticmethod
    def create_success_response(data=None, message=None):
        """Create standardized success response"""
        from django.utils import timezone
        
        response_data = {
            'success': True,
            'timestamp': timezone.now().isoformat()
        }
        
        if message:
            response_data['message'] = message
        
        if data is not None:
            response_data['data'] = data
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    @staticmethod
    def create_created_response(data=None, message=None):
        """Create standardized creation response"""
        from django.utils import timezone
        
        response_data = {
            'success': True,
            'created': True,
            'timestamp': timezone.now().isoformat()
        }
        
        if message:
            response_data['message'] = message
        
        if data is not None:
            response_data['data'] = data
        
        return Response(response_data, status=status.HTTP_201_CREATED)

# Error handler instance
ptw_error_handler = PTWErrorHandler()