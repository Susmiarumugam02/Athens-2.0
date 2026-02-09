"""Tests for Permit Toolbox Talk endpoints."""
from datetime import date

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from ptw.models import PermitWorker
from ptw.serializers import PermitSerializer
from tests_common.fixtures import create_ptw_permit_fixtures
from worker.models import Worker


class PermitToolboxTalkTests(TestCase):
    def setUp(self):
        fixtures = create_ptw_permit_fixtures()
        self.permit = fixtures['permit']
        self.user = fixtures['user']
        self.project = fixtures['project']
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.worker = Worker.objects.create(
            name='Test',
            surname='Worker',
            father_or_spouse_name='Parent',
            date_of_birth=date(1990, 1, 1),
            gender='Male',
            education_level='High School Diploma / Equivalent',
            date_of_joining=date.today(),
            designation='Safety Officer',
            category='Skilled',
            employment_type='temporary',
            department='EHS (Environment, Health & Safety)',
            phone_number='9000000001',
            present_address='Test Address',
            permanent_address='Test Address',
            aadhaar='123456789012',
            mark_of_identification='Mole on hand',
            project=self.project,
            created_by=self.user
        )
        self.permit_worker = PermitWorker.objects.create(
            permit=self.permit,
            worker=self.worker,
            assigned_by=self.user
        )

    def test_tbt_create_and_get(self):
        payload = {
            'title': 'Toolbox Talk - Hot Work',
            'conducted_at': timezone.now().isoformat(),
            'notes': 'General safety briefing.'
        }
        response = self.client.post(
            f'/api/v1/ptw/permits/{self.permit.id}/update_tbt/',
            data=payload,
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['tbt']['title'], payload['title'])

        get_response = self.client.get(f'/api/v1/ptw/permits/{self.permit.id}/tbt/')
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(get_response.data['attendance']), 1)
        self.assertEqual(get_response.data['attendance'][0]['permit_worker'], self.permit_worker.id)

    def test_tbt_ack_updates_attendance(self):
        self.client.post(
            f'/api/v1/ptw/permits/{self.permit.id}/update_tbt/',
            data={'title': 'Toolbox Talk'},
            format='json'
        )

        ack_response = self.client.post(
            f'/api/v1/ptw/permits/{self.permit.id}/tbt_ack/',
            data={'permit_worker_id': self.permit_worker.id, 'acknowledged': True},
            format='json'
        )

        self.assertEqual(ack_response.status_code, status.HTTP_200_OK)
        self.assertTrue(ack_response.data['acknowledged'])
        self.assertIsNotNone(ack_response.data['acknowledged_at'])

    def test_tbt_scoping_blocks_cross_project(self):
        other_fixtures = create_ptw_permit_fixtures(username='otheruser')
        other_user = other_fixtures['user']
        other_client = APIClient()
        other_client.force_authenticate(user=other_user)

        response = other_client.get(f'/api/v1/ptw/permits/{self.permit.id}/tbt/')
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_permit_serializer_includes_tbt(self):
        self.client.post(
            f'/api/v1/ptw/permits/{self.permit.id}/update_tbt/',
            data={'title': 'Toolbox Talk', 'notes': 'Notes'},
            format='json'
        )
        self.client.post(
            f'/api/v1/ptw/permits/{self.permit.id}/tbt_ack/',
            data={'permit_worker_id': self.permit_worker.id, 'acknowledged': True},
            format='json'
        )

        serializer = PermitSerializer(self.permit)
        data = serializer.data

        self.assertIn('toolbox_talk', data)
        self.assertIn('toolbox_talk_attendance', data)
        self.assertEqual(data['toolbox_talk']['title'], 'Toolbox Talk')
        self.assertTrue(len(data['toolbox_talk_attendance']) >= 1)
