"""
Tests for PermitType resolved templates.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from authentication.models import Project
from ptw.models import PermitType, PermitTypeTemplateOverride

User = get_user_model()


class PermitTypeTemplateTests(TestCase):
    def setUp(self):
        self.project = Project.objects.create(name='Template Project', code='TPL')
        self.user = User.objects.create_user(
            username='templateuser',
            password='pass123',
            project=self.project,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_resolved_template_falls_back_when_no_template(self):
        permit_type = PermitType.objects.create(
            name='Hot Work',
            category='hot_work',
            risk_level='high',
            mandatory_ppe=['helmet', 'gloves'],
            safety_checklist=['Work area cleared'],
            control_measures=['Ventilation'],
            emergency_procedures=['Call site emergency contact'],
        )

        response = self.client.get(f'/api/v1/ptw/permit-types/{permit_type.id}/resolved-template/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('resolved_template', response.data)
        self.assertIn('resolved_prefill', response.data)
        self.assertIn('resolved_flags', response.data)
        self.assertTrue(response.data['resolved_template'].get('sections'))
        self.assertEqual(response.data['resolved_prefill']['ppe_requirements'], ['helmet', 'gloves'])
        self.assertEqual(response.data['resolved_prefill']['safety_checklist'], ['Work area cleared'])

    def test_resolved_template_merges_prefill_from_permit_type_fields(self):
        permit_type = PermitType.objects.create(
            name='Confined Space',
            category='confined_space',
            risk_level='high',
            mandatory_ppe=['respirator'],
            safety_checklist=['Entry briefing'],
            risk_factors=['Oxygen deficiency'],
        )

        response = self.client.get(f'/api/v1/ptw/permit-types/{permit_type.id}/resolved-template/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        prefill = response.data['resolved_prefill']
        self.assertIn('ppe_requirements', prefill)
        self.assertIn('safety_checklist', prefill)
        self.assertIn('risk_factors', prefill)
        self.assertEqual(prefill['ppe_requirements'], ['respirator'])
        self.assertEqual(prefill['risk_factors'], ['Oxygen deficiency'])

    def test_project_override_applies(self):
        permit_type = PermitType.objects.create(
            name='Electrical Work',
            category='electrical',
            risk_level='high',
            mandatory_ppe=['helmet'],
            project_overrides_enabled=True,
            form_template={
                'version': 1,
                'sections': [
                    {
                        'id': 'base_section',
                        'title': 'Base Section',
                        'category': 'required',
                        'fields': [
                            {'key': 'base_field', 'label': 'Base field', 'type': 'boolean', 'default': True}
                        ],
                    }
                ],
            },
        )

        PermitTypeTemplateOverride.objects.create(
            project=self.project,
            permit_type=permit_type,
            override_template={
                'sections': [
                    {
                        'id': 'override_section',
                        'title': 'Override Section',
                        'category': 'recommended',
                        'fields': [
                            {'key': 'override_field', 'label': 'Override field', 'type': 'text', 'default': 'ok'}
                        ],
                    }
                ]
            },
            override_prefill={
                'ppe_requirements': ['gloves']
            },
        )

        response = self.client.get(
            f'/api/v1/ptw/permit-types/{permit_type.id}/resolved-template/?project={self.project.id}'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        prefill = response.data['resolved_prefill']
        self.assertIn('helmet', prefill['ppe_requirements'])
        self.assertIn('gloves', prefill['ppe_requirements'])
        section_ids = [section['id'] for section in response.data['resolved_template']['sections']]
        self.assertIn('override_section', section_ids)

    def test_endpoint_project_scoping(self):
        permit_type = PermitType.objects.create(
            name='Hot Work',
            category='hot_work',
            risk_level='high',
            project_overrides_enabled=True,
        )
        other_project = Project.objects.create(name='Other Project', code='OTH')
        other_user = User.objects.create_user(
            username='otheruser',
            password='pass123',
            project=other_project,
        )
        self.client.force_authenticate(user=other_user)

        response = self.client.get(
            f'/api/v1/ptw/permit-types/{permit_type.id}/resolved-template/?project={self.project.id}'
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
