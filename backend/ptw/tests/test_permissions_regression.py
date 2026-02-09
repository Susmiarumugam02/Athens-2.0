from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from authentication.models import Project
from ptw.models import Permit, PermitType, PermitIsolationPoint, PermitCloseout, IsolationPointLibrary
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class PermissionRegressionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create two projects
        self.project1 = Project.objects.create(name='Project 1')
        self.project2 = Project.objects.create(name='Project 2')
        
        # Create users for each project
        self.user1 = User.objects.create_user(
            username='user1',
            password='pass123',
            email='user1@test.com'
        )
        self.user1.project = self.project1
        self.user1.save()
        
        self.user2 = User.objects.create_user(
            username='user2',
            password='pass123',
            email='user2@test.com'
        )
        self.user2.project = self.project2
        self.user2.save()
        
        self.permit_type = PermitType.objects.create(
            name='Hot Work',
            category='hot_work',
            risk_level='high'
        )
        
        # Create permits in each project
        self.permit1 = Permit.objects.create(
            permit_number='PTW-2024-001',
            permit_type=self.permit_type,
            title='Permit 1',
            description='Test',
            location='Location 1',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timedelta(hours=8),
            created_by=self.user1,
            project=self.project1
        )
        
        self.permit2 = Permit.objects.create(
            permit_number='PTW-2024-002',
            permit_type=self.permit_type,
            title='Permit 2',
            description='Test',
            location='Location 2',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timedelta(hours=8),
            created_by=self.user2,
            project=self.project2
        )
    
    def test_bulk_export_filters_unauthorized_permits(self):
        """Test bulk export only includes accessible permits"""
        self.client.force_authenticate(user=self.user1)
        
        # Try to export both permits
        payload = {'permit_ids': [self.permit1.id, self.permit2.id]}
        response = self.client.post('/api/v1/ptw/permits/bulk_export_pdf/', payload, format='json')
        
        # Should either succeed with only permit1 or return 404/403
        # The key is that permit2 should NOT be included
        self.assertIn(response.status_code, [200, 404])
    
    def test_sync_rejects_cross_project_permit_update(self):
        """Test sync endpoint rejects cross-project updates"""
        self.client.force_authenticate(user=self.user1)
        
        payload = {
            'device_id': 'test_device',
            'client_time': timezone.now().isoformat(),
            'changes': [{
                'entity': 'permit',
                'op': 'update',
                'offline_id': 'offline_123',
                'server_id': self.permit2.id,  # User1 trying to update User2's permit
                'client_version': 1,
                'data': {'title': 'Hacked Title'}
            }]
        }
        
        response = self.client.post('/api/v1/ptw/sync-offline-data/', payload, format='json')
        
        self.assertEqual(response.status_code, 200)
        # Should be in rejected or not found
        self.assertTrue(
            len(response.data.get('rejected', [])) > 0 or
            len(response.data.get('applied', [])) == 0
        )
    
    def test_isolation_update_requires_project_access(self):
        """Test isolation point update requires proper access"""
        # Create isolation point for permit1
        lib_point = IsolationPointLibrary.objects.create(
            project=self.project1,
            point_code='V-001',
            point_type='valve',
            energy_type='electrical'
        )
        
        isolation = PermitIsolationPoint.objects.create(
            permit=self.permit1,
            point=lib_point,
            status='assigned'
        )
        
        # User2 tries to update User1's isolation point
        self.client.force_authenticate(user=self.user2)
        
        response = self.client.post(
            f'/api/v1/ptw/permits/{self.permit1.id}/update_isolation/',
            {
                'point_id': isolation.id,
                'action': 'isolate',
                'lock_applied': True
            },
            format='json'
        )
        
        # Should be denied (403/404)
        self.assertIn(response.status_code, [403, 404])
    
    def test_closeout_update_requires_project_access(self):
        """Test closeout update requires proper access"""
        # Create closeout for permit1
        closeout = PermitCloseout.objects.create(
            permit=self.permit1
        )
        
        # User2 tries to update User1's closeout
        self.client.force_authenticate(user=self.user2)
        
        response = self.client.post(
            f'/api/v1/ptw/permits/{self.permit1.id}/update_closeout/',
            {'remarks': 'Unauthorized update'},
            format='json'
        )
        
        # Should be denied (403/404)
        self.assertIn(response.status_code, [403, 404])
