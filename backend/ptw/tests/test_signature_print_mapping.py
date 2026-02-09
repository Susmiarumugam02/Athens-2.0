"""
Test signature mapping for print preview functionality
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from authentication.models import Project
from ptw.models import Permit, PermitType, DigitalSignature
from ptw.serializers import PermitSerializer
from django.utils import timezone

User = get_user_model()

class SignaturePrintMappingTest(TestCase):
    def setUp(self):
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
            deadlineDate='2024-12-31'
        )
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            user_type='adminuser',
            project=self.project
        )
        
        self.permit_type = PermitType.objects.create(
            name='Test Permit Type',
            category='hot_work'
        )
        
        self.permit = Permit.objects.create(
            permit_type=self.permit_type,
            title='Test Permit',
            description='Test Description',
            location='Test Location',
            planned_start_time=timezone.now(),
            planned_end_time=timezone.now() + timezone.timedelta(hours=8),
            created_by=self.user,
            project=self.project,
            status='draft'
        )
    
    def test_signatures_by_type_mapping(self):
        """Test that signatures_by_type returns correct structure"""
        # Create signatures
        requestor_sig = DigitalSignature.objects.create(
            permit=self.permit,
            signature_type='requestor',
            signatory=self.user,
            signature_data='test_signature_data'
        )
        
        verifier_sig = DigitalSignature.objects.create(
            permit=self.permit,
            signature_type='verifier',
            signatory=self.user,
            signature_data='test_verifier_data'
        )
        
        # Serialize permit
        serializer = PermitSerializer(self.permit)
        data = serializer.data
        
        # Check signatures_by_type structure
        self.assertIn('signatures_by_type', data)
        signatures_by_type = data['signatures_by_type']
        
        # Check requestor signature
        self.assertIn('requestor', signatures_by_type)
        self.assertIsNotNone(signatures_by_type['requestor'])
        requestor = signatures_by_type['requestor']
        self.assertEqual(requestor['signature_type'], 'requestor')
        self.assertIn('signed_at', requestor)
        self.assertIn('signer_name', requestor)
        self.assertIn('signature_render_mode', requestor)
        self.assertIn(requestor['signature_render_mode'], ['raw', 'card'])
        
        # Check verifier signature
        self.assertIn('verifier', signatures_by_type)
        self.assertIsNotNone(signatures_by_type['verifier'])
        verifier = signatures_by_type['verifier']
        self.assertEqual(verifier['signature_type'], 'verifier')
        self.assertIn('signed_at', verifier)
        self.assertIn('signer_name', verifier)
        self.assertIn('signature_render_mode', verifier)
        self.assertIn(verifier['signature_render_mode'], ['raw', 'card'])
        
        # Check approver is null (not signed)
        self.assertIn('approver', signatures_by_type)
        self.assertIsNone(signatures_by_type['approver'])
    
    def test_signature_date_format(self):
        """Test that signed_at is properly formatted"""
        sig = DigitalSignature.objects.create(
            permit=self.permit,
            signature_type='requestor',
            signatory=self.user,
            signature_data='test_data'
        )
        
        serializer = PermitSerializer(self.permit)
        data = serializer.data
        
        requestor = data['signatures_by_type']['requestor']
        self.assertIsNotNone(requestor['signed_at'])
        # Should be ISO format string
        self.assertIsInstance(requestor['signed_at'], str)
    
    def test_signature_render_mode_detection(self):
        """Test signature render mode is correctly detected"""
        # Card mode signature (precomposed)
        card_sig = DigitalSignature.objects.create(
            permit=self.permit,
            signature_type='requestor',
            signatory=self.user,
            signature_data='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        )
        
        serializer = PermitSerializer(self.permit)
        data = serializer.data
        
        requestor = data['signatures_by_type']['requestor']
        self.assertEqual(requestor['signature_render_mode'], 'card')
    
    def test_signature_render_mode_raw(self):
        """Test raw signature mode detection"""
        # Raw mode signature (no precomposed elements)
        raw_sig = DigitalSignature.objects.create(
            permit=self.permit,
            signature_type='verifier',
            signatory=self.user,
            signature_data='raw_signature_data'
        )
        
        serializer = PermitSerializer(self.permit)
        data = serializer.data
        
        verifier = data['signatures_by_type']['verifier']
        self.assertEqual(verifier['signature_render_mode'], 'raw')
