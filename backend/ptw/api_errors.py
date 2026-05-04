"""
PTW API Error Helper - Standardized error responses
"""
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

class PTWAPIErrors:
    """
    Standardized PTW API error responses
    """
    
    @staticmethod
    def validation_error(message, field=None, details=None):
        """Return standardized validation error"""
        error_data = {
            'error': {
                'code': 'PTW_VALIDATION_FAILED',
                'message': message,
                'timestamp': timezone.now().isoformat()
            }
        }
        
        if field:
            error_data['error']['field'] = field
        
        if details:
            error_data['error']['details'] = details
        
        return Response(error_data, status=status.HTTP_400_BAD_REQUEST)
    
    @staticmethod
    def permission_error(message, action=None):
        """Return standardized permission error"""
        error_data = {
            'error': {
                'code': 'PTW_PERMISSION_DENIED',
                'message': message,
                'timestamp': timezone.now().isoformat()
            }
        }
        
        if action:
            error_data['error']['action'] = action
        
        return Response(error_data, status=status.HTTP_403_FORBIDDEN)
    
    @staticmethod
    def workflow_error(message, current_status=None, target_status=None):
        """Return standardized workflow error"""
        error_data = {
            'error': {
                'code': 'PTW_WORKFLOW_ERROR',
                'message': message,
                'timestamp': timezone.now().isoformat()
            }
        }
        
        if current_status:
            error_data['error']['current_status'] = current_status
        
        if target_status:
            error_data['error']['target_status'] = target_status
        
        return Response(error_data, status=status.HTTP_400_BAD_REQUEST)
    
    @staticmethod
    def signature_error(message, signature_type=None):
        """Return standardized signature error"""
        error_data = {
            'error': {
                'code': 'PTW_SIGNATURE_ERROR',
                'message': message,
                'timestamp': timezone.now().isoformat()
            }
        }
        
        if signature_type:
            error_data['error']['signature_type'] = signature_type
        
        return Response(error_data, status=status.HTTP_400_BAD_REQUEST)
    
    @staticmethod
    def not_found_error(message, resource=None):
        """Return standardized not found error"""
        error_data = {
            'error': {
                'code': 'PTW_NOT_FOUND',
                'message': message,
                'timestamp': timezone.now().isoformat()
            }
        }
        
        if resource:
            error_data['error']['resource'] = resource
        
        return Response(error_data, status=status.HTTP_404_NOT_FOUND)
    
    @staticmethod
    def conflict_error(message, entity=None, server_version=None, client_version=None):
        """Return standardized conflict error"""
        error_data = {
            'error': {
                'code': 'PTW_CONFLICT',
                'message': message,
                'timestamp': timezone.now().isoformat()
            }
        }
        
        if entity:
            error_data['error']['entity'] = entity
        
        if server_version:
            error_data['error']['server_version'] = server_version
        
        if client_version:
            error_data['error']['client_version'] = client_version
        
        return Response(error_data, status=status.HTTP_409_CONFLICT)
    
    @staticmethod
    def success_response(message=None, data=None):
        """Return standardized success response"""
        response_data = {
            'success': True,
            'timestamp': timezone.now().isoformat()
        }
        
        if message:
            response_data['message'] = message
        
        if data is not None:
            response_data['data'] = data
        
        return Response(response_data, status=status.HTTP_200_OK)

# Helper instance
ptw_api_errors = PTWAPIErrors()