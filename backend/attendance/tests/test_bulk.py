import uuid
from datetime import date, timedelta

from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.test import APITestCase

from attendance.models import AttendanceEvent
from authentication.models import CustomUser, Project
from authentication.tenant_models import AthensTenant
from inductiontraining.models import InductionTraining
from tests_common.auth import api_client_with_jwt


class AttendanceEventBulkTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.project = Project.objects.create(
            projectName="Project A",
            projectCategory=Project.CONSTRUCTION,
            capacity="100",
            location="Site A",
            nearestPoliceStation="Station A",
            nearestPoliceStationContact="000",
            nearestHospital="Hospital A",
            nearestHospitalContact="111",
            commencementDate=date.today(),
            deadlineDate=date.today() + timedelta(days=30),
        )

        self.tenant_id = uuid.uuid4()
        AthensTenant.objects.create(id=self.tenant_id, master_admin_id=uuid.uuid4(), is_active=True)

        self.user = CustomUser.objects.create_user(
            username="user_a",
            password="Password123!",
            user_type="adminuser",
            admin_type="clientuser",
            project=self.project,
        )
        self.user.athens_tenant_id = self.tenant_id
        self.user.save()

        self.client = api_client_with_jwt(self.user)

    def test_bulk_creates_events(self):
        payload = [
            {
                "client_event_id": "evt-1",
                "module": "REGULAR",
                "module_ref_id": str(self.project.id),
                "event_type": "CHECK_IN",
                "occurred_at": "2025-01-01T08:00:00Z",
                "device_id": "device-1",
                "offline": True,
                "method": "SELF_CONFIRM",
                "location": {"lat": 1.23, "lng": 3.45, "accuracy": 12, "source": "gps"},
                "payload": {"note": "offline"},
            }
        ]

        response = self.client.post("/api/attendance/events/bulk/", payload, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["created"], ["evt-1"])
        self.assertEqual(AttendanceEvent.objects.count(), 1)

    def test_bulk_is_idempotent(self):
        payload = [
            {
                "client_event_id": "evt-2",
                "module": "REGULAR",
                "module_ref_id": str(self.project.id),
                "event_type": "CHECK_IN",
                "occurred_at": "2025-01-01T08:00:00Z",
                "device_id": "device-1",
                "offline": True,
                "method": "SELF_CONFIRM",
            }
        ]

        first = self.client.post("/api/attendance/events/bulk/", payload, format="json")
        second = self.client.post("/api/attendance/events/bulk/", payload, format="json")

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.data["duplicates"], ["evt-2"])
        self.assertEqual(AttendanceEvent.objects.count(), 1)

    def test_tbt_rejects_check_out(self):
        payload = [
            {
                "client_event_id": "evt-3",
                "module": "TBT",
                "module_ref_id": "1",
                "event_type": "CHECK_OUT",
                "occurred_at": "2025-01-01T08:00:00Z",
                "device_id": "device-1",
                "offline": True,
                "method": "SELF_CONFIRM",
            }
        ]

        response = self.client.post("/api/attendance/events/bulk/", payload, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["rejected"][0]["reason"], "check_in_only")

    def test_training_validates_pin(self):
        training = InductionTraining.objects.create(
            title="Induction A",
            description="",
            date=date.today(),
            conducted_by="Trainer",
            created_by=self.user,
        )
        training.join_code = "123456"
        training.qr_token = "qr-token"
        training.qr_expires_at = timezone.now() + timedelta(days=1)
        training.save()

        valid_payload = [
            {
                "client_event_id": "evt-4",
                "module": "TRAINING",
                "module_ref_id": str(training.id),
                "event_type": "CHECK_IN",
                "occurred_at": "2025-01-01T08:00:00Z",
                "device_id": "device-1",
                "offline": True,
                "method": "PIN",
                "payload": {"training_type": "INDUCTION", "pin": "123456"},
            }
        ]

        invalid_payload = [
            {
                "client_event_id": "evt-5",
                "module": "TRAINING",
                "module_ref_id": str(training.id),
                "event_type": "CHECK_IN",
                "occurred_at": "2025-01-01T08:00:00Z",
                "device_id": "device-1",
                "offline": True,
                "method": "PIN",
                "payload": {"training_type": "INDUCTION", "pin": "000000"},
            }
        ]

        qr_payload = [
            {
                "client_event_id": "evt-4-qr",
                "module": "TRAINING",
                "module_ref_id": str(training.id),
                "event_type": "CHECK_IN",
                "occurred_at": "2025-01-01T08:05:00Z",
                "device_id": "device-1",
                "offline": True,
                "method": "QR",
                "payload": {"training_type": "INDUCTION", "qr_token": "qr-token"},
            }
        ]

        valid_response = self.client.post("/api/attendance/events/bulk/", valid_payload, format="json")
        qr_response = self.client.post("/api/attendance/events/bulk/", qr_payload, format="json")
        invalid_response = self.client.post("/api/attendance/events/bulk/", invalid_payload, format="json")

        self.assertEqual(valid_response.status_code, 200)
        self.assertEqual(valid_response.data["created"], ["evt-4"])
        self.assertEqual(qr_response.data["created"], ["evt-4-qr"])
        self.assertEqual(invalid_response.data["rejected"][0]["reason"], "invalid_pin")

    def test_company_scoping_uses_tenant(self):
        other_project = Project.objects.create(
            projectName="Project B",
            projectCategory=Project.CONSTRUCTION,
            capacity="200",
            location="Site B",
            nearestPoliceStation="Station B",
            nearestPoliceStationContact="222",
            nearestHospital="Hospital B",
            nearestHospitalContact="333",
            commencementDate=date.today(),
            deadlineDate=date.today() + timedelta(days=30),
        )
        other_tenant_id = uuid.uuid4()
        AthensTenant.objects.create(id=other_tenant_id, master_admin_id=uuid.uuid4(), is_active=True)

        other_user = CustomUser.objects.create_user(
            username="user_b",
            password="Password123!",
            user_type="adminuser",
            admin_type="clientuser",
            project=other_project,
        )
        other_user.athens_tenant_id = other_tenant_id
        other_user.save()

        other_client = api_client_with_jwt(other_user)

        payload = [
            {
                "client_event_id": "evt-same",
                "module": "REGULAR",
                "module_ref_id": str(other_project.id),
                "event_type": "CHECK_IN",
                "occurred_at": "2025-01-01T08:00:00Z",
                "device_id": "device-1",
                "offline": True,
                "method": "SELF_CONFIRM",
            }
        ]

        response_a = self.client.post("/api/attendance/events/bulk/", payload, format="json")
        response_b = other_client.post("/api/attendance/events/bulk/", payload, format="json")

        self.assertEqual(response_a.status_code, 200)
        self.assertEqual(response_b.status_code, 200)
        self.assertEqual(AttendanceEvent.objects.count(), 2)

    def test_timezone_parsing(self):
        payload = [
            {
                "client_event_id": "evt-6",
                "module": "REGULAR",
                "module_ref_id": str(self.project.id),
                "event_type": "CHECK_IN",
                "occurred_at": "2025-01-01T08:00:00+05:30",
                "device_id": "device-1",
                "offline": False,
                "method": "SELF_CONFIRM",
            }
        ]

        response = self.client.post("/api/attendance/events/bulk/", payload, format="json")
        self.assertEqual(response.status_code, 200)

        event = AttendanceEvent.objects.get(client_event_id="evt-6")
        from datetime import timezone as dt_timezone
        parsed = parse_datetime(payload[0]["occurred_at"]).astimezone(dt_timezone.utc)
        self.assertEqual(event.occurred_at, parsed)
        self.assertTrue(timezone.is_aware(event.occurred_at))
