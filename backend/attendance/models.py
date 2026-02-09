import uuid

from django.conf import settings
from django.db import models


class AttendanceEvent(models.Model):
    class Module(models.TextChoices):
        REGULAR = "REGULAR", "Regular"
        TBT = "TBT", "Toolbox Talk"
        TRAINING = "TRAINING", "Training"
        MOM = "MOM", "MOM"

    class EventType(models.TextChoices):
        CHECK_IN = "CHECK_IN", "Check In"
        CHECK_OUT = "CHECK_OUT", "Check Out"

    class Method(models.TextChoices):
        FACE = "FACE", "Face"
        QR = "QR", "QR"
        PIN = "PIN", "PIN"
        SELF_CONFIRM = "SELF_CONFIRM", "Self Confirm"
        HOST = "HOST", "Host"
        MANUAL = "MANUAL", "Manual"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    athens_tenant_id = models.UUIDField(null=True, blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="attendance_events",
    )
    module = models.CharField(max_length=20, choices=Module.choices)
    module_ref_id = models.CharField(max_length=64, null=True, blank=True)
    event_type = models.CharField(max_length=20, choices=EventType.choices)
    occurred_at = models.DateTimeField()
    received_at = models.DateTimeField(auto_now_add=True)
    client_event_id = models.CharField(max_length=100)
    device_id = models.CharField(max_length=100, null=True, blank=True)
    offline = models.BooleanField(default=False)
    location = models.JSONField(null=True, blank=True)
    method = models.CharField(max_length=20, choices=Method.choices)
    payload = models.JSONField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["athens_tenant_id", "user", "occurred_at"], name="att_evt_user_time_idx"),
            models.Index(fields=["athens_tenant_id", "module", "module_ref_id", "occurred_at"], name="att_evt_mod_time_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["athens_tenant_id", "client_event_id"],
                name="attendance_event_tenant_client_event_unique",
            )
        ]

    def __str__(self):
        return f"{self.module} {self.event_type} {self.user_id} {self.occurred_at}"

    @property
    def is_offline(self):
        return self.offline
