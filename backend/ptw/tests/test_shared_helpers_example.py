"""
Example: Using Shared PTW Test Helpers
Demonstrates how to use create_ptw_permit_fixtures and create_ptw_closeout_fixtures
"""
from django.test import TestCase
from tests_common import create_ptw_permit_fixtures, create_ptw_closeout_fixtures
from ptw.models import Permit, PermitType, CloseoutChecklistTemplate, PermitCloseout


class SharedHelpersExampleTest(TestCase):
    """Example test class showing usage of shared PTW test helpers"""
    
    def test_create_permit_fixtures_basic(self):
        """Test basic permit fixture creation"""
        fixtures = create_ptw_permit_fixtures()
        
        # Verify all fixtures created
        self.assertIn('permit_type', fixtures)
        self.assertIn('permit', fixtures)
        self.assertIn('user', fixtures)
        self.assertIn('project', fixtures)
        self.assertIn('tenant', fixtures)
        
        # Verify permit setup
        permit = fixtures['permit']
        self.assertEqual(permit.permit_type.name, 'Hot Work')
        self.assertEqual(permit.status, 'draft')
        self.assertEqual(permit.risk_level, 'high')
    
    def test_create_permit_fixtures_custom(self):
        """Test custom permit fixture creation"""
        fixtures = create_ptw_permit_fixtures(
            permit_type_name='Confined Space',
            permit_type_category='confined_space'
        )
        
        permit = fixtures['permit']
        self.assertEqual(permit.permit_type.name, 'Confined Space')
        self.assertEqual(permit.permit_type.category, 'confined_space')
    
    def test_create_closeout_fixtures_basic(self):
        """Test basic closeout fixture creation"""
        fixtures = create_ptw_closeout_fixtures()
        
        # Verify all fixtures created
        self.assertIn('template', fixtures)
        self.assertIn('closeout', fixtures)
        self.assertIn('permit', fixtures)
        
        # Verify closeout setup
        closeout = fixtures['closeout']
        template = fixtures['template']
        
        self.assertEqual(closeout.template, template)
        self.assertFalse(closeout.completed)
        self.assertEqual(len(template.items), 4)  # Default items
        
        # Check default template items
        item_keys = [item['key'] for item in template.items]
        self.assertIn('tools_removed', item_keys)
        self.assertIn('area_cleaned', item_keys)
        self.assertIn('safety_check', item_keys)
        self.assertIn('documentation', item_keys)
    
    def test_create_closeout_fixtures_custom_items(self):
        """Test closeout fixtures with custom template items"""
        custom_items = [
            {'key': 'gas_test', 'label': 'Gas testing completed', 'required': True},
            {'key': 'isolation_removed', 'label': 'Isolation removed', 'required': True}
        ]
        
        fixtures = create_ptw_closeout_fixtures(template_items=custom_items)
        
        template = fixtures['template']
        self.assertEqual(len(template.items), 2)
        self.assertEqual(template.items[0]['key'], 'gas_test')
        self.assertEqual(template.items[1]['key'], 'isolation_removed')
    
    def test_create_closeout_with_existing_permit(self):
        """Test creating closeout fixtures with existing permit"""
        # First create permit fixtures
        permit_fixtures = create_ptw_permit_fixtures(
            permit_type_name='Electrical',
            permit_type_category='electrical'
        )
        
        # Then create closeout for that permit
        closeout_fixtures = create_ptw_closeout_fixtures(
            permit=permit_fixtures['permit']
        )
        
        # Verify they're linked
        self.assertEqual(closeout_fixtures['permit'], permit_fixtures['permit'])
        self.assertEqual(closeout_fixtures['closeout'].permit, permit_fixtures['permit'])
    
    def test_reduced_test_setup_example(self):
        """Example showing how helpers reduce test setup code"""
        # Old way (lots of boilerplate):
        # - Create tenant, project, user, induction
        # - Create permit type
        # - Create permit
        # - Create closeout template
        # - Create closeout record
        
        # New way (one line):
        fixtures = create_ptw_closeout_fixtures()
        
        # Ready to test closeout functionality
        closeout = fixtures['closeout']
        permit = fixtures['permit']
        
        # Test closeout validation
        missing_items = closeout.get_missing_required_items()
        self.assertEqual(len(missing_items), 3)  # 3 required items by default
        
        # Test completing checklist
        closeout.checklist = {
            'tools_removed': {'done': True},
            'area_cleaned': {'done': True},
            'safety_check': {'done': True}
        }
        closeout.save()
        
        self.assertTrue(closeout.is_complete())
        self.assertEqual(len(closeout.get_missing_required_items()), 0)