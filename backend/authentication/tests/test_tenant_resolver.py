"""
Tests for TenantResolver - int/UUID tenant resolution
"""
import uuid
from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from authentication.tenant_resolver import TenantResolver
from authentication.tenant_models import AthensTenant
from control_plane.models import Tenant as ControlPlaneTenant

User = get_user_model()


class TenantResolverTestCase(TestCase):
    """Test tenant resolution for int and UUID tenant IDs"""
    
    def setUp(self):
        self.factory = RequestFactory()
        
        # Create control plane tenant (int PK)
        self.cp_tenant = ControlPlaneTenant.objects.create(
            id=1,
            company_name="Test Company",
            is_active=True
        )
        
        # Create Athens tenant (UUID PK)
        self.athens_tenant = AthensTenant.objects.create(
            id=uuid.UUID('c46fa62d-f629-4531-a867-96779ccfdc4e'),
            name="Athens Test Tenant",
            is_active=True
        )
        
        # Create inactive tenant
        self.inactive_tenant = ControlPlaneTenant.objects.create(
            id=999,
            company_name="Inactive Company",
            is_active=False
        )
    
    def test_validate_tenant_int(self):
        """Test validation with integer tenant ID"""
        tenant = TenantResolver.validate_tenant(1)
        self.assertIsNotNone(tenant)
        self.assertEqual(tenant.id, 1)
        self.assertIsInstance(tenant, ControlPlaneTenant)
    
    def test_validate_tenant_int_string(self):
        """Test validation with string integer tenant ID"""
        tenant = TenantResolver.validate_tenant("1")
        self.assertIsNotNone(tenant)
        self.assertEqual(tenant.id, 1)
    
    def test_validate_tenant_uuid_string(self):
        """Test validation with UUID string tenant ID"""
        tenant = TenantResolver.validate_tenant("c46fa62d-f629-4531-a867-96779ccfdc4e")
        self.assertIsNotNone(tenant)
        self.assertEqual(str(tenant.id), "c46fa62d-f629-4531-a867-96779ccfdc4e")
        self.assertIsInstance(tenant, AthensTenant)
    
    def test_validate_tenant_uuid_object(self):
        """Test validation with UUID object tenant ID"""
        tenant_uuid = uuid.UUID('c46fa62d-f629-4531-a867-96779ccfdc4e')
        tenant = TenantResolver.validate_tenant(tenant_uuid)
        self.assertIsNotNone(tenant)
        self.assertEqual(tenant.id, tenant_uuid)
    
    def test_validate_tenant_invalid_returns_none(self):
        """Test validation with invalid tenant ID returns None"""
        tenant = TenantResolver.validate_tenant(99999)
        self.assertIsNone(tenant)
    
    def test_validate_tenant_inactive_returns_none(self):
        """Test validation with inactive tenant returns None"""
        tenant = TenantResolver.validate_tenant(999)
        self.assertIsNone(tenant)
    
    def test_validate_tenant_none_returns_none(self):
        """Test validation with None returns None"""
        tenant = TenantResolver.validate_tenant(None)
        self.assertIsNone(tenant)
    
    def test_validate_tenant_empty_string_returns_none(self):
        """Test validation with empty string returns None"""
        tenant = TenantResolver.validate_tenant("")
        self.assertIsNone(tenant)
    
    def test_validate_tenant_invalid_format_returns_none(self):
        """Test validation with invalid format returns None"""
        tenant = TenantResolver.validate_tenant("invalid-format")
        self.assertIsNone(tenant)
    
    def test_extract_tenant_id_from_user(self):
        """Test tenant ID extraction from authenticated user"""
        user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            athens_tenant_id=1
        )
        
        request = self.factory.get('/')
        request.user = user
        
        tenant_id = TenantResolver.extract_tenant_id(request)
        self.assertEqual(tenant_id, 1)
    
    def test_resolve_tenant_complete_flow(self):
        """Test complete tenant resolution flow"""
        user = User.objects.create_user(
            username='testuser2',
            password='testpass123',
            athens_tenant_id=1
        )
        
        request = self.factory.get('/')
        request.user = user
        
        tenant = TenantResolver.resolve_tenant(request)
        self.assertIsNotNone(tenant)
        self.assertEqual(tenant.id, 1)
    
    def test_attach_tenant_context(self):
        """Test tenant context attachment to request"""
        request = self.factory.get('/')
        
        TenantResolver.attach_tenant_context(request, self.cp_tenant)
        
        self.assertEqual(request.athens_tenant_id, 1)
        self.assertEqual(request.athens_tenant, self.cp_tenant)
        self.assertEqual(request.tenant, self.cp_tenant)
