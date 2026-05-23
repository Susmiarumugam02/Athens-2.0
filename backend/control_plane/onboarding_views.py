"""
Company onboarding + approval workflow API
POST   /api/company-profile/submit/     → MasterAdmin submits profile
GET    /api/company-profile/me/         → MasterAdmin checks own status
GET    /api/company-profile/pending/    → SuperAdmin lists pending tenants
POST   /api/company-profile/{id}/approve/
POST   /api/company-profile/{id}/reject/
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

from authentication.models import User
from control_plane.models import Tenant
from authentication.permissions import IsSuperAdmin


def _is_masteradmin(user):
    return getattr(user, 'user_type', None) == 'masteradmin'


def _get_tenant(user):
    """Return the tenant linked to a masteradmin user."""
    return getattr(user, 'tenant', None)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_company_profile(request):
    """MasterAdmin submits company details on first login."""
    if not _is_masteradmin(request.user):
        return Response({'error': 'Only MasterAdmin can submit company profile'},
                        status=status.HTTP_403_FORBIDDEN)

    tenant = _get_tenant(request.user)
    if not tenant:
        return Response({'error': 'No tenant assigned to this account'},
                        status=status.HTTP_400_BAD_REQUEST)

    data = request.data
    required = ['company_name', 'company_email', 'phone', 'address',
                'industry_type', 'company_type', 'contact_name', 'designation']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return Response({'error': f'Missing required fields: {", ".join(missing)}'},
                        status=status.HTTP_400_BAD_REQUEST)

    tenant.name = data['company_name']
    tenant.admin_email = data['company_email']
    tenant.contact_phone = data['phone']
    tenant.address = data['address']
    tenant.industry = data['industry_type']
    tenant.company_type = data['company_type']
    tenant.contact_name = data['contact_name']
    tenant.contact_designation = data['designation']
    tenant.profile_submitted = True
    tenant.approval_status = Tenant.APPROVAL_PENDING
    tenant.save()

    return Response({
        'message': 'Company profile submitted successfully. Awaiting SuperAdmin approval.',
        'approval_status': tenant.approval_status,
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_company_profile(request):
    """MasterAdmin checks their own approval status."""
    if not _is_masteradmin(request.user):
        return Response({'error': 'Only MasterAdmin can access this endpoint'},
                        status=status.HTTP_403_FORBIDDEN)

    tenant = _get_tenant(request.user)
    if not tenant:
        return Response({'profile_submitted': False, 'approval_status': None})

    return Response({
        'profile_submitted': tenant.profile_submitted,
        'approval_status': tenant.approval_status,
        'company_name': tenant.name,
        'company_email': tenant.admin_email,
        'phone': tenant.contact_phone,
        'address': tenant.address,
        'industry_type': tenant.industry,
        'company_type': tenant.company_type,
        'contact_name': tenant.contact_name,
        'designation': tenant.contact_designation,
        'rejection_reason': tenant.rejection_reason,
        'approved_at': tenant.approved_at,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def list_pending_profiles(request):
    """SuperAdmin lists all tenants with their approval status."""
    approval_filter = request.query_params.get('status', 'pending')
    tenants = Tenant.objects.filter(profile_submitted=True)
    if approval_filter != 'all':
        tenants = tenants.filter(approval_status=approval_filter)
    tenants = tenants.order_by('-updated_at')

    data = [{
        'id': t.id,
        'company_name': t.name,
        'company_email': t.admin_email,
        'phone': t.contact_phone,
        'address': t.address,
        'industry_type': t.industry,
        'company_type': t.company_type,
        'contact_name': t.contact_name,
        'designation': t.contact_designation,
        'approval_status': t.approval_status,
        'approved_at': t.approved_at,
        'rejection_reason': t.rejection_reason,
        'created_at': t.created_at,
    } for t in tenants]

    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def approve_company_profile(request, tenant_id):
    """SuperAdmin approves a company profile."""
    try:
        tenant = Tenant.objects.get(id=tenant_id)
    except Tenant.DoesNotExist:
        return Response({'error': 'Tenant not found'}, status=status.HTTP_404_NOT_FOUND)

    tenant.approval_status = Tenant.APPROVAL_APPROVED
    tenant.approved_at = timezone.now()
    tenant.approved_by = request.user
    tenant.rejection_reason = None
    tenant.is_active = True
    tenant.save()

    return Response({'message': f'Company "{tenant.name}" approved successfully.',
                     'approval_status': tenant.approval_status})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def reject_company_profile(request, tenant_id):
    """SuperAdmin rejects a company profile."""
    try:
        tenant = Tenant.objects.get(id=tenant_id)
    except Tenant.DoesNotExist:
        return Response({'error': 'Tenant not found'}, status=status.HTTP_404_NOT_FOUND)

    reason = request.data.get('reason', '')
    tenant.approval_status = Tenant.APPROVAL_REJECTED
    tenant.rejection_reason = reason
    tenant.save()

    return Response({'message': f'Company "{tenant.name}" rejected.',
                     'approval_status': tenant.approval_status})
