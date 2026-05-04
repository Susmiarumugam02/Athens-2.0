"""
Tests for PTW KPI Dashboard
"""
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status

from ptw.models import (
    Permit, PermitType, PermitIsolationPoint, IsolationPointLibrary,
    PermitCloseout, CloseoutChecklistTemplate
)
from authentication.models import Project

User = get_user_model()


class KPIEndpointTestCase(TestCase):
    def setUp(self):
        """Set up test data"""
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            name='Test',
            surname='User',
            admin_type='client'
        )
        
        # Create project
        self.project = Project.objects.create(
            name='Test Project',
            location='Test Location'
        )
        
        # Create permit type
        self.permit_type = PermitType.objects.create(
            name='Hot Work',
            category='hot_work',
            risk_level='high',
            requires_structured_isolation=True
        )
        
        # Create closeout template
        self.closeout_template = CloseoutChecklistTemplate.objects.create(
            permit_type=self.permit_type,
            name='Hot Work Closeout',
            items=[
                {'key': 'tools_removed', 'label': 'All tools removed', 'required': True},
                {'key': 'area_cleaned', 'label': 'Area cleaned', 'required': True},
            ]
        )
        
        # Setup API client
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        self.now = timezone.now()
    
    def test_kpi_endpoint_basic_counts(self):
        """Test basic status counts"""
        # Create permits in different statuses
        Permit.objects.create(
            permit_number='PTW-001',
            permit_type=self.permit_type,
            description='Draft permit',
            location='Area A',
            planned_start_time=self.now,
            planned_end_time=self.now + timedelta(hours=8),
            created_by=self.user,
            project=self.project,
            status='draft'
        )
        
        Permit.objects.create(
            permit_number='PTW-002',
            permit_type=self.permit_type,
            description='Pending verification',
            location='Area B',
            planned_start_time=self.now,
            planned_end_time=self.now + timedelta(hours=8),
            created_by=self.user,
            project=self.project,
            status='submitted',
            submitted_at=self.now - timedelta(hours=2)
        )
        
        Permit.objects.create(
            permit_number='PTW-003',
            permit_type=self.permit_type,
            description='Active permit',
            location='Area C',
            planned_start_time=self.now,
            planned_end_time=self.now + timedelta(hours=8),
            created_by=self.user,
            project=self.project,
            status='active'
        )
        
        response = self.client.get('/api/v1/ptw/permits/kpis/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        self.assertIn('counts', data)
        self.assertEqual(data['counts']['draft'], 1)
        self.assertEqual(data['counts']['pending_verification'], 1)
        self.assertEqual(data['counts']['active'], 1)
        self.assertEqual(data['counts']['total_open'], 3)
    
    def test_overdue_verification(self):
        """Test overdue verification detection"""
        # Create overdue verification permit (submitted 5 hours ago, SLA is 4 hours)
        Permit.objects.create(
            permit_number='PTW-OVERDUE-1',
            permit_type=self.permit_type,
            description='Overdue verification',
            location='Area A',
            planned_start_time=self.now,
            planned_end_time=self.now + timedelta(hours=8),
            created_by=self.user,
            project=self.project,
            status='submitted',
            submitted_at=self.now - timedelta(hours=5)
        )
        
        # Create non-overdue verification permit
        Permit.objects.create(
            permit_number='PTW-OK-1',
            permit_type=self.permit_type,
            description='On-time verification',
            location='Area B',
            planned_start_time=self.now,
            planned_end_time=self.now + timedelta(hours=8),
            created_by=self.user,
            project=self.project,
            status='submitted',
            submitted_at=self.now - timedelta(hours=2)
        )
        
        response = self.client.get('/api/v1/ptw/permits/kpis/')
        data = response.json()
        
        self.assertEqual(data['overdue']['pending_verification'], 1)
    
    def test_overdue_approval(self):
        """Test overdue approval detection"""
        # Create overdue approval permit
        Permit.objects.create(
            permit_number='PTW-OVERDUE-2',
            permit_type=self.permit_type,
            description='Overdue approval',
            location='Area A',
            planned_start_time=self.now,
            planned_end_time=self.now + timedelta(hours=8),
            created_by=self.user,
            project=self.project,
            status='under_review',
            verified_at=self.now - timedelta(hours=6)
        )
        
        response = self.client.get('/api/v1/ptw/permits/kpis/')
        data = response.json()
        
        self.assertEqual(data['overdue']['pending_approval'], 1)
    
    def test_expiring_soon(self):
        """Test expiring soon detection"""
        # Create permit expiring in 2 hours (threshold is 4 hours)
        Permit.objects.create(
            permit_number='PTW-EXPIRING-1',
            permit_type=self.permit_type,
            description='Expiring soon',
            location='Area A',
            planned_start_time=self.now - timedelta(hours=6),
            planned_end_time=self.now + timedelta(hours=2),
            created_by=self.user,
            project=self.project,
            status='active'
        )
        
        # Create permit not expiring soon
        Permit.objects.create(
            permit_number='PTW-OK-2',
            permit_type=self.permit_type,
            description='Not expiring soon',
            location='Area B',
            planned_start_time=self.now,
            planned_end_time=self.now + timedelta(hours=10),
            created_by=self.user,
            project=self.project,
            status='active'
        )
        
        response = self.client.get('/api/v1/ptw/permits/kpis/')
        data = response.json()
        
        self.assertEqual(data['overdue']['expiring_soon'], 1)
        self.assertEqual(len(data['lists']['expiring_soon']), 1)
        self.assertEqual(data['lists']['expiring_soon'][0]['permit_number'], 'PTW-EXPIRING-1')
    
    def test_isolation_pending(self):
        """Test isolation pending detection"""
        # Create permit with pending isolation
        permit = Permit.objects.create(
            permit_number='PTW-ISO-1',
            permit_type=self.permit_type,
            description='Isolation pending',
            location='Area A',
            planned_start_time=self.now,
            planned_end_time=self.now + timedelta(hours=8),
            created_by=self.user,
            project=self.project,
            status='under_review'
        )
        
        # Create isolation point library
        iso_point = IsolationPointLibrary.objects.create(
            project=self.project,
            point_code='ISO-001',
            point_type='valve',
            energy_type='electrical',
            location='Panel A'
        )
        
        # Assign isolation point (not verified)
        PermitIsolationPoint.objects.create(
            permit=permit,
            point=iso_point,
            status='assigned',
            required=True
        )
        
        response = self.client.get('/api/v1/ptw/permits/kpis/')
        data = response.json()
        
        self.assertEqual(data['overdue']['isolation_pending'], 1)
    
    def test_closeout_pending(self):
        """Test closeout pending detection"""
        # Create active permit with incomplete closeout
        permit = Permit.objects.create(
            permit_number='PTW-CLOSE-1',
            permit_type=self.permit_type,
            description='Closeout pending',
            location='Area A',
            planned_start_time=self.now - timedelta(hours=4),
            planned_end_time=self.now + timedelta(hours=4),
            created_by=self.user,
            project=self.project,
            status='active'
        )
        
        # Create incomplete closeout
        PermitCloseout.objects.create(
            permit=permit,
            template=self.closeout_template,
            completed=False
        )
        
        response = self.client.get('/api/v1/ptw/permits/kpis/')
        data = response.json()
        
        self.assertEqual(data['overdue']['closeout_pending'], 1)
    
    def test_top_overdue_list(self):
        """Test top overdue permits list"""
        # Create multiple overdue permits
        for i in range(3):
            Permit.objects.create(
                permit_number=f'PTW-OVERDUE-{i}',
                permit_type=self.permit_type,
                description=f'Overdue permit {i}',
                location='Area A',
                planned_start_time=self.now,
                planned_end_time=self.now + timedelta(hours=8),
                created_by=self.user,
                project=self.project,
                status='submitted',
                submitted_at=self.now - timedelta(hours=5 + i)
            )
        
        response = self.client.get('/api/v1/ptw/permits/kpis/')
        data = response.json()
        
        self.assertIn('top_overdue', data['lists'])
        self.assertEqual(len(data['lists']['top_overdue']), 3)
        
        # Check ordering (most overdue first)
        self.assertTrue(
            data['lists']['top_overdue'][0]['age_hours'] >= 
            data['lists']['top_overdue'][1]['age_hours']
        )
    
    def test_project_filter(self):
        """Test project filtering"""
        # Create another project
        other_project = Project.objects.create(
            name='Other Project',
            location='Other Location'
        )
        
        # Create permits in different projects
        Permit.objects.create(
            permit_number='PTW-PROJ-1',
            permit_type=self.permit_type,
            description='Project 1 permit',
            location='Area A',
            planned_start_time=self.now,
            planned_end_time=self.now + timedelta(hours=8),
            created_by=self.user,
            project=self.project,
            status='active'
        )
        
        Permit.objects.create(
            permit_number='PTW-PROJ-2',
            permit_type=self.permit_type,
            description='Project 2 permit',
            location='Area B',
            planned_start_time=self.now,
            planned_end_time=self.now + timedelta(hours=8),
            created_by=self.user,
            project=other_project,
            status='active'
        )
        
        # Test with project filter
        response = self.client.get(f'/api/v1/ptw/permits/kpis/?project={self.project.id}')
        data = response.json()
        
        self.assertEqual(data['counts']['active'], 1)
    
    def test_response_structure(self):
        """Test response structure is correct"""
        response = self.client.get('/api/v1/ptw/permits/kpis/')
        data = response.json()
        
        # Check top-level keys
        self.assertIn('as_of', data)
        self.assertIn('counts', data)
        self.assertIn('overdue', data)
        self.assertIn('lists', data)
        
        # Check counts structure
        expected_count_keys = [
            'total_open', 'draft', 'submitted', 'pending_verification',
            'pending_approval', 'under_review', 'approved', 'active',
            'suspended', 'completed_today', 'cancelled_today', 'expired', 'rejected'
        ]
        for key in expected_count_keys:
            self.assertIn(key, data['counts'])
        
        # Check overdue structure
        expected_overdue_keys = [
            'pending_verification', 'pending_approval', 'expiring_soon',
            'isolation_pending', 'closeout_pending'
        ]
        for key in expected_overdue_keys:
            self.assertIn(key, data['overdue'])
        
        # Check lists structure
        self.assertIn('top_overdue', data['lists'])
        self.assertIn('expiring_soon', data['lists'])
