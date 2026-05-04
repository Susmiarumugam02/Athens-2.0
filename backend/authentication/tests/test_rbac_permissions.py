"""
Tests for RBAC permissions
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from authentication.models import User, UserType
from control_plane.models import Tenant


@pytest.mark.django_db
class TestRBACPermissions:
    """Test RBAC permission checks"""
    
    def setup_method(self):
        self.client = APIClient()
        
        # Create tenant
        self.tenant = Tenant.objects.create(
            name="Test Company",
            admin_email="admin@test.com",
            is_active=True
        )
        
        # Create users
        self.superadmin = User.objects.create_user(
            email="super@test.com",
            password="test123",
            user_type=UserType.SUPERADMIN
        )
        
        self.masteradmin = User.objects.create_user(
            email="master@test.com",
            password="test123",
            user_type=UserType.MASTERADMIN,
            tenant=self.tenant
        )
        
        self.companyuser = User.objects.create_user(
            email="user@test.com",
            password="test123",
            user_type=UserType.COMPANYUSER,
            company_id=self.tenant.id
        )
    
    def test_permissions_endpoint_requires_auth(self):
        """Test that permissions endpoint requires authentication"""
        url = reverse('authentication:my-permissions')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_superadmin_has_all_permissions(self):
        """Test that superadmin has wildcard permissions"""
        self.client.force_authenticate(user=self.superadmin)
        url = reverse('authentication:my-permissions')
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['user_type'] == 'superadmin'
        assert data['roles'] == ['SUPERADMIN']
        assert data['permissions'] == ['*']
        assert data['tenant_id'] is None
    
    def test_masteradmin_has_tenant_permissions(self):
        """Test that masteradmin has tenant-scoped permissions"""
        self.client.force_authenticate(user=self.masteradmin)
        url = reverse('authentication:my-permissions')
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['user_type'] == 'masteradmin'
        assert data['roles'] == ['MASTER_ADMIN']
        assert 'tenant.read' in data['permissions']
        assert 'tenant.write' in data['permissions']
        assert str(self.tenant.id) == data['tenant_id']
    
    def test_companyuser_has_limited_permissions(self):
        """Test that company user has limited permissions"""
        self.client.force_authenticate(user=self.companyuser)
        url = reverse('authentication:my-permissions')
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['user_type'] == 'companyuser'
        assert data['roles'] == ['COMPANY_USER']
        assert data['permissions'] == ['project.read']
    
    def test_tenant_context_attached(self):
        """Test that tenant context is properly attached to request"""
        self.client.force_authenticate(user=self.masteradmin)
        url = reverse('authentication:my-permissions')
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['tenant_id'] is not None
        assert data['tenant_id'] == str(self.tenant.id)
