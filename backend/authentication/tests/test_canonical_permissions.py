"""
Unit tests for canonical permission classes.

Tests use mock objects to avoid database dependencies.
"""
import pytest
from unittest.mock import Mock, MagicMock
from authentication.permissions import (
    IsSuperAdmin,
    IsMasterAdmin,
    IsCompanyUser,
    IsServiceUser,
    IsSuperAdminOrMasterAdmin,
    HasTenant,
    TenantScopedPermissionMixin,
    get_user_tenant_id,
    is_same_tenant,
    check_tenant_access,
)
from authentication.models import UserType


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def mock_superadmin():
    user = Mock()
    user.is_authenticated = True
    user.user_type = UserType.SUPERADMIN
    user.tenant = None
    user.company_id = None
    return user


@pytest.fixture
def mock_masteradmin():
    user = Mock()
    user.is_authenticated = True
    user.user_type = UserType.MASTERADMIN
    tenant = Mock()
    tenant.id = 1
    user.tenant = tenant
    user.company_id = None
    return user


@pytest.fixture
def mock_companyuser():
    user = Mock()
    user.is_authenticated = True
    user.user_type = UserType.COMPANYUSER
    user.tenant = None
    user.company_id = 1
    return user


@pytest.fixture
def mock_serviceuser():
    user = Mock()
    user.is_authenticated = True
    user.user_type = UserType.SERVICEUSER
    user.tenant = None
    user.company_id = None
    return user


@pytest.fixture
def mock_request():
    request = Mock()
    return request


@pytest.fixture
def mock_view():
    return Mock()


# ============================================================================
# PERMISSION CLASS TESTS
# ============================================================================

class TestIsSuperAdmin:
    def test_allows_superadmin(self, mock_superadmin, mock_request, mock_view):
        mock_request.user = mock_superadmin
        permission = IsSuperAdmin()
        assert permission.has_permission(mock_request, mock_view) is True
    
    def test_denies_masteradmin(self, mock_masteradmin, mock_request, mock_view):
        mock_request.user = mock_masteradmin
        permission = IsSuperAdmin()
        assert permission.has_permission(mock_request, mock_view) is False
    
    def test_denies_unauthenticated(self, mock_request, mock_view):
        mock_request.user = Mock(is_authenticated=False)
        permission = IsSuperAdmin()
        assert permission.has_permission(mock_request, mock_view) is False


class TestIsMasterAdmin:
    def test_allows_masteradmin(self, mock_masteradmin, mock_request, mock_view):
        mock_request.user = mock_masteradmin
        permission = IsMasterAdmin()
        assert permission.has_permission(mock_request, mock_view) is True
    
    def test_denies_superadmin(self, mock_superadmin, mock_request, mock_view):
        mock_request.user = mock_superadmin
        permission = IsMasterAdmin()
        assert permission.has_permission(mock_request, mock_view) is False


class TestIsCompanyUser:
    def test_allows_companyuser(self, mock_companyuser, mock_request, mock_view):
        mock_request.user = mock_companyuser
        permission = IsCompanyUser()
        assert permission.has_permission(mock_request, mock_view) is True
    
    def test_denies_masteradmin(self, mock_masteradmin, mock_request, mock_view):
        mock_request.user = mock_masteradmin
        permission = IsCompanyUser()
        assert permission.has_permission(mock_request, mock_view) is False


class TestIsServiceUser:
    def test_allows_serviceuser(self, mock_serviceuser, mock_request, mock_view):
        mock_request.user = mock_serviceuser
        permission = IsServiceUser()
        assert permission.has_permission(mock_request, mock_view) is True
    
    def test_denies_companyuser(self, mock_companyuser, mock_request, mock_view):
        mock_request.user = mock_companyuser
        permission = IsServiceUser()
        assert permission.has_permission(mock_request, mock_view) is False


class TestIsSuperAdminOrMasterAdmin:
    def test_allows_superadmin(self, mock_superadmin, mock_request, mock_view):
        mock_request.user = mock_superadmin
        permission = IsSuperAdminOrMasterAdmin()
        assert permission.has_permission(mock_request, mock_view) is True
    
    def test_allows_masteradmin(self, mock_masteradmin, mock_request, mock_view):
        mock_request.user = mock_masteradmin
        permission = IsSuperAdminOrMasterAdmin()
        assert permission.has_permission(mock_request, mock_view) is True
    
    def test_denies_companyuser(self, mock_companyuser, mock_request, mock_view):
        mock_request.user = mock_companyuser
        permission = IsSuperAdminOrMasterAdmin()
        assert permission.has_permission(mock_request, mock_view) is False


class TestHasTenant:
    def test_allows_masteradmin_with_tenant(self, mock_masteradmin, mock_request, mock_view, monkeypatch):
        mock_request.user = mock_masteradmin
        
        # Mock require_tenant to return tenant
        tenant = Mock()
        tenant.id = 1
        monkeypatch.setattr('authentication.permissions.require_tenant', lambda user: (tenant, None))
        
        permission = HasTenant()
        assert permission.has_permission(mock_request, mock_view) is True
    
    def test_denies_superadmin(self, mock_superadmin, mock_request, mock_view, monkeypatch):
        mock_request.user = mock_superadmin
        
        # Mock require_tenant to return error for SuperAdmin
        monkeypatch.setattr('authentication.permissions.require_tenant', lambda user: (None, {'error': 'No tenant'}))
        
        permission = HasTenant()
        assert permission.has_permission(mock_request, mock_view) is False


class TestTenantScopedPermissionMixin:
    def test_allows_superadmin_any_object(self, mock_superadmin, mock_request, mock_view, monkeypatch):
        mock_request.user = mock_superadmin
        obj = Mock(athens_tenant_id=1)
        
        # Mock get_tenant_id_for_filtering
        monkeypatch.setattr('authentication.permissions.get_tenant_id_for_filtering', lambda user: None)
        
        class TestPermission(TenantScopedPermissionMixin):
            pass
        
        permission = TestPermission()
        assert permission.has_object_permission(mock_request, mock_view, obj) is True
    
    def test_allows_same_tenant(self, mock_masteradmin, mock_request, mock_view, monkeypatch):
        mock_request.user = mock_masteradmin
        obj = Mock(athens_tenant_id=1)
        
        # Mock get_tenant_id_for_filtering to return same tenant
        monkeypatch.setattr('authentication.permissions.get_tenant_id_for_filtering', lambda user: 1)
        
        class TestPermission(TenantScopedPermissionMixin):
            pass
        
        permission = TestPermission()
        assert permission.has_object_permission(mock_request, mock_view, obj) is True
    
    def test_denies_different_tenant(self, mock_masteradmin, mock_request, mock_view, monkeypatch):
        mock_request.user = mock_masteradmin
        obj = Mock(athens_tenant_id=2)
        
        # Mock get_tenant_id_for_filtering to return different tenant
        monkeypatch.setattr('authentication.permissions.get_tenant_id_for_filtering', lambda user: 1)
        
        class TestPermission(TenantScopedPermissionMixin):
            pass
        
        permission = TestPermission()
        assert permission.has_object_permission(mock_request, mock_view, obj) is False


# ============================================================================
# HELPER FUNCTION TESTS
# ============================================================================

class TestGetUserTenantId:
    def test_returns_none_for_superadmin(self, mock_superadmin, monkeypatch):
        monkeypatch.setattr('authentication.permissions.get_tenant_id_for_filtering', lambda user: None)
        assert get_user_tenant_id(mock_superadmin) is None
    
    def test_returns_tenant_id_for_masteradmin(self, mock_masteradmin, monkeypatch):
        monkeypatch.setattr('authentication.permissions.get_tenant_id_for_filtering', lambda user: 1)
        assert get_user_tenant_id(mock_masteradmin) == 1


class TestIsSameTenant:
    def test_superadmin_always_true(self, mock_superadmin, monkeypatch):
        monkeypatch.setattr('authentication.permissions.get_tenant_id_for_filtering', lambda user: None)
        assert is_same_tenant(mock_superadmin, 1) is True
        assert is_same_tenant(mock_superadmin, 999) is True
    
    def test_same_tenant_returns_true(self, mock_masteradmin, monkeypatch):
        monkeypatch.setattr('authentication.permissions.get_tenant_id_for_filtering', lambda user: 1)
        assert is_same_tenant(mock_masteradmin, 1) is True
    
    def test_different_tenant_returns_false(self, mock_masteradmin, monkeypatch):
        monkeypatch.setattr('authentication.permissions.get_tenant_id_for_filtering', lambda user: 1)
        assert is_same_tenant(mock_masteradmin, 2) is False


class TestCheckTenantAccess:
    def test_superadmin_can_access_any(self, mock_superadmin, monkeypatch):
        monkeypatch.setattr('authentication.permissions.get_tenant_id_for_filtering', lambda user: None)
        obj = Mock(athens_tenant_id=1)
        assert check_tenant_access(mock_superadmin, obj) is True
    
    def test_same_tenant_can_access(self, mock_masteradmin, monkeypatch):
        monkeypatch.setattr('authentication.permissions.get_tenant_id_for_filtering', lambda user: 1)
        obj = Mock(athens_tenant_id=1)
        assert check_tenant_access(mock_masteradmin, obj) is True
    
    def test_different_tenant_cannot_access(self, mock_masteradmin, monkeypatch):
        monkeypatch.setattr('authentication.permissions.get_tenant_id_for_filtering', lambda user: 1)
        obj = Mock(athens_tenant_id=2)
        assert check_tenant_access(mock_masteradmin, obj) is False
    
    def test_object_without_tenant_field_allows_access(self, mock_masteradmin, monkeypatch):
        monkeypatch.setattr('authentication.permissions.get_tenant_id_for_filtering', lambda user: 1)
        obj = Mock(spec=[])  # No tenant fields
        assert check_tenant_access(mock_masteradmin, obj) is True
