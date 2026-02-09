"""
Tests for PR8 - Isolation Points Management
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from ptw.models import (
    Permit, PermitType, IsolationPointLibrary, PermitIsolationPoint
)
from authentication.models import Project

User = get_user_model()


class IsolationPointsTestCase(TestCase):
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            name='Test',
            surname='User'
        )
        self.client.force_authenticate(user=self.user)
        
        # Create project
        self.project = Project.objects.create(
            name='Test Project',
            code='TEST'
        )
        self.user.project = self.project
        self.user.save()
        
        # Create permit type with structured isolation
        self.permit_type = PermitType.objects.create(
            name='Electrical Work',
            category='electrical',
            risk_level='high',
            requires_isolation=True,
            requires_structured_isolation=True
        )
        
        # Create permit type without structured isolation
        self.permit_type_no_struct = PermitType.objects.create(
            name='Cold Work',
            category='cold_work',
            risk_level='low',
            requires_isolation=False,
            requires_structured_isolation=False
        )
        
        # Create isolation points in library
        self.point1 = IsolationPointLibrary.objects.create(
            project=self.project,
            point_code='MCC-01',
            point_type='breaker',
            energy_type='electrical',
            location='Main Control Center',
            requires_lock=True,
            default_lock_count=2
        )
        
        self.point2 = IsolationPointLibrary.objects.create(
            project=self.project,
            point_code='VALVE-101',
            point_type='valve',
            energy_type='hydraulic',
            location='Pump Room A',
            requires_lock=True,
            default_lock_count=1
        )
    
    def test_create_library_point(self):
        """Test creating isolation point in library"""
        data = {
            'project': self.project.id,
            'point_code': 'SW-202',
            'point_type': 'switch',
            'energy_type': 'electrical',
            'location': 'Substation B',
            'requires_lock': True,
            'default_lock_count': 1
        }
        
        response = self.client.post('/api/v1/ptw/isolation-points/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(IsolationPointLibrary.objects.count(), 3)
    
    def test_assign_library_point_to_permit(self):
        """Test assigning library point to permit"""
        permit = Permit.objects.create(
            permit_type=self.permit_type,
            description='Test work',
            location='Test location',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timezone.timedelta(hours=8),
            created_by=self.user,
            project=self.project
        )
        
        data = {
            'point_id': self.point1.id,
            'required': True
        }
        
        response = self.client.post(
            f'/api/v1/ptw/permits/{permit.id}/assign_isolation/',
            data
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(permit.isolation_points.count(), 1)
        
        point = permit.isolation_points.first()
        self.assertEqual(point.point, self.point1)
        self.assertEqual(point.status, 'assigned')
        self.assertEqual(point.lock_count, 2)  # From default_lock_count
    
    def test_assign_custom_point_to_permit(self):
        """Test assigning custom (ad-hoc) point to permit"""
        permit = Permit.objects.create(
            permit_type=self.permit_type,
            description='Test work',
            location='Test location',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timezone.timedelta(hours=8),
            created_by=self.user,
            project=self.project
        )
        
        data = {
            'custom_point_name': 'Temporary Disconnect',
            'custom_point_details': 'Temporary isolation for maintenance',
            'required': True,
            'lock_count': 1
        }
        
        response = self.client.post(
            f'/api/v1/ptw/permits/{permit.id}/assign_isolation/',
            data
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(permit.isolation_points.count(), 1)
        
        point = permit.isolation_points.first()
        self.assertIsNone(point.point)
        self.assertEqual(point.custom_point_name, 'Temporary Disconnect')
        self.assertEqual(point.status, 'assigned')
    
    def test_gating_blocks_approve_when_requires_structured_isolation_and_no_points(self):
        """Test that approval is blocked when structured isolation required but no points assigned"""
        permit = Permit.objects.create(
            permit_type=self.permit_type,
            description='Test work',
            location='Test location',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timezone.timedelta(hours=8),
            created_by=self.user,
            project=self.project,
            status='submitted'
        )
        
        # Try to approve without isolation points
        response = self.client.post(
            f'/api/v1/ptw/permits/{permit.id}/update_status/',
            {'status': 'approved'}
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('isolation', str(response.data).lower())
    
    def test_gating_blocks_activate_when_points_not_verified(self):
        """Test that activation is blocked when isolation points not verified"""
        permit = Permit.objects.create(
            permit_type=self.permit_type,
            description='Test work',
            location='Test location',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timezone.timedelta(hours=8),
            created_by=self.user,
            project=self.project,
            status='approved'
        )
        
        # Assign point but don't verify
        PermitIsolationPoint.objects.create(
            permit=permit,
            point=self.point1,
            required=True,
            status='isolated'
        )
        
        # Try to activate
        response = self.client.post(
            f'/api/v1/ptw/permits/{permit.id}/update_status/',
            {'status': 'active'}
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('verified', str(response.data).lower())
    
    def test_allows_activate_when_all_required_verified(self):
        """Test that activation succeeds when all required points verified"""
        permit = Permit.objects.create(
            permit_type=self.permit_type,
            description='Test work',
            location='Test location',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timezone.timedelta(hours=8),
            created_by=self.user,
            project=self.project,
            status='approved'
        )
        
        # Assign and verify point
        PermitIsolationPoint.objects.create(
            permit=permit,
            point=self.point1,
            required=True,
            status='verified',
            verified_by=self.user,
            verified_at=timezone.now()
        )
        
        # Try to activate
        response = self.client.post(
            f'/api/v1/ptw/permits/{permit.id}/update_status/',
            {'status': 'active'}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        permit.refresh_from_db()
        self.assertEqual(permit.status, 'active')
    
    def test_isolate_point_workflow(self):
        """Test isolating a point (marking as isolated with locks)"""
        permit = Permit.objects.create(
            permit_type=self.permit_type,
            description='Test work',
            location='Test location',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timezone.timedelta(hours=8),
            created_by=self.user,
            project=self.project
        )
        
        point = PermitIsolationPoint.objects.create(
            permit=permit,
            point=self.point1,
            required=True,
            status='assigned'
        )
        
        # Isolate the point
        data = {
            'point_id': point.id,
            'action': 'isolate',
            'lock_applied': True,
            'lock_count': 2,
            'lock_ids': ['LOCK-001', 'LOCK-002']
        }
        
        response = self.client.post(
            f'/api/v1/ptw/permits/{permit.id}/update_isolation/',
            data
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        point.refresh_from_db()
        self.assertEqual(point.status, 'isolated')
        self.assertTrue(point.lock_applied)
        self.assertEqual(point.lock_count, 2)
        self.assertEqual(point.isolated_by, self.user)
        self.assertIsNotNone(point.isolated_at)
    
    def test_verify_point_workflow(self):
        """Test verifying an isolated point"""
        permit = Permit.objects.create(
            permit_type=self.permit_type,
            description='Test work',
            location='Test location',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timezone.timedelta(hours=8),
            created_by=self.user,
            project=self.project
        )
        
        point = PermitIsolationPoint.objects.create(
            permit=permit,
            point=self.point1,
            required=True,
            status='isolated',
            isolated_by=self.user,
            isolated_at=timezone.now()
        )
        
        # Verify the point
        data = {
            'point_id': point.id,
            'action': 'verify',
            'verification_notes': 'Zero energy confirmed'
        }
        
        response = self.client.post(
            f'/api/v1/ptw/permits/{permit.id}/update_isolation/',
            data
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        point.refresh_from_db()
        self.assertEqual(point.status, 'verified')
        self.assertEqual(point.verified_by, self.user)
        self.assertIsNotNone(point.verified_at)
        self.assertEqual(point.verification_notes, 'Zero energy confirmed')
    
    def test_deisolate_point_workflow(self):
        """Test de-isolating a point at closeout"""
        permit = Permit.objects.create(
            permit_type=self.permit_type,
            description='Test work',
            location='Test location',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timezone.timedelta(hours=8),
            created_by=self.user,
            project=self.project
        )
        
        point = PermitIsolationPoint.objects.create(
            permit=permit,
            point=self.point1,
            required=True,
            status='verified'
        )
        
        # De-isolate the point
        data = {
            'point_id': point.id,
            'action': 'deisolate',
            'deisolated_notes': 'System restored to normal'
        }
        
        response = self.client.post(
            f'/api/v1/ptw/permits/{permit.id}/update_isolation/',
            data
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        point.refresh_from_db()
        self.assertEqual(point.status, 'deisolated')
        self.assertEqual(point.deisolated_by, self.user)
        self.assertIsNotNone(point.deisolated_at)
    
    def test_no_gating_when_structured_isolation_not_required(self):
        """Test that permits without structured isolation requirement are not blocked"""
        permit = Permit.objects.create(
            permit_type=self.permit_type_no_struct,
            description='Test work',
            location='Test location',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timezone.timedelta(hours=8),
            created_by=self.user,
            project=self.project,
            status='submitted'
        )
        
        # Should be able to approve without isolation points
        response = self.client.post(
            f'/api/v1/ptw/permits/{permit.id}/update_status/',
            {'status': 'approved'}
        )
        
        # Should succeed (or fail for other reasons, but not isolation)
        if response.status_code == status.HTTP_400_BAD_REQUEST:
            self.assertNotIn('isolation', str(response.data).lower())
    
    def test_get_isolation_summary(self):
        """Test getting isolation summary for a permit"""
        permit = Permit.objects.create(
            permit_type=self.permit_type,
            description='Test work',
            location='Test location',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timezone.timedelta(hours=8),
            created_by=self.user,
            project=self.project
        )
        
        # Add multiple points with different statuses
        PermitIsolationPoint.objects.create(
            permit=permit,
            point=self.point1,
            required=True,
            status='verified'
        )
        PermitIsolationPoint.objects.create(
            permit=permit,
            point=self.point2,
            required=True,
            status='isolated'
        )
        
        response = self.client.get(f'/api/v1/ptw/permits/{permit.id}/isolation/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['summary']['total'], 2)
        self.assertEqual(response.data['summary']['required'], 2)
        self.assertEqual(response.data['summary']['verified'], 1)
        self.assertEqual(response.data['summary']['pending_verification'], 1)
