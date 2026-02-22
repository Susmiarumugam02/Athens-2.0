"""
Unit tests for RBAC permission classes (no database required)
"""
import pytest
from unittest.mock import Mock, MagicMock
from authentication.rbac_permissions import (
    IsSuperAdmin, IsMasterAdmin, IsProjectAdmin, IsAdminUser,
    RequireTenantContext, RequireTenantPermission
)


class TestRBACPermissionClasses:
    """Test RBAC permission class logic"""
    
    def test_is_superadmin_allows_superadmin(self):
        """Test IsSuperAdmin allows superadmin users"""
        permission = IsSuperAdmin()
        request = Mock()
        request.user = Mock(is_authenticated=True, user_type='superadmin')
        view = Mock()
        
        assert permission.has_permission(request, view) is True
    
    def test_is_superadmin_denies_masteradmin(self):
        """Test IsSuperAdmin denies non-superadmin users"""
        permission = IsSuperAdmin()
        request = Mock()
        request.user = Mock(is_authenticated=True, user_type='masteradmin')
        view = Mock()
        
        assert permission.has_permission(request, view) is False
    
    def test_is_superadmin_denies_unauthenticated(self):
        """Test IsSuperAdmin denies unauthenticated users"""
        permission = IsSuperAdmin()
        request = Mock()
        request.user = Mock(is_authenticated=False)
        view = Mock()
        
        assert permission.has_permission(request, view) is False
    
    def test_is_masteradmin_allows_masteradmin(self):
        """Test IsMasterAdmin allows masteradmin users"""
        permission = IsMasterAdmin()
        request = Mock()
        request.user = Mock(is_authenticated=True, user_type='masteradmin')
        view = Mock()
        
        assert permission.has_permission(request, view) is True
    
    def test_is_masteradmin_denies_companyuser(self):
        """Test IsMasterAdmin denies non-masteradmin users"""
        permission = IsMasterAdmin()
        request = Mock()
        request.user = Mock(is_authenticated=True, user_type='companyuser')
        view = Mock()
        
        assert permission.has_permission(request, view) is False
    
    def test_is_projectadmin_allows_projectadmin(self):
        """Test IsProjectAdmin allows projectadmin users"""
        permission = IsProjectAdmin()
        request = Mock()
        request.user = Mock(is_authenticated=True, user_type='projectadmin')
        view = Mock()
        
        assert permission.has_permission(request, view) is True
    
    def test_is_adminuser_allows_adminuser(self):
        """Test IsAdminUser allows adminuser users"""
        permission = IsAdminUser()
        request = Mock()
        request.user = Mock(is_authenticated=True, user_type='adminuser')
        view = Mock()
        
        assert permission.has_permission(request, view) is True
    
    def test_require_tenant_context_bypasses_for_superadmin(self):
        """Test RequireTenantContext bypasses check for superadmin"""
        permission = RequireTenantContext()
        request = Mock()
        request.user = Mock(is_authenticated=True, user_type='superadmin')
        view = Mock()
        
        assert permission.has_permission(request, view) is True
    
    def test_require_tenant_context_denies_unauthenticated(self):
        """Test RequireTenantContext denies unauthenticated users"""
        permission = RequireTenantContext()
        request = Mock()
        request.user = None
        view = Mock()
        
        assert permission.has_permission(request, view) is False
    
    def test_require_tenant_permission_allows_superadmin(self):
        """Test RequireTenantPermission allows superadmin"""
        permission = RequireTenantPermission()
        request = Mock()
        request.user = Mock(is_authenticated=True, user_type='superadmin')
        view = Mock()
        
        assert permission.has_permission(request, view) is True
    
    def test_require_tenant_permission_denies_unauthenticated(self):
        """Test RequireTenantPermission denies unauthenticated users"""
        permission = RequireTenantPermission()
        request = Mock()
        request.user = None
        view = Mock()
        
        assert permission.has_permission(request, view) is False
