from django.test import TestCase
from rest_framework import serializers
from tests_common.fixtures import create_ptw_permit_fixtures
from ptw.validators import validate_permit_requirements


class SafetyChecklistValidationTests(TestCase):
    def setUp(self):
        fixtures = create_ptw_permit_fixtures()
        self.permit = fixtures['permit']
        self.permit_type = fixtures['permit_type']

    def test_checklist_list_missing_item(self):
        self.permit_type.safety_checklist = ['A', 'B']
        self.permit_type.save(update_fields=['safety_checklist'])
        self.permit.safety_checklist = {'A': True}
        self.permit.save(update_fields=['safety_checklist'])

        with self.assertRaises(serializers.ValidationError) as ctx:
            validate_permit_requirements(self.permit, action='approve')

        self.assertIn('B', str(ctx.exception.detail['safety_checklist']))

    def test_checklist_list_of_dicts_missing_item(self):
        self.permit_type.safety_checklist = [
            {'item': 'A', 'required': True},
            {'item': 'B', 'required': True}
        ]
        self.permit_type.save(update_fields=['safety_checklist'])
        self.permit.safety_checklist = ['A']
        self.permit.save(update_fields=['safety_checklist'])

        with self.assertRaises(serializers.ValidationError) as ctx:
            validate_permit_requirements(self.permit, action='approve')

        self.assertIn('B', str(ctx.exception.detail['safety_checklist']))

    def test_checklist_list_completed(self):
        self.permit_type.safety_checklist = ['A']
        self.permit_type.save(update_fields=['safety_checklist'])
        self.permit.safety_checklist = ['A']
        self.permit.save(update_fields=['safety_checklist'])

        validate_permit_requirements(self.permit, action='approve')
