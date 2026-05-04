from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from authentication.models import Project
from ptw.models import Permit, PermitType, PermitIsolationPoint, PermitCloseout, AppliedOfflineChange, IsolationPointLibrary
from datetime import timedelta

User = get_user_model()


class OfflineSyncConflictTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            email='test@example.com'
        )
        self.project = Project.objects.create(name='Test Project')
        self.user.project = self.project
        self.user.save()
        self.client.force_authenticate(user=self.user)
        
        self.permit_type = PermitType.objects.create(
            name='Hot Work',
            category='hot_work',
            risk_level='high'
        )
        
        self.permit = Permit.objects.create(
            permit_number='PTW-2024-001',
            permit_type=self.permit_type,
            title='Test Permit',
            description='Test Description',
            location='Test Location',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timedelta(hours=8),
            created_by=self.user,
            project=self.project,
            status='draft',
            version=1
        )
    
    def test_apply_update_when_versions_match(self):
        """Test successful update when client version matches server version"""
        payload = {
            'device_id': 'test_device',
            'client_time': timezone.now().isoformat(),
            'changes': [{
                'entity': 'permit',
                'op': 'update',
                'offline_id': 'offline_123',
                'server_id': self.permit.id,
                'client_version': 1,
                'data': {
                    'title': 'Updated Title',
                    'description': 'Updated Description'
                }
            }]
        }
        
        response = self.client.post('/api/v1/ptw/sync-offline-data/', payload, format='json')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['applied']), 1)
        self.assertEqual(len(response.data['conflicts']), 0)
        
        self.permit.refresh_from_db()
        self.assertEqual(self.permit.title, 'Updated Title')
        self.assertEqual(self.permit.version, 2)
    
    def test_conflict_when_stale_version_scalar_field(self):
        """Test conflict detection when client has stale version"""
        # Simulate server update
        self.permit.title = 'Server Updated Title'
        self.permit.version = 2
        self.permit.save()
        
        payload = {
            'device_id': 'test_device',
            'client_time': timezone.now().isoformat(),
            'changes': [{
                'entity': 'permit',
                'op': 'update',
                'offline_id': 'offline_123',
                'server_id': self.permit.id,
                'client_version': 1,
                'data': {
                    'title': 'Client Updated Title'
                }
            }]
        }
        
        response = self.client.post('/api/v1/ptw/sync-offline-data/', payload, format='json')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['conflicts']), 1)
        self.assertEqual(len(response.data['applied']), 0)
        
        conflict = response.data['conflicts'][0]
        self.assertEqual(conflict['reason'], 'stale_version')
        self.assertEqual(conflict['client_version'], 1)
        self.assertEqual(conflict['server_version'], 2)
        self.assertIn('title', conflict['fields'])
    
    def test_set_merge_ppe_when_stale(self):
        """Test PPE requirements can be merged using set union"""
        self.permit.ppe_requirements = ['helmet', 'gloves']
        self.permit.version = 2
        self.permit.save()
        
        payload = {
            'device_id': 'test_device',
            'client_time': timezone.now().isoformat(),
            'changes': [{
                'entity': 'permit',
                'op': 'update',
                'offline_id': 'offline_123',
                'server_id': self.permit.id,
                'client_version': 1,
                'data': {
                    'ppe_requirements': ['helmet', 'boots']
                }
            }]
        }
        
        response = self.client.post('/api/v1/ptw/sync-offline-data/', payload, format='json')
        
        self.assertEqual(response.status_code, 200)
        conflict = response.data['conflicts'][0]
        self.assertEqual(conflict['fields']['ppe_requirements']['merge_hint'], 'set_merge')
    
    def test_checklist_merge_true_wins(self):
        """Test safety checklist merge with True wins strategy"""
        self.permit.safety_checklist = {'item1': True, 'item2': False}
        self.permit.version = 2
        self.permit.save()
        
        payload = {
            'device_id': 'test_device',
            'client_time': timezone.now().isoformat(),
            'changes': [{
                'entity': 'permit',
                'op': 'update',
                'offline_id': 'offline_123',
                'server_id': self.permit.id,
                'client_version': 1,
                'data': {
                    'safety_checklist': {'item1': False, 'item2': True, 'item3': True}
                }
            }]
        }
        
        response = self.client.post('/api/v1/ptw/sync-offline-data/', payload, format='json')
        
        conflict = response.data['conflicts'][0]
        self.assertEqual(conflict['fields']['safety_checklist']['merge_hint'], 'true_wins')
    
    def test_append_photo_idempotent_by_offline_id(self):
        """Test photo append is idempotent using offline_id"""
        payload = {
            'device_id': 'test_device',
            'client_time': timezone.now().isoformat(),
            'changes': [{
                'entity': 'permit_photo',
                'op': 'append',
                'offline_id': 'photo_123',
                'data': {
                    'permit_id': self.permit.id,
                    'photo_type': 'during',
                    'description': 'Test photo'
                }
            }]
        }
        
        # First sync
        response1 = self.client.post('/api/v1/ptw/sync-offline-data/', payload, format='json')
        self.assertEqual(len(response1.data['applied']), 1)
        
        # Second sync with same offline_id
        response2 = self.client.post('/api/v1/ptw/sync-offline-data/', payload, format='json')
        self.assertEqual(len(response2.data['applied']), 1)
        self.assertEqual(response2.data['applied'][0]['status'], 'already_applied')
    
    def test_status_transition_rejected_when_invalid(self):
        """Test invalid status transition is rejected"""
        self.permit.status = 'draft'
        self.permit.save()
        
        payload = {
            'device_id': 'test_device',
            'client_time': timezone.now().isoformat(),
            'changes': [{
                'entity': 'permit',
                'op': 'update_status',
                'offline_id': 'offline_123',
                'server_id': self.permit.id,
                'client_version': 1,
                'data': {
                    'status': 'completed'  # Invalid: draft -> completed
                }
            }]
        }
        
        response = self.client.post('/api/v1/ptw/sync-offline-data/', payload, format='json')
        
        self.assertEqual(len(response.data['conflicts']), 1)
        conflict = response.data['conflicts'][0]
        self.assertEqual(conflict['reason'], 'invalid_transition')
    
    def test_isolation_status_monotonic(self):
        """Test isolation point status progression is monotonic"""
        lib_point = IsolationPointLibrary.objects.create(
            project=self.project,
            point_code='V-001',
            point_type='valve',
            energy_type='electrical'
        )
        
        isolation = PermitIsolationPoint.objects.create(
            permit=self.permit,
            point=lib_point,
            status='verified',
            version=1
        )
        
        payload = {
            'device_id': 'test_device',
            'client_time': timezone.now().isoformat(),
            'changes': [{
                'entity': 'isolation_point',
                'op': 'update',
                'offline_id': 'offline_123',
                'server_id': isolation.id,
                'client_version': 1,
                'data': {
                    'status': 'isolated'  # Regression from verified
                }
            }]
        }
        
        # Server advances to deisolated
        isolation.status = 'deisolated'
        isolation.version = 2
        isolation.save()
        
        response = self.client.post('/api/v1/ptw/sync-offline-data/', payload, format='json')
        
        self.assertEqual(len(response.data['conflicts']), 1)
        conflict = response.data['conflicts'][0]
        self.assertIn('already at', conflict.get('detail', ''))

    def test_isolation_project_scope_violation(self):
        """Isolation updates from another project are rejected without leaks"""
        other_project = Project.objects.create(name='Other Project')
        other_user = User.objects.create_user(
            username='otheruser',
            password='testpass123',
            email='other@example.com',
            project=other_project
        )
        other_permit = Permit.objects.create(
            permit_number='PTW-2024-002',
            permit_type=self.permit_type,
            title='Other Permit',
            description='Other Description',
            location='Other Location',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timedelta(hours=8),
            created_by=other_user,
            project=other_project,
            status='draft',
            version=1
        )
        other_point = PermitIsolationPoint.objects.create(
            permit=other_permit,
            status='assigned',
            version=1
        )

        payload = {
            'device_id': 'test_device',
            'client_time': timezone.now().isoformat(),
            'changes': [{
                'entity': 'isolation_point',
                'op': 'update',
                'offline_id': 'offline_scope',
                'server_id': other_point.id,
                'client_version': 1,
                'data': {
                    'status': 'isolated'
                }
            }]
        }

        response = self.client.post('/api/v1/ptw/sync-offline-data/', payload, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['rejected']), 1)
        rejected = response.data['rejected'][0]
        self.assertEqual(rejected['reason'], 'project_scope_violation')
        self.assertNotIn('server_state', rejected)

        other_point.refresh_from_db()
        self.assertEqual(other_point.status, 'assigned')
    
    def test_applied_change_deduplication_table(self):
        """Test AppliedOfflineChange prevents duplicate processing"""
        payload = {
            'device_id': 'test_device',
            'client_time': timezone.now().isoformat(),
            'changes': [{
                'entity': 'permit',
                'op': 'update',
                'offline_id': 'offline_unique_123',
                'server_id': self.permit.id,
                'client_version': 1,
                'data': {
                    'title': 'Updated Once'
                }
            }]
        }
        
        # First sync
        response1 = self.client.post('/api/v1/ptw/sync-offline-data/', payload, format='json')
        self.assertEqual(len(response1.data['applied']), 1)
        
        # Verify record created
        self.assertTrue(
            AppliedOfflineChange.objects.filter(
                device_id='test_device',
                offline_id='offline_unique_123',
                entity='permit'
            ).exists()
        )
        
        # Second sync - should be idempotent
        response2 = self.client.post('/api/v1/ptw/sync-offline-data/', payload, format='json')
        self.assertEqual(len(response2.data['applied']), 1)
        self.assertEqual(response2.data['applied'][0]['status'], 'already_applied')
    
    def test_missing_client_version_handling(self):
        """Test handling of changes without client_version"""
        payload = {
            'device_id': 'test_device',
            'client_time': timezone.now().isoformat(),
            'changes': [{
                'entity': 'permit',
                'op': 'update',
                'offline_id': 'offline_123',
                'server_id': self.permit.id,
                # No client_version provided
                'data': {
                    'title': 'Updated Title'
                }
            }]
        }
        
        response = self.client.post('/api/v1/ptw/sync-offline-data/', payload, format='json')
        
        # Should create conflict due to missing version
        self.assertEqual(len(response.data['conflicts']), 1)
        conflict = response.data['conflicts'][0]
        self.assertEqual(conflict['reason'], 'missing_client_version')
