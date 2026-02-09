import uuid
from datetime import date, timedelta

from rest_framework.test import APITestCase

from authentication.models import Project, CustomUser
from authentication.tenant_models import AthensTenant
from inductiontraining.models import InductionTraining
from inductiontraining.auto_signature_views import (
    auto_signature_request,
    complete_attendance_and_request_signatures,
)
from tests_common.request import jwt_request


class InductionFunctionEndpointTests(APITestCase):
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

        self.induction = InductionTraining.objects.create(
            title='Induction A',
            description='Induction',
            date=date.today(),
            conducted_by='Trainer',
            project=self.project_a,
            created_by=self.user_a,
        )

    def test_auto_signature_denies_collaboration_write(self):
        request = jwt_request(
            self.user_a,
            "post",
            f"/induction/{self.induction.id}/auto-signature/",
            data={"signature_type": "hr", "role_name": "HR"},
            query_params={"collaboration_project_id": 1},
        )
        response = auto_signature_request(request, self.induction.id)

        self.assertEqual(response.status_code, 403)

    def test_complete_attendance_denies_other_project(self):
        request = jwt_request(
            self.user_b,
            "post",
            f"/induction/{self.induction.id}/complete-attendance/",
        )
        response = complete_attendance_and_request_signatures(request, self.induction.id)

        self.assertEqual(response.status_code, 404)

    def test_auto_signature_requires_auth(self):
        request = jwt_request(
            None,
            "post",
            f"/induction/{self.induction.id}/auto-signature/",
            data={"signature_type": "hr", "role_name": "HR"},
        )
        response = auto_signature_request(request, self.induction.id)
        self.assertEqual(response.status_code, 401)

    def test_auto_signature_allows_correct_project(self):
        request = jwt_request(
            self.user_a,
            "post",
            f"/induction/{self.induction.id}/auto-signature/",
            data={"signature_type": "hr", "role_name": "HR"},
        )
        response = auto_signature_request(request, self.induction.id)
        self.assertEqual(response.status_code, 200)

    def test_complete_attendance_requires_auth(self):
        request = jwt_request(
            None,
            "post",
            f"/induction/{self.induction.id}/complete-attendance/",
        )
        response = complete_attendance_and_request_signatures(request, self.induction.id)
        self.assertEqual(response.status_code, 401)

    def test_complete_attendance_allows_correct_project(self):
        request = jwt_request(
            self.user_a,
            "post",
            f"/induction/{self.induction.id}/complete-attendance/",
        )
        response = complete_attendance_and_request_signatures(request, self.induction.id)
        self.assertEqual(response.status_code, 200)
