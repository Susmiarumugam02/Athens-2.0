"""
Reporting utilities for PTW compliance reports (PR16)
"""
from django.utils import timezone
from django.db.models import Count, Q
from datetime import timedelta


def get_report_summary(queryset, date_from=None, date_to=None):
    """
    Generate summary report for permits
    
    Args:
        queryset: Filtered permit queryset
        date_from: Start date
        date_to: End date
    
    Returns:
        dict with summary statistics
    """
    now = timezone.now()
    
    # Default date range: last 30 days
    if not date_from:
        date_from = now - timedelta(days=30)
    if not date_to:
        date_to = now
    
    # Filter by date range
    queryset = queryset.filter(created_at__gte=date_from, created_at__lte=date_to)
    
    # Counts by status
    counts_by_status = dict(
        queryset.values('status').annotate(count=Count('id')).values_list('status', 'count')
    )
    
    # Overdue permits
    overdue_verification = queryset.filter(
        status='submitted',
        created_at__lt=now - timedelta(hours=24)
    ).count()
    
    overdue_approval = queryset.filter(
        status='under_review',
        created_at__lt=now - timedelta(hours=48)
    ).count()
    
    # Expiring soon (within 24 hours)
    expiring_soon = queryset.filter(
        status='active',
        planned_end_time__lte=now + timedelta(hours=24),
        planned_end_time__gt=now
    ).count()
    
    # Isolation pending
    isolation_pending = queryset.filter(
        permit_type__requires_structured_isolation=True,
        status__in=['under_review', 'approved']
    ).annotate(
        verified_count=Count('isolation_points', filter=Q(isolation_points__status='verified', isolation_points__required=True))
    ).filter(verified_count=0).count()
    
    # Closeout pending
    closeout_pending = queryset.filter(
        status='active'
    ).exclude(
        closeout__completed=True
    ).count()
    
    # Incident rate (reuse existing logic)
    total_permits = queryset.count()
    incident_rate = 0.0
    if total_permits > 0:
        try:
            from incidentmanagement.models import Incident
            permit_numbers = list(queryset.values_list('permit_number', flat=True))
            incident_count = Incident.objects.filter(work_permit_number__in=permit_numbers).count()
            incident_rate = round((incident_count / total_permits) * 100, 2)
        except:
            pass
    
    # Top permit types
    top_permit_types = list(
        queryset.values('permit_type__name').annotate(
            count=Count('id')
        ).order_by('-count')[:5].values('permit_type__name', 'count')
    )
    
    return {
        'range': {
            'from': date_from.isoformat(),
            'to': date_to.isoformat()
        },
        'counts_by_status': counts_by_status,
        'overdue': {
            'verification': overdue_verification,
            'approval': overdue_approval
        },
        'expiring_soon': expiring_soon,
        'isolation_pending': isolation_pending,
        'closeout_pending': closeout_pending,
        'incident_rate': incident_rate,
        'top_permit_types': top_permit_types
    }


def get_report_exceptions(queryset, date_from=None, date_to=None):
    """
    Get list of exception permits (overdue, pending, etc.)
    
    Args:
        queryset: Filtered permit queryset
        date_from: Start date
        date_to: End date
    
    Returns:
        dict with exception lists
    """
    now = timezone.now()
    
    # Default date range: last 30 days
    if not date_from:
        date_from = now - timedelta(days=30)
    if not date_to:
        date_to = now
    
    # Filter by date range
    queryset = queryset.filter(created_at__gte=date_from, created_at__lte=date_to)
    
    # Overdue verification
    overdue_verification = []
    for permit in queryset.filter(
        status='submitted',
        created_at__lt=now - timedelta(hours=24)
    ).select_related('permit_type', 'project')[:50]:
        age_hours = int((now - permit.created_at).total_seconds() / 3600)
        overdue_verification.append({
            'id': permit.id,
            'permit_number': permit.permit_number,
            'age_hours': age_hours,
            'status': permit.status,
            'location': permit.location,
            'permit_type': permit.permit_type.name if permit.permit_type else None
        })
    
    # Overdue approval
    overdue_approval = []
    for permit in queryset.filter(
        status='under_review',
        created_at__lt=now - timedelta(hours=48)
    ).select_related('permit_type', 'project')[:50]:
        age_hours = int((now - permit.created_at).total_seconds() / 3600)
        overdue_approval.append({
            'id': permit.id,
            'permit_number': permit.permit_number,
            'age_hours': age_hours,
            'status': permit.status,
            'location': permit.location,
            'permit_type': permit.permit_type.name if permit.permit_type else None
        })
    
    # Isolation pending
    isolation_pending = []
    for permit in queryset.filter(
        permit_type__requires_structured_isolation=True,
        status__in=['under_review', 'approved']
    ).select_related('permit_type', 'project').prefetch_related('isolation_points')[:50]:
        required_points = permit.isolation_points.filter(required=True)
        verified_points = required_points.filter(status='verified')
        if required_points.count() > 0 and verified_points.count() < required_points.count():
            isolation_pending.append({
                'id': permit.id,
                'permit_number': permit.permit_number,
                'status': permit.status,
                'location': permit.location,
                'required_points': required_points.count(),
                'verified_points': verified_points.count()
            })
    
    # Closeout pending
    closeout_pending = []
    for permit in queryset.filter(
        status='active'
    ).select_related('permit_type', 'project').prefetch_related('closeout')[:50]:
        try:
            if not permit.closeout.completed:
                closeout_pending.append({
                    'id': permit.id,
                    'permit_number': permit.permit_number,
                    'status': permit.status,
                    'location': permit.location,
                    'planned_end_time': permit.planned_end_time.isoformat() if permit.planned_end_time else None
                })
        except:
            # No closeout exists
            closeout_pending.append({
                'id': permit.id,
                'permit_number': permit.permit_number,
                'status': permit.status,
                'location': permit.location,
                'planned_end_time': permit.planned_end_time.isoformat() if permit.planned_end_time else None
            })
    
    # Expiring soon
    expiring_soon = []
    for permit in queryset.filter(
        status='active',
        planned_end_time__lte=now + timedelta(hours=24),
        planned_end_time__gt=now
    ).select_related('permit_type', 'project')[:50]:
        hours_left = int((permit.planned_end_time - now).total_seconds() / 3600)
        expiring_soon.append({
            'id': permit.id,
            'permit_number': permit.permit_number,
            'status': permit.status,
            'location': permit.location,
            'hours_left': hours_left,
            'planned_end_time': permit.planned_end_time.isoformat()
        })
    
    return {
        'overdue_verification': overdue_verification,
        'overdue_approval': overdue_approval,
        'isolation_pending': isolation_pending,
        'closeout_pending': closeout_pending,
        'expiring_soon': expiring_soon
    }
