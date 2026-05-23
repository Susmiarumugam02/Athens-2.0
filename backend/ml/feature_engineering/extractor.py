"""
Athens ML — Feature Engineering Pipeline
Extracts production-grade ML features from all Athens modules.
Tenant-isolated. All features are numeric (ML-ready).
"""
import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Avg, Sum, Q, F

logger = logging.getLogger('athens.ml')


def _safe(val, default=0.0):
    """Return val if not None, else default."""
    return float(val) if val is not None else float(default)


def _project_tenant_filter(tenant_id: int) -> dict:
    """Tenant isolation for models that scope through authentication.Project."""
    return {'project__athens_tenant_id': tenant_id}


# ─── Worker Features ──────────────────────────────────────────────────────────

def extract_worker_features(worker_id: int, tenant_id: int, days: int = 90) -> dict:
    """
    Extract ML features for a single worker.
    Returns a flat dict of numeric features.
    """
    features = {
        'worker_id': worker_id,
        'tenant_id': tenant_id,
        # Attendance features
        'attendance_rate_30d': 0.0,
        'absent_days_30d': 0,
        'late_days_30d': 0,
        'overtime_hours_7d': 0.0,
        'overtime_hours_30d': 0.0,
        'consecutive_work_days': 0,
        'avg_daily_hours_30d': 0.0,
        # Safety features
        'unsafe_acts_90d': 0,
        'incidents_involved_1yr': 0,
        'near_misses_90d': 0,
        # Training features
        'training_compliance_pct': 100.0,
        'days_since_last_training': 0,
        'overdue_trainings': 0,
        # PTW features
        'permits_created_30d': 0,
        'permits_rejected_30d': 0,
        'permit_rejection_rate': 0.0,
        # Derived risk features
        'fatigue_score': 0.0,
        'behavior_risk_score': 0.0,
        'training_gap_score': 0.0,
    }

    now = timezone.now()
    cutoff_30 = now - timedelta(days=30)
    cutoff_90 = now - timedelta(days=days)
    cutoff_1yr = now - timedelta(days=365)

    # ── Attendance ──
    try:
        from workforce.models import Attendance, Employee
        emp = Employee.objects.filter(
            athens_tenant_id=tenant_id
        ).filter(
            Q(id=worker_id) | Q(employee_code=str(worker_id))
        ).first()

        if emp:
            att_30 = Attendance.objects.filter(employee=emp, date__gte=cutoff_30.date())
            total_days = att_30.count() or 1
            present = att_30.filter(status='P').count()
            absent = att_30.filter(status='A').count()
            late = att_30.filter(status='L').count()

            features['attendance_rate_30d'] = round(present / total_days * 100, 2)
            features['absent_days_30d'] = absent
            features['late_days_30d'] = late

            ot_7d = Attendance.objects.filter(
                employee=emp, date__gte=(now - timedelta(days=7)).date()
            ).aggregate(total=Sum('overtime_hours'))['total']
            ot_30d = att_30.aggregate(total=Sum('overtime_hours'))['total']
            avg_hrs = att_30.aggregate(avg=Avg('total_hours'))['avg']

            features['overtime_hours_7d'] = _safe(ot_7d)
            features['overtime_hours_30d'] = _safe(ot_30d)
            features['avg_daily_hours_30d'] = _safe(avg_hrs)

            # Consecutive work days (count back from today)
            consecutive = 0
            check_date = now.date()
            for _ in range(30):
                rec = Attendance.objects.filter(employee=emp, date=check_date, status='P').first()
                if rec:
                    consecutive += 1
                    check_date -= timedelta(days=1)
                else:
                    break
            features['consecutive_work_days'] = consecutive
    except Exception as e:
        logger.debug(f'[ML Features] Worker attendance error: {e}')

    # ── Safety Observations ──
    try:
        from safetyobservation.models import SafetyObservation
        unsafe = SafetyObservation.objects.filter(
            athens_tenant_id=tenant_id,
            created_at__gte=cutoff_90
        ).filter(
            Q(created_by_id=worker_id) | Q(reportedBy__icontains=str(worker_id))
        ).filter(typeOfObservation__in=['unsafe_act', 'at_risk_behavior', 'ppe_non_compliance', 'violation_procedure']).count()
        features['unsafe_acts_90d'] = unsafe
    except Exception as e:
        logger.debug(f'[ML Features] Safety obs error: {e}')

    # ── Incidents ──
    try:
        from incidentmanagement.models import Incident
        incidents = Incident.objects.filter(
            project__athens_tenant_id=tenant_id,
            reported_by_id=worker_id,
            date_time_incident__gte=cutoff_1yr
        ).count()
        features['incidents_involved_1yr'] = incidents
    except Exception as e:
        logger.debug(f'[ML Features] Incident error: {e}')

    # ── Training ──
    try:
        from inductiontraining.models import InductionTraining, InductionAttendance
        attended = InductionAttendance.objects.filter(
            user_id=worker_id,
            created_at__gte=cutoff_90
        ).count()
        last_training = InductionAttendance.objects.filter(
            user_id=worker_id
        ).order_by('-created_at').first()
        if last_training:
            days_since = (now - last_training.created_at).days
            features['days_since_last_training'] = days_since
        features['training_compliance_pct'] = min(100.0, attended * 20.0)  # normalize
    except Exception as e:
        logger.debug(f'[ML Features] Training error: {e}')

    # ── PTW ──
    try:
        from ptw.models import Permit
        permits_30 = Permit.objects.filter(
            **_project_tenant_filter(tenant_id),
            created_by_id=worker_id,
            created_at__gte=cutoff_30
        )
        total_p = permits_30.count()
        rejected_p = permits_30.filter(status='rejected').count()
        features['permits_created_30d'] = total_p
        features['permits_rejected_30d'] = rejected_p
        features['permit_rejection_rate'] = round(rejected_p / max(total_p, 1) * 100, 2)
    except Exception as e:
        logger.debug(f'[ML Features] PTW error: {e}')

    # ── Derived Scores ──
    # Fatigue: overtime + consecutive days + low attendance
    ot_score = min(features['overtime_hours_7d'] / 20.0, 1.0) * 40
    consec_score = min(features['consecutive_work_days'] / 7.0, 1.0) * 30
    absent_score = min(features['absent_days_30d'] / 10.0, 1.0) * 30
    features['fatigue_score'] = round(ot_score + consec_score + absent_score, 2)

    # Behavior risk: unsafe acts + incidents + rejections
    unsafe_score = min(features['unsafe_acts_90d'] / 5.0, 1.0) * 50
    incident_score = min(features['incidents_involved_1yr'] / 3.0, 1.0) * 30
    rejection_score = min(features['permit_rejection_rate'] / 50.0, 1.0) * 20
    features['behavior_risk_score'] = round(unsafe_score + incident_score + rejection_score, 2)

    # Training gap: days since training + overdue
    training_score = min(features['days_since_last_training'] / 180.0, 1.0) * 60
    compliance_gap = max(0, 100 - features['training_compliance_pct']) / 100.0 * 40
    features['training_gap_score'] = round(training_score + compliance_gap, 2)

    return features


# ─── Contractor Features ──────────────────────────────────────────────────────

def extract_contractor_features(contractor_name: str, tenant_id: int, days: int = 90) -> dict:
    """Extract ML features for a contractor company."""
    features = {
        'contractor_name': contractor_name,
        'tenant_id': tenant_id,
        'total_permits_90d': 0,
        'rejected_permits_90d': 0,
        'permit_rejection_rate': 0.0,
        'active_permits': 0,
        'high_risk_permits': 0,
        'incidents_90d': 0,
        'unsafe_acts_90d': 0,
        'overdue_actions_90d': 0,
        'training_compliance_pct': 100.0,
        'audit_findings_90d': 0,
        'avg_risk_score': 0.0,
        'violation_rate': 0.0,
    }

    now = timezone.now()
    cutoff = now - timedelta(days=days)

    try:
        from ptw.models import Permit
        # Match contractor by receiver designation or description
        permits = Permit.objects.filter(
            **_project_tenant_filter(tenant_id),
            created_at__gte=cutoff,
            receiver_designation__icontains=contractor_name[:20]
        )
        total = permits.count()
        rejected = permits.filter(status='rejected').count()
        active = permits.filter(status__in=['active', 'approved']).count()
        high_risk = permits.filter(risk_level__in=['high', 'extreme']).count()
        avg_risk = permits.aggregate(avg=Avg('risk_score'))['avg']

        features['total_permits_90d'] = total
        features['rejected_permits_90d'] = rejected
        features['permit_rejection_rate'] = round(rejected / max(total, 1) * 100, 2)
        features['active_permits'] = active
        features['high_risk_permits'] = high_risk
        features['avg_risk_score'] = _safe(avg_risk)
    except Exception as e:
        logger.debug(f'[ML Features] Contractor PTW error: {e}')

    try:
        from incidentmanagement.models import Incident
        incidents = Incident.objects.filter(
            project__athens_tenant_id=tenant_id,
            date_time_incident__gte=cutoff,
            department__icontains=contractor_name[:20]
        ).count()
        features['incidents_90d'] = incidents
    except Exception as e:
        logger.debug(f'[ML Features] Contractor incident error: {e}')

    # Violation rate composite
    total_ops = max(features['total_permits_90d'], 1)
    violations = features['rejected_permits_90d'] + features['incidents_90d']
    features['violation_rate'] = round(violations / total_ops * 100, 2)

    return features


# ─── Permit Features ──────────────────────────────────────────────────────────

def extract_permit_features(permit_id: int, tenant_id: int) -> dict:
    """Extract ML features for a single permit."""
    features = {
        'permit_id': permit_id,
        'tenant_id': tenant_id,
        'permit_type_risk': 0,
        'probability': 1,
        'severity': 1,
        'risk_score': 1,
        'is_hot_work': 0,
        'is_confined_space': 0,
        'is_height_work': 0,
        'is_electrical': 0,
        'is_excavation': 0,
        'requires_gas_testing': 0,
        'requires_isolation': 0,
        'has_gas_readings': 0,
        'gas_readings_safe': 0,
        'worker_count': 0,
        'duration_hours': 0.0,
        'is_night_work': 0,
        'location_risk': 0,
        'simultaneous_permits_same_location': 0,
        'creator_incident_history': 0,
        'weather_risk_score': 0.0,
        'checklist_completion_pct': 0.0,
        'ppe_count': 0,
        'has_isolation_details': 0,
    }

    try:
        from ptw.models import Permit
        permit = Permit.objects.select_related('permit_type', 'project').prefetch_related(
            'gas_readings', 'assigned_workers'
        ).get(id=permit_id, **_project_tenant_filter(tenant_id))

        pt = permit.permit_type
        features['probability'] = permit.probability
        features['severity'] = permit.severity
        features['risk_score'] = permit.risk_score
        features['is_hot_work'] = int(pt.category == 'hot_work')
        features['is_confined_space'] = int(pt.category == 'confined_space')
        features['is_height_work'] = int(pt.category == 'height')
        features['is_electrical'] = int(pt.category == 'electrical')
        features['is_excavation'] = int(pt.category == 'excavation')
        features['requires_gas_testing'] = int(pt.requires_gas_testing)
        features['requires_isolation'] = int(pt.requires_isolation or permit.requires_isolation)
        features['has_isolation_details'] = int(bool(permit.isolation_details.strip()))

        gas_readings = permit.gas_readings.all()
        features['has_gas_readings'] = int(gas_readings.exists())
        features['gas_readings_safe'] = int(gas_readings.filter(status='safe').exists())

        features['worker_count'] = permit.assigned_workers.count()
        features['duration_hours'] = permit.get_duration_hours()
        features['is_night_work'] = int(permit.work_nature == 'night')
        features['ppe_count'] = len(permit.ppe_requirements or [])

        # Checklist completion
        checklist = permit.safety_checklist or {}
        if checklist:
            completed = sum(1 for v in checklist.values() if v)
            features['checklist_completion_pct'] = round(completed / len(checklist) * 100, 2)

        # Simultaneous permits at same location
        simultaneous = Permit.objects.filter(
            **_project_tenant_filter(tenant_id),
            location__icontains=permit.location[:30],
            status__in=['active', 'approved'],
        ).exclude(id=permit_id).count()
        features['simultaneous_permits_same_location'] = simultaneous

        # Creator incident history
        creator_incidents = 0
        try:
            from incidentmanagement.models import Incident
            creator_incidents = Incident.objects.filter(
                project__athens_tenant_id=tenant_id,
                reported_by=permit.created_by,
                date_time_incident__gte=timezone.now() - timedelta(days=365)
            ).count()
        except Exception:
            pass
        features['creator_incident_history'] = creator_incidents

        # Permit type risk level mapping
        risk_map = {'low': 1, 'medium': 2, 'high': 3, 'extreme': 4}
        features['permit_type_risk'] = risk_map.get(pt.risk_level, 1)

    except Exception as e:
        logger.debug(f'[ML Features] Permit features error: {e}')

    return features


# ─── Project Features ─────────────────────────────────────────────────────────

def extract_project_features(project_id: int, tenant_id: int, days: int = 30) -> dict:
    """Extract ML features for a project."""
    features = {
        'project_id': project_id,
        'tenant_id': tenant_id,
        'active_permits': 0,
        'high_risk_permits': 0,
        'pending_approvals': 0,
        'incidents_30d': 0,
        'unsafe_acts_30d': 0,
        'overdue_permits': 0,
        'worker_count': 0,
        'avg_permit_risk_score': 0.0,
        'permit_rejection_rate': 0.0,
        'training_compliance_pct': 100.0,
        'simultaneous_hot_confined': 0,
    }

    now = timezone.now()
    cutoff = now - timedelta(days=days)

    try:
        from ptw.models import Permit
        permits = Permit.objects.filter(project_id=project_id, **_project_tenant_filter(tenant_id))
        active = permits.filter(status__in=['active', 'approved'])
        features['active_permits'] = active.count()
        features['high_risk_permits'] = active.filter(risk_level__in=['high', 'extreme']).count()
        features['pending_approvals'] = permits.filter(
            status__in=['submitted', 'under_review']
        ).count()
        features['overdue_permits'] = active.filter(planned_end_time__lt=now).count()

        recent = permits.filter(created_at__gte=cutoff)
        total_r = recent.count()
        rejected_r = recent.filter(status='rejected').count()
        avg_risk = active.aggregate(avg=Avg('risk_score'))['avg']

        features['permit_rejection_rate'] = round(rejected_r / max(total_r, 1) * 100, 2)
        features['avg_permit_risk_score'] = _safe(avg_risk)

        # Simultaneous hot work + confined space
        hot = active.filter(permit_type__category='hot_work').count()
        confined = active.filter(permit_type__category='confined_space').count()
        features['simultaneous_hot_confined'] = int(hot > 0 and confined > 0)
    except Exception as e:
        logger.debug(f'[ML Features] Project PTW error: {e}')

    try:
        from incidentmanagement.models import Incident
        features['incidents_30d'] = Incident.objects.filter(
            project__athens_tenant_id=tenant_id,
            project_id=project_id,
            date_time_incident__gte=cutoff
        ).count()
    except Exception as e:
        logger.debug(f'[ML Features] Project incident error: {e}')

    try:
        from safetyobservation.models import SafetyObservation
        features['unsafe_acts_30d'] = SafetyObservation.objects.filter(
            athens_tenant_id=tenant_id,
            project_id=project_id,
            created_at__gte=cutoff,
            typeOfObservation__in=['unsafe_act', 'at_risk_behavior', 'ppe_non_compliance', 'violation_procedure'],
        ).count()
    except Exception as e:
        logger.debug(f'[ML Features] Project safety observation error: {e}')

    return features


# ─── Bulk Feature Extraction ──────────────────────────────────────────────────

def build_incident_training_dataset(tenant_id: int, days: int = 365) -> list[dict]:
    """
    Build labeled training dataset for incident prediction.
    Each row = one permit with features + label (did incident occur within 7 days?).
    """
    rows = []
    now = timezone.now()
    cutoff = now - timedelta(days=days)

    try:
        from ptw.models import Permit
        from incidentmanagement.models import Incident

        permits = Permit.objects.filter(
            **_project_tenant_filter(tenant_id),
            created_at__gte=cutoff,
            status__in=['completed', 'cancelled', 'expired', 'active', 'approved']
        ).select_related('permit_type').order_by('-created_at')[:2000]

        for permit in permits:
            features = extract_permit_features(permit.id, tenant_id)

            # Label: did an incident occur at same location within 7 days of permit?
            incident_occurred = Incident.objects.filter(
                project__athens_tenant_id=tenant_id,
                project_id=permit.project_id,
                location__icontains=permit.location[:20],
                date_time_incident__gte=permit.created_at,
                date_time_incident__lte=permit.created_at + timedelta(days=7),
            ).exists()

            features['label'] = int(incident_occurred)
            features['risk_level_encoded'] = {
                'low': 0, 'medium': 1, 'high': 2, 'extreme': 3
            }.get(permit.risk_level, 0)
            rows.append(features)

    except Exception as e:
        logger.error(f'[ML Dataset] Build error: {e}')

    return rows


def build_worker_risk_dataset(tenant_id: int) -> list[dict]:
    """Build labeled dataset for worker risk model."""
    rows = []
    try:
        from workforce.models import Employee
        employees = Employee.objects.filter(
            athens_tenant_id=tenant_id, status='active'
        )[:500]

        for emp in employees:
            features = extract_worker_features(emp.id, tenant_id)
            # Label: high risk if fatigue > 60 or behavior_risk > 50
            label = int(
                features['fatigue_score'] > 60 or
                features['behavior_risk_score'] > 50 or
                features['unsafe_acts_90d'] >= 3
            )
            features['label'] = label
            rows.append(features)
    except Exception as e:
        logger.error(f'[ML Dataset] Worker risk error: {e}')

    return rows
