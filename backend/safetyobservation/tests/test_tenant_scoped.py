from django.contrib.auth import get_user_model
from datetime import date, timedelta
import uuid
from django.test import TestCase
from rest_framework.test import APIClient

from authentication.models import Project
from authentication.tenant_models import AthensTenant
from control_plane.models import CollaborationMembership, CollaborationProject, CollaborationSharePolicy, TenantCompany
from safetyobservation.models import SafetyObservation


class SafetyObservationTenantScopeTests(TestCase):
    databases = {'default', 'control_plane'}

    def setUp(self):
        self.client = APIClient()
        self.project_a = Project.objects.create(
            projectName='Project A',
            projectCategory=Project.CONSTRUCTION,
            capacity='100',
            location='Site A',
            nearestPoliceStation='Station A',
            nearestPoliceStationContact='000',
            nearestHospital='Hospital A',
            nearestHospitalContact='111',
            commencementDate=date.today(),
            deadlineDate=date.today() + timedelta(days=30),
        )
        self.project_b = Project.objects.create(
            projectName='Project B',
            projectCategory=Project.CONSTRUCTION,
            capacity='200',
            location='Site B',
            nearestPoliceStation='Station B',
            nearestPoliceStationContact='222',
            nearestHospital='Hospital B',
            nearestHospitalContact='333',
            commencementDate=date.today(),
            deadlineDate=date.today() + timedelta(days=60),
        )

        user_model = get_user_model()
        self.tenant_id = uuid.uuid4()
        self.user_a = user_model.objects.create_user(
            username='user_a',
            password='Password123!',
            user_type='projectadmin',
            project=self.project_a,
        )
        self.user_a.athens_tenant_id = self.tenant_id
        self.user_a.save()

        AthensTenant.objects.create(id=self.tenant_id, master_admin_id=uuid.uuid4(), is_active=True)
        TenantCompany.objects.create(id=self.tenant_id, name='tenant-a')

        self.client.force_authenticate(user=self.user_a)

        self.obs_a = SafetyObservation.objects.create(
            observationID='OBS-A',
            project=self.project_a,
            created_by=self.user_a,
        )
        self.obs_b = SafetyObservation.objects.create(
            observationID='OBS-B',
            project=self.project_b,
            created_by=self.user_a,
        )

    def test_list_is_project_scoped(self):
        response = self.client.get('/api/v1/safetyobservation/')

        self.assertEqual(response.status_code, 200)
        returned_ids = {item['observationID'] for item in response.data.get('results', response.data)}
        self.assertIn('OBS-A', returned_ids)
        self.assertNotIn('OBS-B', returned_ids)

    def test_retrieve_denies_other_project(self):
        response = self.client.get(f'/api/v1/safetyobservation/{self.obs_b.observationID}/')

        self.assertEqual(response.status_code, 404)

    def test_collaboration_read_allowed(self):
        collaboration_project = CollaborationProject.objects.create(slug='collab-1', title='Collab 1')
        CollaborationMembership.objects.create(
            collaboration_project=collaboration_project,
            tenant_id=self.tenant_id,
            role=CollaborationMembership.Role.CLIENT,
        )
        CollaborationSharePolicy.objects.create(
            collaboration_project=collaboration_project,
            domain='safetyobservation',
            allowed_actions=['READ'],
        )

        response = self.client.get(
            f'/api/v1/safetyobservation/?collaboration_project_id={collaboration_project.id}'
        )

        self.assertEqual(response.status_code, 200)

    def test_collaboration_write_denied(self):
        collaboration_project = CollaborationProject.objects.create(slug='collab-2', title='Collab 2')
        CollaborationMembership.objects.create(
            collaboration_project=collaboration_project,
            tenant_id=self.tenant_id,
            role=CollaborationMembership.Role.CLIENT,
        )
        CollaborationSharePolicy.objects.create(
            collaboration_project=collaboration_project,
            domain='safetyobservation',
            allowed_actions=['READ'],
        )

        response = self.client.post(
            f'/api/v1/safetyobservation/?collaboration_project_id={collaboration_project.id}',
            {'date': '2024-01-01', 'time': '10:00', 'reportedBy': 'Tester'},
            format='json',
        )

        self.assertEqual(response.status_code, 403)
