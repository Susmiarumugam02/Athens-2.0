"""
Test consolidated workflow views using canonical workflow manager
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from authentication.models import Project
from ptw.models import Permit, PermitType, DigitalSignature
from ptw.models import WorkflowInstance, WorkflowStep
from unittest.mock import patch

User = get_user_model()

class WorkflowViewsConsolidatedTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create project
        self.project = Project.objects.create(
            projectName='Test Project',
            projectCategory='construction',
            capacity='100MW',
            location='Test Location',
            nearestPoliceStation='Test Police Station',
            nearestPoliceStationContact='123456789',
            nearestHospital='Test Hospital',
            nearestHospitalContact='987654321',
            commencementDate='2024-01-01',
            deadlineDate='2024-12-31'
        )
        
        # Create users
        self.requestor = User.objects.create_user(
            username='requestor',
            email='requestor@test.com',
            user_type='adminuser',
            project=self.project
        )
        
        self.verifier = User.objects.create_user(
            username='verifier',
            email='verifier@test.com',
            user_type='projectadmin',
            project=self.project
        )
        
        self.approver = User.objects.create_user(
            username='approver',
            email='approver@test.com',
            user_type='projectadmin',
            project=self.project
        )
        
        # Create permit type
        self.permit_type = PermitType.objects.create(
            name='Hot Work',
            category='hot_work'
        )
        
        # Create permit
        self.permit = Permit.objects.create(
            permit_number='PTW-001',
            permit_type=self.permit_type,
            project=self.project,
            created_by=self.requestor,
            verifier=self.verifier,
            approver=self.approver,
            location='Test Location',
            work_description='Test work',
            status='draft'
        )
    
    def test_initiate_workflow_without_signature_fails(self):
        """Test that initiating workflow without signature fails"""
        self.client.force_authenticate(user=self.requestor)
        
        url = reverse('initiate_workflow', kwargs={'permit_id': self.permit.id})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Missing required signatures', response.data.get('error', {}).get('message', ''))
    
    def test_verify_permit_without_signature_fails(self):
        """Test that verifying permit without signature fails"""
        # Add requestor signature and initiate workflow
        with patch('ptw.signature_service.signature_service._generate_signature_data', return_value='mock_signature'):
            DigitalSignature.objects.create(
                permit=self.permit,
                signature_type='requestor',
                signatory=self.requestor,
                signature_data='mock_signature'
            )
        
        self.permit.status = 'pending_verification'
        self.permit.save()

        workflow = WorkflowInstance.objects.create(
            permit=self.permit,
            template=None,
            current_step=2,
            status='active'
        )
        WorkflowStep.objects.create(
            workflow=workflow,
            step_id='verification',
            name='Permit Verification',
            step_type='verification',
            assignee=self.verifier,
            role='verifier',
            order=2,
            required=True,
            status='pending'
        )
        
        self.client.force_authenticate(user=self.verifier)
        
        url = reverse('verify_permit', kwargs={'permit_id': self.permit.id})
        response = self.client.post(url, {
            'action': 'approve',
            'approver_id': self.approver.id
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Missing required signatures', response.data.get('error', {}).get('message', ''))
    
    def test_approve_permit_without_signature_fails(self):
        """Test that approving permit without signature fails"""
        # Add required signatures and set status
        with patch('ptw.signature_service.signature_service._generate_signature_data', return_value='mock_signature'):
            DigitalSignature.objects.create(
                permit=self.permit,
                signature_type='requestor',
                signatory=self.requestor,
                signature_data='mock_signature'
            )
            DigitalSignature.objects.create(
                permit=self.permit,
                signature_type='verifier',
                signatory=self.verifier,
                signature_data='mock_signature'
            )
        
        self.permit.status = 'pending_approval'
        self.permit.save()

        workflow = WorkflowInstance.objects.create(
            permit=self.permit,
            template=None,
            current_step=3,
            status='active'
        )
        WorkflowStep.objects.create(
            workflow=workflow,
            step_id='approval',
            name='Permit Approval',
            step_type='approval',
            assignee=self.approver,
            role='approver',
            order=3,
            required=True,
            status='pending'
        )
        
        self.client.force_authenticate(user=self.approver)
        
        url = reverse('approve_permit', kwargs={'permit_id': self.permit.id})
        response = self.client.post(url, {
            'action': 'approve'
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Missing required signatures', response.data.get('error', {}).get('message', ''))
    
    def test_workflow_success_with_all_signatures(self):
        """Test successful workflow with all required signatures"""
        # Add all required signatures
        with patch('ptw.signature_service.signature_service._generate_signature_data', return_value='mock_signature'):
            DigitalSignature.objects.create(
                permit=self.permit,
                signature_type='requestor',
                signatory=self.requestor,
                signature_data='mock_signature'
            )
            DigitalSignature.objects.create(
                permit=self.permit,
                signature_type='verifier',
                signatory=self.verifier,
                signature_data='mock_signature'
            )
            DigitalSignature.objects.create(
                permit=self.permit,
                signature_type='approver',
                signatory=self.approver,
                signature_data='mock_signature'
            )
        
        # Test initiate workflow
        self.client.force_authenticate(user=self.requestor)
        url = reverse('initiate_workflow', kwargs={'permit_id': self.permit.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Test verify permit
        self.client.force_authenticate(user=self.verifier)
        url = reverse('verify_permit', kwargs={'permit_id': self.permit.id})
        response = self.client.post(url, {
            'action': 'approve',
            'approver_id': self.approver.id
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Test approve permit
        self.client.force_authenticate(user=self.approver)
        url = reverse('approve_permit', kwargs={'permit_id': self.permit.id})
        response = self.client.post(url, {
            'action': 'approve'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify final status
        self.permit.refresh_from_db()
        self.assertEqual(self.permit.status, 'approved')
