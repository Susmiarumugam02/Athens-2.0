from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from authentication.models import Project
from ptw.models import Permit, PermitType
import uuid

User = get_user_model()

class WorkflowSelectionTestCase(TestCase):
    def setUp(self):
        # Create a test project
        self.project = Project.objects.create(
            projectName="Test Project",
            projectCategory="construction",
            capacity="100MW",
            location="Test Location",
            nearestPoliceStation="Test Police",
            nearestPoliceStationContact="123456789",
            nearestHospital="Test Hospital",
            nearestHospitalContact="987654321",
            commencementDate="2024-01-01",
            deadlineDate="2024-12-31",
            athens_tenant_id=uuid.uuid4()
        )
        
        # Create test users
        self.contractor_user = User.objects.create_user(
            username="contractor1",
            password="testpass123",
            user_type="adminuser",
            admin_type="contractoruser",
            grade="C",
            project=self.project,
            name="Contractor",
            surname="User",
            athens_tenant_id=self.project.athens_tenant_id
        )
        
        self.epc_verifier = User.objects.create_user(
            username="epc_verifier",
            password="testpass123",
            user_type="adminuser",
            admin_type="epcuser",
            grade="B",
            project=self.project,
            name="EPC",
            surname="Verifier",
            athens_tenant_id=self.project.athens_tenant_id
        )
        
        self.client_approver = User.objects.create_user(
            username="client_approver",
            password="testpass123",
            user_type="adminuser",
            admin_type="clientuser",
            grade="A",
            project=self.project,
            name="Client",
            surname="Approver",
            athens_tenant_id=self.project.athens_tenant_id
        )
        
        # Create permit type
        self.permit_type = PermitType.objects.create(
            name="Test Hot Work",
            category="hot_work",
            description="Test permit type"
        )
        
        self.client = APIClient()
    
    def test_receiver_equals_creator(self):
        """Test that receiver is automatically set to creator"""
        self.client.force_authenticate(user=self.contractor_user)
        
        data = {
            'permit_type': self.permit_type.id,
            'description': 'Test permit',
            'location': 'Test location',
            'planned_start_time': '2024-01-15T09:00:00Z',
            'planned_end_time': '2024-01-15T17:00:00Z',
            'probability': 2,
            'severity': 2,
            'control_measures': 'Test control measures',
            'ppe_requirements': ['helmet', 'gloves'],
            'safety_checklist': {'item1': True},
            'verifier': self.epc_verifier.id,
            'status': 'draft'
        }
        
        response = self.client.post('/api/v1/ptw/permits/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        permit = Permit.objects.get(id=response.data['id'])
        self.assertEqual(permit.created_by, self.contractor_user)
        self.assertEqual(permit.receiver, self.contractor_user)
        self.assertEqual(permit.verifier, self.epc_verifier)
    
    def test_team_members_filtering(self):
        """Test team members API filtering"""
        self.client.force_authenticate(user=self.contractor_user)
        
        # Test filtering by user type and grade
        response = self.client.get('/api/v1/ptw/team-members/get_users_by_type_and_grade/', {
            'user_type': 'epcuser,clientuser',
            'grade': 'B,C'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        users = response.data
        
        # Should include EPC verifier (grade B) but not client approver (grade A)
        user_ids = [user['id'] for user in users]
        self.assertIn(self.epc_verifier.id, user_ids)
        self.assertNotIn(self.client_approver.id, user_ids)
        self.assertNotIn(self.contractor_user.id, user_ids)  # Should exclude self
    
    def test_search_functionality(self):
        """Test search functionality in team members API"""
        self.client.force_authenticate(user=self.contractor_user)
        
        response = self.client.get('/api/v1/ptw/team-members/get_users_by_type_and_grade/', {
            'q': 'EPC'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        users = response.data
        
        # Should find EPC verifier
        user_ids = [user['id'] for user in users]
        self.assertIn(self.epc_verifier.id, user_ids)