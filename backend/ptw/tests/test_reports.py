"""
Tests for PTW reporting endpoints (PR16)
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from authentication.models import Project
from ptw.models import Permit, PermitType
from datetime import timedelta
from django.utils import timezone

User = get_user_model()


class ReportingTestCase(TestCase):
    """Test reporting endpoints"""
    
    def setUp(self):
        self.project = Project.objects.create(name='Test Project', code='TEST')
        self.user = User.objects.create_user(
            username='testuser',
            password='pass123',
            project=self.project
        )
        
        self.permit_type = PermitType.objects.create(
            name='Hot Work',
            category='hot_work',
            risk_level='high'
        )
        
        # Create permits with various statuses
        now = timezone.now()
        
        # Overdue verification
        Permit.objects.create(
            permit_number='PTW-001',
            title='Overdue Verification',
            location='Location 1',
            permit_type=self.permit_type,
            project=self.project,
            created_by=self.user,
            status='submitted',
            created_at=now - timedelta(hours=30),
            planned_start_time=now,
            planned_end_time=now + timedelta(days=1)
        )
        
        # Overdue approval
        Permit.objects.create(
            permit_number='PTW-002',
            title='Overdue Approval',
            location='Location 2',
            permit_type=self.permit_type,
            project=self.project,
            created_by=self.user,
            status='under_review',
            created_at=now - timedelta(hours=50),
            planned_start_time=now,
            planned_end_time=now + timedelta(days=1)
        )
        
        # Active permit
        Permit.objects.create(
            permit_number='PTW-003',
            title='Active Permit',
            location='Location 3',
            permit_type=self.permit_type,
            project=self.project,
            created_by=self.user,
            status='active',
            planned_start_time=now,
            planned_end_time=now + timedelta(hours=12)  # Expiring soon
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
    
    def test_reports_summary_endpoint_exists(self):
        """Test summary endpoint is accessible"""
        response = self.client.get('/api/v1/ptw/permits/reports_summary/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('range', response.data)
        self.assertIn('counts_by_status', response.data)
        self.assertIn('overdue', response.data)
    
    def test_reports_summary_structure(self):
        """Test summary response structure"""
        response = self.client.get('/api/v1/ptw/permits/reports_summary/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check required keys
        required_keys = [
            'range', 'counts_by_status', 'overdue', 'expiring_soon',
            'isolation_pending', 'closeout_pending', 'incident_rate', 'top_permit_types'
        ]
        for key in required_keys:
            self.assertIn(key, response.data)
        
        # Check overdue structure
        self.assertIn('verification', response.data['overdue'])
        self.assertIn('approval', response.data['overdue'])
    
    def test_reports_summary_counts_overdue(self):
        """Test summary counts overdue permits correctly"""
        response = self.client.get('/api/v1/ptw/permits/reports_summary/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['overdue']['verification'], 1)
        self.assertEqual(response.data['overdue']['approval'], 1)
    
    def test_reports_summary_date_range(self):
        """Test summary respects date range"""
        now = timezone.now()
        date_from = (now - timedelta(days=2)).date().isoformat()
        date_to = now.date().isoformat()
        
        response = self.client.get(
            f'/api/v1/ptw/permits/reports_summary/?date_from={date_from}&date_to={date_to}'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('range', response.data)
    
    def test_reports_exceptions_endpoint_exists(self):
        """Test exceptions endpoint is accessible"""
        response = self.client.get('/api/v1/ptw/permits/reports_exceptions/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('overdue_verification', response.data)
        self.assertIn('overdue_approval', response.data)
    
    def test_reports_exceptions_structure(self):
        """Test exceptions response structure"""
        response = self.client.get('/api/v1/ptw/permits/reports_exceptions/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check required keys
        required_keys = [
            'overdue_verification', 'overdue_approval', 'isolation_pending',
            'closeout_pending', 'expiring_soon'
        ]
        for key in required_keys:
            self.assertIn(key, response.data)
            self.assertIsInstance(response.data[key], list)
    
    def test_reports_exceptions_contains_permits(self):
        """Test exceptions lists contain expected permits"""
        response = self.client.get('/api/v1/ptw/permits/reports_exceptions/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should have overdue verification
        self.assertGreaterEqual(len(response.data['overdue_verification']), 1)
        
        # Should have overdue approval
        self.assertGreaterEqual(len(response.data['overdue_approval']), 1)
        
        # Check permit structure
        if response.data['overdue_verification']:
            permit = response.data['overdue_verification'][0]
            self.assertIn('id', permit)
            self.assertIn('permit_number', permit)
            self.assertIn('age_hours', permit)
            self.assertIn('status', permit)
    
    def test_reports_project_scoping(self):
        """Test reports respect project scoping"""
        # Create another project and user
        other_project = Project.objects.create(name='Other Project', code='OTHER')
        other_user = User.objects.create_user(
            username='otheruser',
            password='pass123',
            project=other_project
        )
        
        # Create permit in other project
        Permit.objects.create(
            permit_number='PTW-OTHER-001',
            title='Other Project Permit',
            location='Other Location',
            permit_type=self.permit_type,
            project=other_project,
            created_by=other_user,
            status='submitted',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timedelta(days=1)
        )
        
        # User should only see their project's permits
        response = self.client.get('/api/v1/ptw/permits/reports_summary/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should not include other project's permits
        total_count = sum(response.data['counts_by_status'].values())
        self.assertEqual(total_count, 3)  # Only this project's 3 permits
