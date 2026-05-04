"""
Unit tests for canonical tenant extraction utilities.

Tests all user types and edge cases for tenant identification.
"""
import pytest
from django.contrib.auth import get_user_model
from control_plane.models import Tenant
from authentication.tenant_utils import (
    get_tenant_for_user,
    get_tenant_id_for_filtering,
    require_tenant
)

User = get_user_model()


@pytest.mark.django_db
class TestGetTenantForUser:
    """Test get_tenant_for_user() function."""
    
    def test_superadmin_returns_none_tenant(self):
        """SuperAdmin should return (None, None) for global access."""
        user = User.objects.create(email='super@test.com', user_type='superadmin')
        tenant, error = get_tenant_for_user(user)
        
        assert tenant is None
        assert error is None
    
    def test_masteradmin_with_tenant_returns_tenant(self):
        """MasterAdmin with tenant FK should return tenant object."""
        tenant = Tenant.objects.create(name='Test Tenant', code='test')
        user = User.objects.create(
            email='master@test.com',
            user_type='masteradmin',
            tenant=tenant
        )
        
        result_tenant, error = get_tenant_for_user(user)
        
        assert result_tenant == tenant
        assert error is None
    
    def test_masteradmin_without_tenant_returns_error(self):
        """MasterAdmin without tenant should return error message."""
        user = User.objects.create(email='master2@test.com', user_type='masteradmin')
        
        tenant, error = get_tenant_for_user(user)
        
        assert tenant is None
        assert error == "MasterAdmin not associated with tenant"
    
    def test_companyuser_with_valid_company_id_returns_tenant(self):
        """CompanyUser with valid company_id should return tenant."""
        tenant = Tenant.objects.create(name='Company Tenant', code='company')
        user = User.objects.create(
            email='company@test.com',
            user_type='companyuser',
            company_id=tenant.id
        )
        
        result_tenant, error = get_tenant_for_user(user)
        
        assert result_tenant == tenant
        assert error is None
    
    def test_companyuser_with_invalid_company_id_returns_error(self):
        """CompanyUser with invalid company_id should return error."""
        user = User.objects.create(
            email='company2@test.com',
            user_type='companyuser',
            company_id=99999
        )
        
        tenant, error = get_tenant_for_user(user)
        
        assert tenant is None
        assert "Tenant not found" in error
        assert "99999" in error
    
    def test_companyuser_without_company_id_returns_error(self):
        """CompanyUser without company_id should return error."""
        user = User.objects.create(email='company3@test.com', user_type='companyuser')
        
        tenant, error = get_tenant_for_user(user)
        
        assert tenant is None
        assert error == "CompanyUser not associated with company"
    
    def test_serviceuser_returns_not_supported_error(self):
        """ServiceUser should return 'not supported' error."""
        user = User.objects.create(email='service@test.com', user_type='serviceuser')
        
        tenant, error = get_tenant_for_user(user)
        
        assert tenant is None
        assert error == "ServiceUser does not have tenant scoping"


@pytest.mark.django_db
class TestGetTenantIdForFiltering:
    """Test get_tenant_id_for_filtering() convenience function."""
    
    def test_returns_tenant_id_for_masteradmin(self):
        """Should return tenant.id for MasterAdmin."""
        tenant = Tenant.objects.create(name='Filter Tenant', code='filter')
        user = User.objects.create(
            email='master3@test.com',
            user_type='masteradmin',
            tenant=tenant
        )
        
        tenant_id = get_tenant_id_for_filtering(user)
        
        assert tenant_id == tenant.id
    
    def test_returns_none_for_superadmin(self):
        """SuperAdmin should return None (no filtering)."""
        user = User.objects.create(email='super2@test.com', user_type='superadmin')
        
        tenant_id = get_tenant_id_for_filtering(user)
        
        assert tenant_id is None
    
    def test_returns_none_for_masteradmin_without_tenant(self):
        """MasterAdmin without tenant should return None."""
        user = User.objects.create(email='master4@test.com', user_type='masteradmin')
        
        tenant_id = get_tenant_id_for_filtering(user)
        
        assert tenant_id is None
    
    def test_returns_tenant_id_for_companyuser(self):
        """Should return tenant.id for CompanyUser."""
        tenant = Tenant.objects.create(name='Company Tenant 2', code='company2')
        user = User.objects.create(
            email='company4@test.com',
            user_type='companyuser',
            company_id=tenant.id
        )
        
        tenant_id = get_tenant_id_for_filtering(user)
        
        assert tenant_id == tenant.id


@pytest.mark.django_db
class TestRequireTenant:
    """Test require_tenant() function."""
    
    def test_returns_tenant_for_masteradmin(self):
        """Should return tenant for MasterAdmin."""
        tenant = Tenant.objects.create(name='Required Tenant', code='required')
        user = User.objects.create(
            email='master5@test.com',
            user_type='masteradmin',
            tenant=tenant
        )
        
        result_tenant, error_response = require_tenant(user)
        
        assert result_tenant == tenant
        assert error_response is None
    
    def test_returns_error_dict_for_masteradmin_without_tenant(self):
        """Should return error dict for MasterAdmin without tenant."""
        user = User.objects.create(email='master6@test.com', user_type='masteradmin')
        
        tenant, error_response = require_tenant(user)
        
        assert tenant is None
        assert error_response == {'error': 'MasterAdmin not associated with tenant'}
    
    def test_returns_error_dict_for_superadmin(self):
        """SuperAdmin should return error (tenant required but none exists)."""
        user = User.objects.create(email='super3@test.com', user_type='superadmin')
        
        tenant, error_response = require_tenant(user)
        
        assert tenant is None
        assert error_response == {'error': 'Tenant required for this operation'}
    
    def test_returns_tenant_for_companyuser(self):
        """Should return tenant for CompanyUser."""
        tenant = Tenant.objects.create(name='Company Tenant 3', code='company3')
        user = User.objects.create(
            email='company5@test.com',
            user_type='companyuser',
            company_id=tenant.id
        )
        
        result_tenant, error_response = require_tenant(user)
        
        assert result_tenant == tenant
        assert error_response is None
