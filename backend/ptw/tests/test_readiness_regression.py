"""
Regression tests for readiness endpoint fixes
"""
from django.test import TestCase
from django.utils import timezone
from tests_common import create_ptw_permit_fixtures
from ptw.readiness import get_permit_readiness


class ReadinessRegressionTest(TestCase):
    """Test readiness endpoint handles edge cases without 500 errors"""
    
    def setUp(self):
        self.fixtures = create_ptw_permit_fixtures()
        self.permit = self.fixtures['permit']
    
    def test_readiness_handles_list_safety_checklist(self):
        """Test readiness doesn't crash when permit.safety_checklist is a list"""
        # Set safety_checklist as list (the bug scenario)
        self.permit.safety_checklist = ['item1', 'item2', 'item3']
        self.permit.save()
        
        # This should not raise AttributeError: 'list' object has no attribute 'get'
        try:
            readiness_data = get_permit_readiness(self.permit)
            self.assertIsInstance(readiness_data, dict)
            self.assertIn('details', readiness_data)
            self.assertIn('checklist', readiness_data['details'])
        except AttributeError as e:
            if "'list' object has no attribute 'get'" in str(e):
                self.fail("Readiness crashed with list safety_checklist bug")
            raise
    
    def test_readiness_handles_dict_safety_checklist(self):
        """Test readiness works normally with dict safety_checklist"""
        # Set safety_checklist as dict (normal scenario)
        self.permit.safety_checklist = {'item1': True, 'item2': False, 'item3': True}
        self.permit.save()
        
        readiness_data = get_permit_readiness(self.permit)
        self.assertIsInstance(readiness_data, dict)
        self.assertIn('details', readiness_data)
        self.assertIn('checklist', readiness_data['details'])
    
    def test_readiness_handles_empty_safety_checklist(self):
        """Test readiness handles None/empty safety_checklist"""
        # Set safety_checklist as None
        self.permit.safety_checklist = None
        self.permit.save()
        
        readiness_data = get_permit_readiness(self.permit)
        self.assertIsInstance(readiness_data, dict)
        
        # Set safety_checklist as empty dict
        self.permit.safety_checklist = {}
        self.permit.save()
        
        readiness_data = get_permit_readiness(self.permit)
        self.assertIsInstance(readiness_data, dict)
    
    def test_readiness_handles_missing_closeout(self):
        """Test readiness handles permits without closeout records"""
        # Ensure no closeout exists
        if hasattr(self.permit, 'closeout'):
            self.permit.closeout.delete()
        
        readiness_data = get_permit_readiness(self.permit)
        self.assertIsInstance(readiness_data, dict)
        self.assertIn('details', readiness_data)
        self.assertIn('closeout', readiness_data['details'])
    
    def test_readiness_returns_consistent_structure(self):
        """Test readiness always returns expected structure"""
        readiness_data = get_permit_readiness(self.permit)
        
        # Check top-level structure
        required_keys = ['permit_id', 'permit_number', 'status', 'requires', 'readiness', 'missing', 'details']
        for key in required_keys:
            self.assertIn(key, readiness_data, f"Missing key: {key}")
        
        # Check details structure
        details_keys = ['gas', 'isolation', 'ppe', 'checklist', 'closeout']
        for key in details_keys:
            self.assertIn(key, readiness_data['details'], f"Missing details key: {key}")
        
        # Check readiness structure
        readiness_keys = ['can_verify', 'can_approve', 'can_activate', 'can_complete']
        for key in readiness_keys:
            self.assertIn(key, readiness_data['readiness'], f"Missing readiness key: {key}")