from dataclasses import dataclass
from typing import Optional, Tuple

from django.db import IntegrityError, transaction
from django.utils import timezone

from authentication.usertype_utils import is_master_type
from inductiontraining.models import InductionTraining, InductionAttendance
from jobtraining.models import JobTraining, JobTrainingAttendance
from mom.models import Mom
from tbt.models import ToolboxTalk

from .models import AttendanceEvent


CHECK_IN_ONLY_MODULES = {
    AttendanceEvent.Module.TBT,
    AttendanceEvent.Module.TRAINING,
    AttendanceEvent.Module.MOM,
}


class AttendanceEventError(Exception):
    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


@dataclass
class TrainingContext:
    training_type: str
    training: object


def create_attendance_event(tenant_id, user, data) -> Tuple[str, Optional[AttendanceEvent], Optional[str]]:
    if not tenant_id and not is_master_type(user.user_type):
        return "rejected", None, "missing_tenant"

    client_event_id = data.get("client_event_id")
    if not client_event_id:
        return "rejected", None, "missing_client_event_id"

    existing = AttendanceEvent.objects.filter(
        athens_tenant_id=tenant_id,
        client_event_id=client_event_id,
    ).first()
    if existing:
        return "duplicate", existing, None

    event_type = data.get("event_type")
    module = data.get("module")

    try:
        _validate_module_event_type(module, event_type)
        training_ctx = _validate_module_context(module, data, user)
    except AttendanceEventError as exc:
        return "rejected", None, exc.reason

    payload = data.get("payload") or None

    try:
        with transaction.atomic():
            event = AttendanceEvent.objects.create(
                athens_tenant_id=tenant_id,
                user=user,
                module=module,
                module_ref_id=_clean_module_ref_id(data.get("module_ref_id")),
                event_type=event_type,
                occurred_at=data.get("occurred_at") or timezone.now(),
                client_event_id=client_event_id,
                device_id=data.get("device_id"),
                offline=bool(data.get("offline")),
                location=data.get("location") or None,
                method=data.get("method"),
                payload=payload,
            )
            if training_ctx:
                _apply_training_attendance(training_ctx, user)
    except IntegrityError:
        return "duplicate", None, None
    except AttendanceEventError as exc:
        return "rejected", None, exc.reason

    return "created", event, None


def _clean_module_ref_id(module_ref_id):
    if module_ref_id in (None, ""):
        return None
    return str(module_ref_id)


def _validate_module_event_type(module: str, event_type: str) -> None:
    if module in CHECK_IN_ONLY_MODULES and event_type != AttendanceEvent.EventType.CHECK_IN:
        raise AttendanceEventError("check_in_only")


def _validate_module_context(module: str, data, user) -> Optional[TrainingContext]:
    module_ref_id = data.get("module_ref_id")

    if module == AttendanceEvent.Module.TBT:
        if module_ref_id and not ToolboxTalk.objects.filter(id=module_ref_id).exists():
            raise AttendanceEventError("tbt_not_found")
        return None

    if module == AttendanceEvent.Module.MOM:
        if module_ref_id and not Mom.objects.filter(id=module_ref_id).exists():
            raise AttendanceEventError("mom_not_found")
        return None

    if module == AttendanceEvent.Module.TRAINING:
        return _validate_training_payload(data, user)

    return None


def _validate_training_payload(data, user) -> TrainingContext:
    payload = data.get("payload") or {}
    method = data.get("method")

    if method not in (AttendanceEvent.Method.QR, AttendanceEvent.Method.PIN):
        raise AttendanceEventError("training_requires_qr_or_pin")

    module_ref_id = data.get("module_ref_id")
    if not module_ref_id:
        raise AttendanceEventError("training_missing_session")

    requested_type = _resolve_training_type(payload)
    training_id = _parse_training_id(module_ref_id)

    training_type, training = _get_training_session(requested_type, training_id)
    if not training:
        raise AttendanceEventError("training_not_found")

    _validate_training_code(training, method, payload)

    return TrainingContext(training_type=training_type, training=training)


def _resolve_training_type(payload) -> str:
    training_type = payload.get("training_type") or payload.get("trainingType")
    if not training_type:
        return "UNKNOWN"

    normalized = str(training_type).strip().upper()
    if normalized in {"INDUCTION", "JOB"}:
        return normalized

    raise AttendanceEventError("invalid_training_type")


def _parse_training_id(module_ref_id) -> int:
    try:
        return int(module_ref_id)
    except (TypeError, ValueError):
        raise AttendanceEventError("invalid_training_id")


def _get_training_session(training_type: str, training_id: int):
    if training_type == "INDUCTION":
        return "INDUCTION", InductionTraining.objects.filter(id=training_id).first()
    if training_type == "JOB":
        return "JOB", JobTraining.objects.filter(id=training_id).first()

    induction = InductionTraining.objects.filter(id=training_id).first()
    job_training = JobTraining.objects.filter(id=training_id).first()

    if induction and job_training:
        raise AttendanceEventError("ambiguous_training_id")

    if induction:
        return "INDUCTION", induction
    if job_training:
        return "JOB", job_training

    return training_type, None


def _validate_training_code(training, method: str, payload) -> None:
    now = timezone.now()
    if getattr(training, "qr_expires_at", None) and training.qr_expires_at < now:
        raise AttendanceEventError("training_code_expired")

    if method == AttendanceEvent.Method.QR:
        qr_token = payload.get("qr_token")
        if not qr_token or qr_token != getattr(training, "qr_token", None):
            raise AttendanceEventError("invalid_qr_token")
        return

    if method == AttendanceEvent.Method.PIN:
        pin = payload.get("pin")
        if not pin or str(pin) != str(getattr(training, "join_code", "")):
            raise AttendanceEventError("invalid_pin")
        return


def _apply_training_attendance(training_ctx: TrainingContext, user) -> None:
    if training_ctx.training_type == "INDUCTION":
        worker_id = -user.id
        InductionAttendance.objects.get_or_create(
            induction=training_ctx.training,
            worker_id=worker_id,
            defaults={
                "worker_name": user.get_full_name() or user.username,
                "worker_photo": "",
                "attendance_photo": "",
                "participant_type": "user",
                "match_score": 1.0,
                "status": "present",
            },
        )
        return

    if training_ctx.training_type == "JOB":
        JobTrainingAttendance.objects.update_or_create(
            job_training=training_ctx.training,
            participant_type="user",
            user_id=user.id,
            defaults={
                "status": "present",
                "attendance_photo": "",
                "match_score": 1.0,
                "user_name": user.get_full_name() or user.username,
            },
        )
        return
