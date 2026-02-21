from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
from authentication.models import User, Project
from control_plane.models import Tenant
import os


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def company_details(request):
    """Get or update company details"""
    user = request.user
    
    try:
        if request.method == 'GET':
            # Get company details from user or tenant
            logo_url = None
            try:
                if user.company_logo and hasattr(user.company_logo, 'url'):
                    logo_url = request.build_absolute_uri(user.company_logo.url)
            except Exception:
                pass
            
            data = {
                'company_name': user.company_name or '',
                'registered_address': user.registered_address or '',
                'contact_email': user.email,
                'contact_phone': user.phone_number or '',
                'website': '',
                'tax_id': '',
                'registration_number': '',
                'company_logo': logo_url,
            }
            
            # Try to get from tenant if available
            if user.tenant:
                data['company_name'] = user.tenant.name
                data['contact_email'] = user.tenant.admin_email
            
            return Response(data)
        
        elif request.method == 'PUT':
            # Update company details
            data = request.data
            
            # Update user fields
            if 'company_name' in data:
                user.company_name = data['company_name']
            if 'registered_address' in data:
                user.registered_address = data['registered_address']
            if 'contact_phone' in data:
                user.phone_number = data['contact_phone']
            
            user.save()
            
            # Update tenant if available
            if user.tenant and 'company_name' in data:
                user.tenant.name = data['company_name']
                if 'contact_email' in data:
                    user.tenant.admin_email = data['contact_email']
                user.tenant.save()
            
            return Response({
                'message': 'Company details updated successfully',
                'success': True
            })
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_logo(request):
    """Upload company logo"""
    user = request.user
    
    try:
        if 'logo' not in request.FILES:
            return Response(
                {'error': 'No logo file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logo_file = request.FILES['logo']
        
        # Validate file size (max 2MB)
        if logo_file.size > 2 * 1024 * 1024:
            return Response(
                {'error': 'File size exceeds 2MB limit'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/jpg']
        if logo_file.content_type not in allowed_types:
            return Response(
                {'error': 'Only JPG and PNG files are allowed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Delete old logo if exists
        if user.company_logo:
            try:
                if hasattr(user.company_logo, 'path'):
                    default_storage.delete(user.company_logo.name)
            except Exception:
                pass
        
        # Save new logo
        user.company_logo = logo_file
        user.save()
        
        # Build absolute URL
        logo_url = None
        if user.company_logo and hasattr(user.company_logo, 'url'):
            logo_url = request.build_absolute_uri(user.company_logo.url)
        
        return Response({
            'message': 'Logo uploaded successfully',
            'logo_url': logo_url
        })
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def company_documents(request):
    """Get or upload company documents"""
    user = request.user
    
    if request.method == 'GET':
        # TODO: Implement document retrieval from database
        # For now, return empty list
        return Response([])
    
    elif request.method == 'POST':
        if 'document' not in request.FILES:
            return Response(
                {'error': 'No document file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        doc_file = request.FILES['document']
        doc_name = request.data.get('name', doc_file.name)
        
        # Validate file size (max 10MB)
        if doc_file.size > 10 * 1024 * 1024:
            return Response(
                {'error': 'File size exceeds 10MB limit'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Save file
        file_name = f'company_documents/{user.id}_{doc_file.name}'
        file_path = default_storage.save(file_name, doc_file)
        file_url = default_storage.url(file_path)
        
        # TODO: Store document info in database
        
        return Response({
            'id': 1,  # TODO: Use actual database ID
            'name': doc_name,
            'type': doc_file.content_type,
            'file_url': file_url,
            'uploaded_at': '2025-02-19T00:00:00Z'
        }, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_document(request, doc_id):
    """Delete a company document"""
    # TODO: Implement document deletion from database and storage
    return Response(status=status.HTTP_204_NO_CONTENT)
