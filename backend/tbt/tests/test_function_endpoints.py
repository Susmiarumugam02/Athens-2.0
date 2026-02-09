import uuid
from datetime import date, timedelta

from rest_framework.test import APITestCase
from authentication.models import Project, CustomUser
from authentication.tenant_models import AthensTenant
from tbt.views import user_list
from tests_common.request import jwt_request


class TbtFunctionEndpointTests(APITestCase):
    def setUp(self):
        super().setUp()
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

        self.tenant_id = uuid.uuid4()
        AthensTenant.objects.create(id=self.tenant_id, master_admin_id=uuid.uuid4(), is_active=True)

        self.user_a = CustomUser.objects.create_user(
            username='user_a',
            password='Password123!',
            user_type='adminuser',
            admin_type='clientuser',
            project=self.project_a,
        )
        self.user_a.athens_tenant_id = self.tenant_id
        self.user_a.save()

        self.user_b = CustomUser.objects.create_user(
            username='user_b',
            password='Password123!',
            user_type='adminuser',
            admin_type='clientuser',
            project=self.project_b,
        )
        self.user_b.athens_tenant_id = self.tenant_id
        self.user_b.save()

        self.user_a_peer = CustomUser.objects.create_user(
            username='user_a_peer',
            password='Password123!',
            user_type='adminuser',
            admin_type='clientuser',
            project=self.project_a,
        )
        self.user_a_peer.athens_tenant_id = self.tenant_id
        self.user_a_peer.save()

    def test_user_list_is_project_scoped(self):
        request = jwt_request(self.user_a, "get", "/tbt/users/list/")
        response = user_list(request)
        self.assertEqual(response.status_code, 200)
        usernames = {user['username'] for user in response.data}
        self.assertIn('user_a', usernames)
        self.assertIn('user_a_peer', usernames)
        self.assertNotIn('user_b', usernames)

    def test_user_list_requires_auth(self):
        request = jwt_request(None, "get", "/tbt/users/list/")
        response = user_list(request)
        self.assertEqual(response.status_code, 401)

    def test_user_list_filters_other_project(self):
        request = jwt_request(self.user_b, "get", "/tbt/users/list/")
        response = user_list(request)
        self.assertEqual(response.status_code, 200)
        usernames = {user['username'] for user in response.data}
        self.assertIn('user_b', usernames)
        self.assertNotIn('user_a', usernames)
