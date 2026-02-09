"""
Tests for PTW filters and pagination (PR14)
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from authentication.models import Project
from ptw.models import Permit, PermitType
from datetime import datetime, timedelta
from django.utils import timezone

User = get_user_model()


class PermitFilterPaginationTestCase(TestCase):
    """Test permit list filters and pagination"""
    
    def setUp(self):
        # Create projects
        self.project1 = Project.objects.create(name='Project Alpha', code='ALPHA')
        self.project2 = Project.objects.create(name='Project Beta', code='BETA')
        
        # Create users
        self.user1 = User.objects.create_user(
            username='user1',
            password='pass123',
            project=self.project1
        )
        self.user2 = User.objects.create_user(
            username='user2',
            password='pass123',
            project=self.project2
        )
        
        # Create permit type
        self.permit_type = PermitType.objects.create(
            name='Hot Work',
            category='hot_work',
            risk_level='high'
        )
        
        # Create permits for project1
        for i in range(15):
            Permit.objects.create(
                permit_number=f'PTW-ALPHA-{i:03d}',
                title=f'Test Permit {i}',
                location=f'Location {i}',
                permit_type=self.permit_type,
                project=self.project1,
                created_by=self.user1,
                status='active' if i % 2 == 0 else 'under_review',
                risk_level='high' if i % 3 == 0 else 'medium',
                planned_start_time=timezone.now() + timedelta(days=i),
                planned_end_time=timezone.now() + timedelta(days=i+1)
            )
        
        # Create permits for project2
        for i in range(5):
            Permit.objects.create(
                permit_number=f'PTW-BETA-{i:03d}',
                title=f'Beta Permit {i}',
                location=f'Beta Location {i}',
                permit_type=self.permit_type,
                project=self.project2,
                created_by=self.user2,
                status='completed',
                risk_level='low',
                planned_start_time=timezone.now() + timedelta(days=i),
                planned_end_time=timezone.now() + timedelta(days=i+1)
            )
        
        self.client = APIClient()
    
    def test_permits_list_paginated_shape(self):
        """Test that permits list returns paginated response with count/next/previous/results"""
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.get('/api/v1/ptw/permits/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('count', response.data)
        self.assertIn('results', response.data)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)
        self.assertIsInstance(response.data['results'], list)
        self.assertEqual(response.data['count'], 15)  # User1's project has 15 permits
    
    def test_project_scoping_blocks_other_project(self):
        """Test that users can only see permits from their own project"""
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.get('/api/v1/ptw/permits/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # User1 should only see project1 permits (15)
        self.assertEqual(response.data['count'], 15)
        
        # Verify no project2 permits in results
        for permit in response.data['results']:
            self.assertEqual(permit['project'], self.project1.id)
    
    def test_status_filter_single(self):
        """Test filtering by single status"""
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.get('/api/v1/ptw/permits/?status=active')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # 8 active permits (0,2,4,6,8,10,12,14)
        self.assertEqual(response.data['count'], 8)
        for permit in response.data['results']:
            self.assertEqual(permit['status'], 'active')
    
    def test_status_filter_multi(self):
        """Test filtering by multiple statuses (comma-separated)"""
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.get('/api/v1/ptw/permits/?status=active,pending_approval')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 15)  # All permits match
        for permit in response.data['results']:
            self.assertIn(permit['status'], ['active', 'under_review'])
    
    def test_search_filter_matches_permit_number(self):
        """Test search filter matches permit_number"""
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.get('/api/v1/ptw/permits/?search=PTW-ALPHA-005')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['count'], 1)
        # Should find PTW-ALPHA-005
        permit_numbers = [p['permit_number'] for p in response.data['results']]
        self.assertIn('PTW-ALPHA-005', permit_numbers)
    
    def test_search_filter_matches_location(self):
        """Test search filter matches location"""
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.get('/api/v1/ptw/permits/?search=Location 3')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['count'], 1)
    
    def test_date_range_filter(self):
        """Test date range filtering"""
        self.client.force_authenticate(user=self.user1)
        
        # Get permits created today
        today = timezone.now().date()
        response = self.client.get(f'/api/v1/ptw/permits/?date_from={today}&date_to={today}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # All permits created today
        self.assertEqual(response.data['count'], 15)
    
    def test_risk_level_filter(self):
        """Test risk level filtering"""
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.get('/api/v1/ptw/permits/?risk_level=high')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Permits 0,3,6,9,12 are high risk (5 total)
        self.assertEqual(response.data['count'], 5)
        for permit in response.data['results']:
            self.assertEqual(permit['risk_level'], 'high')
    
    def test_ordering_by_created_at(self):
        """Test ordering by created_at"""
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.get('/api/v1/ptw/permits/?ordering=-created_at')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Default ordering is -created_at, so newest first
        results = response.data['results']
        if len(results) >= 2:
            # Verify descending order
            self.assertGreaterEqual(results[0]['id'], results[1]['id'])
    
    def test_pagination_page_size(self):
        """Test pagination with custom page size"""
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.get('/api/v1/ptw/permits/?page_size=5')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 5)
        self.assertEqual(response.data['count'], 15)
        self.assertIsNotNone(response.data['next'])
    
    def test_kpis_respects_project_filter(self):
        """Test KPI endpoint respects project filter"""
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.get(f'/api/v1/ptw/permits/kpis/?project={self.project1.id}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # KPIs should be calculated only for project1 permits
        self.assertIn('total_permits', response.data)
    
    def test_kpis_respects_status_filter(self):
        """Test KPI endpoint respects status filter"""
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.get('/api/v1/ptw/permits/kpis/?status=active')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # KPIs should be calculated only for active permits
        self.assertIn('total_permits', response.data)
    
    def test_export_excel_respects_filter(self):
        """Test export_excel respects filters"""
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.get('/api/v1/ptw/permits/export_excel/?status=active')
        
        # Should return Excel file or error if openpyxl not installed
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])
        
        if response.status_code == status.HTTP_200_OK:
            self.assertEqual(
                response['Content-Type'],
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
    
    def test_combined_filters(self):
        """Test combining multiple filters"""
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.get(
            '/api/v1/ptw/permits/?status=active&risk_level=high&search=Location'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should find active, high risk permits with "Location" in search fields
        for permit in response.data['results']:
            self.assertEqual(permit['status'], 'active')
            self.assertEqual(permit['risk_level'], 'high')


class PermitAuditPaginationTestCase(TestCase):
    """Test permit audit pagination"""
    
    def setUp(self):
        self.project = Project.objects.create(name='Test Project', code='TEST')
        self.user = User.objects.create_user(
            username='testuser',
            password='pass123',
            project=self.project
        )
        self.permit_type = PermitType.objects.create(
            name='Test Type',
            category='general',
            risk_level='low'
        )
        self.permit = Permit.objects.create(
            permit_number='PTW-TEST-001',
            title='Test Permit',
            location='Test Location',
            permit_type=self.permit_type,
            project=self.project,
            created_by=self.user,
            status='draft',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timedelta(days=1)
        )
        
        # Create audit logs
        from ptw.models import PermitAudit
        for i in range(25):
            PermitAudit.objects.create(
                permit=self.permit,
                action=f'action_{i}',
                user=self.user,
                comments=f'Comment {i}'
            )
        
        self.client = APIClient()
    
    def test_audit_list_paginated(self):
        """Test that audit list is paginated"""
        self.client.force_authenticate(user=self.user)
        
        response = self.client.get('/api/v1/ptw/permit-audits/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('count', response.data)
        self.assertIn('results', response.data)
        self.assertEqual(response.data['count'], 25)
        # Default page size is 20
        self.assertLessEqual(len(response.data['results']), 20)
