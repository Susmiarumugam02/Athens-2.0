import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from authentication.models import User, UserType
from control_plane.models import Tenant


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def superadmin_user(db):
    user = User.objects.create_user(
        email='super@test.com',
        password='testpass123',
        user_type=UserType.SUPERADMIN
    )
    user.is_staff = True
    user.is_superuser = True
    user.save()
    return user


@pytest.fixture
def company_user(db):
    return User.objects.create_user(
        email='company@test.com',
        password='testpass123',
        user_type=UserType.COMPANYUSER,
        company_id=1
    )


@pytest.fixture
def authenticated_superadmin(api_client, superadmin_user):
    """Return API client authenticated as superadmin"""
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(superadmin_user)
    token = str(refresh.access_token)
    
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return api_client


@pytest.fixture
def authenticated_company_user(api_client, company_user):
    """Return API client authenticated as company user"""
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(company_user)
    token = str(refresh.access_token)
    
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return api_client


@pytest.mark.django_db
class TestControlPlane:
    
    def test_superadmin_can_create_tenant(self, authenticated_superadmin):
        """Test superadmin can create tenant"""
        url = '/api/control-plane/tenants/'
        data = {'name': 'Test Tenant', 'code': 'test-tenant'}
        
        response = authenticated_superadmin.post(url, data, format='json')
        
        assert response.status_code == 201
        assert response.data['name'] == 'Test Tenant'
        assert response.data['code'] == 'test-tenant'
    
    def test_non_superadmin_cannot_create_tenant(self, authenticated_company_user):
        """Test non-superadmin gets 403 on control plane endpoints"""
        url = '/api/control-plane/tenants/'
        data = {'name': 'Test Tenant', 'code': 'test-tenant'}
        
        response = authenticated_company_user.post(url, data, format='json')
        
        assert response.status_code == 403
    
    def test_superadmin_can_list_tenants(self, authenticated_superadmin, db):
        """Test superadmin can list tenants"""
        # Create test tenant
        Tenant.objects.create(name='Tenant 1', code='tenant-1')
        Tenant.objects.create(name='Tenant 2', code='tenant-2')
        
        url = '/api/control-plane/tenants/'
        response = authenticated_superadmin.get(url)
        
        assert response.status_code == 200
        assert len(response.data) >= 2
    
    def test_superadmin_can_disable_tenant(self, authenticated_superadmin, db):
        """Test superadmin can disable tenant"""
        tenant = Tenant.objects.create(name='Test Tenant', code='test')
        
        url = f'/api/control-plane/tenants/{tenant.id}/disable/'
        response = authenticated_superadmin.post(url)
        
        assert response.status_code == 200
        tenant.refresh_from_db()
        assert tenant.is_active is False
    
    def test_superadmin_can_view_audit_logs(self, authenticated_superadmin):
        """Test superadmin can view audit logs"""
        url = '/api/control-plane/audit-logs/'
        response = authenticated_superadmin.get(url)
        
        assert response.status_code == 200
        assert isinstance(response.data, list) or 'results' in response.data
