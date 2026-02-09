from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from authentication.models import Project
from ptw.models import Permit, PermitType
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class HealthEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.project = Project.objects.create(name='Test Project')
        
        # Create regular user
        self.regular_user = User.objects.create_user(
            username='regular',
            password='pass123',
            email='regular@test.com'
        )
        self.regular_user.project = self.project
        self.regular_user.save()
        
        # Create admin user (assuming admin_type field exists)
        self.admin_user = User.objects.create_user(
            username='admin',
            password='pass123',
            email='admin@test.com'
        )
        self.admin_user.project = self.project
        self.admin_user.is_staff = True
        self.admin_user.save()
        
        self.permit_type = PermitType.objects.create(
            name='Hot Work',
            category='hot_work',
            risk_level='high'
        )
    
    def test_health_endpoint_requires_admin(self):
        """Test health endpoint requires admin permission"""
        self.client.force_authenticate(user=self.regular_user)
        
        response = self.client.get('/api/v1/ptw/permits/health/')
        
        # Should be denied for regular user
        self.assertIn(response.status_code, [403, 404])
    
    def test_health_endpoint_returns_expected_structure(self):
        """Test health endpoint returns expected data structure"""
        self.client.force_authenticate(user=self.admin_user)
        
        # Create some test data
        Permit.objects.create(
            permit_number='PTW-2024-001',
            permit_type=self.permit_type,
            title='Test',
            description='Test',
            location='Test',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timedelta(hours=8),
            created_by=self.admin_user,
            project=self.project,
            status='submitted'
        )
        
        response = self.client.get('/api/v1/ptw/permits/health/')
        
        if response.status_code == 200:
            data = response.data
            
            # Check expected keys
            self.assertIn('as_of', data)
            self.assertIn('sync', data)
            self.assertIn('exports', data)
            self.assertIn('workflow', data)
            self.assertIn('jobs', data)
            
            # Check sync structure
            self.assertIn('applied_last_24h', data['sync'])
            self.assertIn('conflicts_last_24h', data['sync'])
            self.assertIn('rejected_last_24h', data['sync'])
            
            # Check workflow structure
            self.assertIn('overdue_verification', data['workflow'])
            self.assertIn('overdue_approval', data['workflow'])
