"""
PR5 Tests: Frontend Data Shape Compatibility
Tests that serializers provide both backend and frontend expected field names
"""
from django.test import TestCase
from authentication.models import CustomUser
from ptw.models import Permit, PermitType, PermitAudit
from ptw.serializers import UserMinimalSerializer, PermitSerializer


class UserMinimalSerializerTest(TestCase):
    """Test UserMinimalSerializer provides both name/surname and first_name/last_name"""
    
    def setUp(self):
        self.user = CustomUser.objects.create(
            username='testuser',
            email='test@example.com',
            name='John',
            surname='Doe',
            user_type='epcuser',
            admin_type='epcuser',
            grade='C'
        )
    
    def test_serializer_includes_backend_fields(self):
        """Backend fields (name, surname, user_type) should be present"""
        serializer = UserMinimalSerializer(self.user)
        data = serializer.data
        
        self.assertEqual(data['name'], 'John')
        self.assertEqual(data['surname'], 'Doe')
        self.assertEqual(data['user_type'], 'epcuser')
    
    def test_serializer_includes_frontend_alias_fields(self):
        """Frontend alias fields (first_name, last_name, usertype) should be present"""
        serializer = UserMinimalSerializer(self.user)
        data = serializer.data
        
        self.assertEqual(data['first_name'], 'John')
        self.assertEqual(data['last_name'], 'Doe')
        self.assertEqual(data['usertype'], 'epcuser')
    
    def test_alias_fields_match_source_fields(self):
        """Alias fields should have same values as source fields"""
        serializer = UserMinimalSerializer(self.user)
        data = serializer.data
        
        self.assertEqual(data['first_name'], data['name'])
        self.assertEqual(data['last_name'], data['surname'])
        self.assertEqual(data['usertype'], data['user_type'])


class PermitSerializerAuditFieldTest(TestCase):
    """Test PermitSerializer provides both audit_logs and audit_trail"""
    
    def setUp(self):
        self.user = CustomUser.objects.create(
            username='creator',
            email='creator@example.com',
            name='Jane',
            surname='Smith',
            user_type='contractoruser',
            admin_type='contractoruser',
            grade='C'
        )
        
        self.permit_type = PermitType.objects.create(
            name='Hot Work',
            description='Hot work permit',
            risk_level='high',
            validity_hours=8,
            is_active=True
        )
        
        self.permit = Permit.objects.create(
            permit_type=self.permit_type,
            title='Test Permit',
            description='Test description',
            location='Test Location',
            created_by=self.user,
            status='draft'
        )
    
    def test_serializer_includes_audit_logs_field(self):
        """Backend field audit_logs should be present"""
        serializer = PermitSerializer(self.permit)
        data = serializer.data
        
        self.assertIn('audit_logs', data)
        self.assertIsInstance(data['audit_logs'], list)
    
    def test_serializer_includes_audit_trail_alias(self):
        """Frontend alias field audit_trail should be present"""
        serializer = PermitSerializer(self.permit)
        data = serializer.data
        
        self.assertIn('audit_trail', data)
        self.assertIsInstance(data['audit_trail'], list)
    
    def test_audit_fields_have_same_content(self):
        """audit_logs and audit_trail should contain same data"""
        # Create an audit entry
        PermitAudit.objects.create(
            permit=self.permit,
            action='created',
            user=self.user,
            comments='Initial creation'
        )
        
        serializer = PermitSerializer(self.permit)
        data = serializer.data
        
        # Both fields should have same length
        self.assertEqual(len(data['audit_logs']), len(data['audit_trail']))
        self.assertEqual(len(data['audit_logs']), 1)
        
        # Both should contain same audit entry
        self.assertEqual(data['audit_logs'][0]['action'], 'created')
        self.assertEqual(data['audit_trail'][0]['action'], 'created')
