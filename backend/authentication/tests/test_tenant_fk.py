from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from authentication.models import User, UserType
from control_plane.models import Tenant


class TenantFKTestCase(TestCase):
    """Test tenant FK functionality"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create tenant
        self.tenant = Tenant.objects.create(
            name="Test Tenant",
            code="test-tenant",
            admin_email="admin@test.com"
        )
        
        # Create masteradmin with tenant FK
        self.masteradmin = User.objects.create_user(
            email="master@test.com",
            password="testpass123",
            user_type=UserType.MASTERADMIN,
            tenant=self.tenant
        )
        
        # Create masteradmin without tenant
        self.masteradmin_no_tenant = User.objects.create_user(
            email="master_no_tenant@test.com",
            password="testpass123",
            user_type=UserType.MASTERADMIN
        )
    
    def test_my_tenant_with_tenant_assigned(self):
        """Test my-tenant endpoint returns 200 with tenant data"""
        self.client.force_authenticate(user=self.masteradmin)
        response = self.client.get('/api/auth/masteradmin/my-tenant/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.tenant.id)
        self.assertEqual(response.data['name'], self.tenant.name)
        self.assertTrue(response.data['is_active'])
    
    def test_my_tenant_without_tenant_assigned(self):
        """Test my-tenant endpoint returns 200 with null tenant (not 404)"""
        self.client.force_authenticate(user=self.masteradmin_no_tenant)
        response = self.client.get('/api/auth/masteradmin/my-tenant/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['id'])
        self.assertIsNone(response.data['name'])
        self.assertIn('message', response.data)
    
    def test_dashboard_stats_with_tenant(self):
        """Test dashboard stats work with tenant FK"""
        self.client.force_authenticate(user=self.masteradmin)
        response = self.client.get('/api/auth/masteradmin/dashboard/stats/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_projects', response.data)
        self.assertIn('active_projects', response.data)
    
    def test_dashboard_stats_without_tenant(self):
        """Test dashboard stats return empty data without tenant"""
        self.client.force_authenticate(user=self.masteradmin_no_tenant)
        response = self.client.get('/api/auth/masteradmin/dashboard/stats/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_projects'], 0)
        self.assertEqual(response.data['active_projects'], 0)
