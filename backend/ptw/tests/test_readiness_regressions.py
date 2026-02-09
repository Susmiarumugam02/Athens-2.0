"""
Regression tests for readiness endpoint edge cases.
"""
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from tests_common.fixtures import create_ptw_permit_fixtures


class PermitReadinessRegressionsTestCase(TestCase):
    def setUp(self):
        fixtures = create_ptw_permit_fixtures()
        self.permit = fixtures['permit']
        self.user = fixtures['user']
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_readiness_handles_checklist_list(self):
        self.permit.permit_type.safety_checklist = ['item1', 'item2']
        self.permit.permit_type.save(update_fields=['safety_checklist'])
        self.permit.safety_checklist = ['item1']
        self.permit.save(update_fields=['safety_checklist'])

        response = self.client.get(f'/api/v1/ptw/permits/{self.permit.id}/readiness/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('checklist', response.data['details'])
        self.assertIn('can_verify', response.data['readiness'])

    def test_readiness_handles_missing_closeout_record(self):
        if hasattr(self.permit, 'closeout'):
            self.permit.closeout.delete()

        response = self.client.get(f'/api/v1/ptw/permits/{self.permit.id}/readiness/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('closeout', response.data['details'])

    def test_readiness_handles_isolation_not_required(self):
        self.permit.permit_type.requires_structured_isolation = False
        self.permit.permit_type.save(update_fields=['requires_structured_isolation'])

        response = self.client.get(f'/api/v1/ptw/permits/{self.permit.id}/readiness/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['details']['isolation']['required'])
        self.assertIn('can_complete', response.data['readiness'])
