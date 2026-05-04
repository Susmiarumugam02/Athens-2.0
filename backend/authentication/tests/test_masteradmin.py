import uuid
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from authentication.models import User, UserType, Project


class MasterAdminTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tenant_id = uuid.uuid4()
        
        # Create MasterAdmin user
        self.master_admin = User.objects.create_user(
            email='master@test.com',
            password='testpass123',
            user_type=UserType.MASTERADMIN,
            athens_tenant_id=self.tenant_id
        )
        
        # Create test project
        self.project = Project.objects.create(
            projectName='Test Project',
            projectCategory='construction',
            capacity='100MW',
            location='Test Location',
            nearestPoliceStation='Test Police',
            nearestPoliceStationContact='123456789',
            nearestHospital='Test Hospital',
            nearestHospitalContact='987654321',
            commencementDate='2024-01-01',
            deadlineDate='2024-12-31',
            athens_tenant_id=self.tenant_id
        )

    def test_masteradmin_authentication_required(self):
        """Test that MasterAdmin endpoints require authentication"""
        url = reverse('authentication:masteradmin:dashboard-stats')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_masteradmin_permission_required(self):
        """Test that only MasterAdmin users can access endpoints"""
        # Create regular user
        regular_user = User.objects.create_user(
            email='user@test.com',
            password='testpass123',
            user_type=UserType.COMPANYUSER
        )
        
        self.client.force_authenticate(user=regular_user)
        url = reverse('authentication:masteradmin:dashboard-stats')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        self.client.force_authenticate(user=self.master_admin)
        url = reverse('authentication:masteradmin:dashboard-stats')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_projects', response.data)
        self.assertIn('active_projects', response.data)
        self.assertIn('total_users', response.data)
        self.assertIn('pending_approvals', response.data)

    def test_tenant_isolation(self):
        """Test that MasterAdmin can only see tenant-scoped data"""
        # Create another tenant and project
        other_tenant_id = uuid.uuid4()
        other_project = Project.objects.create(
            projectName='Other Project',
            projectCategory='manufacturing',
            capacity='50MW',
            location='Other Location',
            nearestPoliceStation='Other Police',
            nearestPoliceStationContact='111111111',
            nearestHospital='Other Hospital',
            nearestHospitalContact='222222222',
            commencementDate='2024-01-01',
            deadlineDate='2024-12-31',
            athens_tenant_id=other_tenant_id
        )
        
        self.client.force_authenticate(user=self.master_admin)
        url = reverse('authentication:masteradmin:projects-list-create')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)  # Should only see own tenant's project
        self.assertEqual(response.data[0]['projectName'], 'Test Project')

    def test_project_crud(self):
        """Test project CRUD operations"""
        self.client.force_authenticate(user=self.master_admin)
        
        # Test create
        create_url = reverse('authentication:masteradmin:projects-list-create')
        project_data = {
            'projectName': 'New Project',
            'projectCategory': 'chemical',
            'capacity': '200MW',
            'location': 'New Location',
            'nearestPoliceStation': 'New Police',
            'nearestPoliceStationContact': '333333333',
            'nearestHospital': 'New Hospital',
            'nearestHospitalContact': '444444444',
            'commencementDate': '2024-02-01',
            'deadlineDate': '2024-11-30'
        }
        
        response = self.client.post(create_url, project_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['projectName'], 'New Project')
        
        # Test update
        project_id = response.data['id']
        update_url = reverse('authentication:masteradmin:project-detail', args=[project_id])
        update_data = {'projectName': 'Updated Project'}
        
        response = self.client.put(update_url, update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['projectName'], 'Updated Project')
        
        # Test delete
        response = self.client.delete(update_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_masteradmin_cannot_access_tenant_endpoints(self):
        """Test that MasterAdmin cannot access tenant management endpoints"""
        self.client.force_authenticate(user=self.master_admin)
        
        # Try to access tenant list (should be 403)
        response = self.client.get('/api/control-plane/tenants/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Try to create tenant (should be 403)
        response = self.client.post('/api/control-plane/tenants/', {
            'name': 'Test Tenant',
            'code': 'TEST',
            'contact_email': 'test@example.com'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Try to update tenant (should be 403)
        response = self.client.patch('/api/control-plane/tenants/1/', {
            'name': 'Updated Name'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)