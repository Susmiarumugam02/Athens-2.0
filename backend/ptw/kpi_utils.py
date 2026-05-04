"""
PTW KPI Utilities
Efficient KPI calculation for dashboard
"""
from django.db.models import Count, Q, F, Case, When, Value, IntegerField
from django.db import models
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from .models import Permit, PermitIsolationPoint, PermitCloseout


# SLA defaults (configurable via settings)
DEFAULT_VERIFICATION_SLA_HOURS = getattr(settings, 'PTW_VERIFICATION_SLA_HOURS', 4)
DEFAULT_APPROVAL_SLA_HOURS = getattr(settings, 'PTW_APPROVAL_SLA_HOURS', 4)
DEFAULT_EXPIRING_SOON_HOURS = getattr(settings, 'PTW_EXPIRING_SOON_HOURS', 4)


def get_kpi_stats(queryset=None, project=None):
    """
    Calculate KPI stats efficiently with minimal queries
    
    Args:
        queryset: Optional pre-filtered queryset
        project: Optional project filter
    
    Returns:
        dict with counts, overdue, and lists
    """
    if queryset is None:
        queryset = Permit.objects.all()
    
    if project:
        queryset = queryset.filter(project=project)
    
    now = timezone.now()
    today = now.date()
    
    # Single query for all status counts
    status_counts = queryset.aggregate(
        total_open=Count('id', filter=~Q(status__in=['completed', 'cancelled', 'expired'])),
        draft=Count('id', filter=Q(status='draft')),
        submitted=Count('id', filter=Q(status='submitted')),
        pending_verification=Count('id', filter=Q(status='submitted')),
        pending_approval=Count('id', filter=Q(status='under_review')),
        under_review=Count('id', filter=Q(status='under_review')),
        approved=Count('id', filter=Q(status='approved')),
        active=Count('id', filter=Q(status='active')),
        suspended=Count('id', filter=Q(status='suspended')),
        completed_today=Count('id', filter=Q(status='completed', actual_end_time__date=today)),
        cancelled_today=Count('id', filter=Q(status='cancelled', updated_at__date=today)),
        expired=Count('id', filter=Q(status='expired')),
        rejected=Count('id', filter=Q(status='rejected')),
    )
    
    # Calculate overdue counts
    overdue_stats = calculate_overdue_stats(queryset, now)
    
    # Get top overdue permits
    top_overdue = get_top_overdue_permits(queryset, now, limit=10)
    
    # Get expiring soon permits
    expiring_soon = get_expiring_soon_permits(queryset, now, limit=10)
    
    return {
        'as_of': now.isoformat(),
        'counts': status_counts,
        'overdue': overdue_stats,
        'lists': {
            'top_overdue': top_overdue,
            'expiring_soon': expiring_soon,
        }
    }


def calculate_overdue_stats(queryset, now):
    """Calculate overdue counts for different categories"""
    verification_sla = timedelta(hours=DEFAULT_VERIFICATION_SLA_HOURS)
    approval_sla = timedelta(hours=DEFAULT_APPROVAL_SLA_HOURS)
    expiring_threshold = now + timedelta(hours=DEFAULT_EXPIRING_SOON_HOURS)
    
    # Pending verification overdue
    pending_verification_overdue = queryset.filter(
        status='submitted'
    ).annotate(
        age=Case(
            When(submitted_at__isnull=False, then=now - F('submitted_at')),
            default=now - F('created_at'),
            output_field=models.DurationField()
        )
    ).filter(age__gt=verification_sla).count()
    
    # Pending approval overdue
    pending_approval_overdue = queryset.filter(
        status='under_review'
    ).annotate(
        age=Case(
            When(verified_at__isnull=False, then=now - F('verified_at')),
            default=now - F('updated_at'),
            output_field=models.DurationField()
        )
    ).filter(age__gt=approval_sla).count()
    
    # Expiring soon
    expiring_soon_count = queryset.filter(
        status__in=['approved', 'active', 'suspended'],
        planned_end_time__lte=expiring_threshold,
        planned_end_time__gt=now
    ).count()
    
    # Isolation pending
    isolation_pending_count = get_isolation_pending_count(queryset)
    
    # Closeout pending
    closeout_pending_count = get_closeout_pending_count(queryset)
    
    return {
        'pending_verification': pending_verification_overdue,
        'pending_approval': pending_approval_overdue,
        'expiring_soon': expiring_soon_count,
        'isolation_pending': isolation_pending_count,
        'closeout_pending': closeout_pending_count,
    }


def get_isolation_pending_count(queryset):
    """Count permits with pending isolation verification"""
    # Only check permits in relevant statuses
    relevant_permits = queryset.filter(
        status__in=['under_review', 'approved', 'active'],
        permit_type__requires_structured_isolation=True
    )
    
    count = 0
    for permit in relevant_permits:
        required_points = permit.isolation_points.filter(required=True)
        if required_points.exists():
            verified_count = required_points.filter(status='verified').count()
            total_count = required_points.count()
            if verified_count < total_count:
                count += 1
    
    return count


def get_closeout_pending_count(queryset):
    """Count active permits with incomplete closeout"""
    from .models import CloseoutChecklistTemplate
    
    # Get active permits with closeout templates
    active_permits = queryset.filter(status='active')
    
    count = 0
    for permit in active_permits:
        # Check if template exists for this permit type
        template_exists = CloseoutChecklistTemplate.objects.filter(
            permit_type=permit.permit_type,
            is_active=True
        ).filter(
            Q(risk_level__isnull=True) | Q(risk_level=permit.risk_level)
        ).exists()
        
        if template_exists:
            # Check if closeout is incomplete
            try:
                closeout = permit.closeout
                if not closeout.completed:
                    count += 1
            except PermitCloseout.DoesNotExist:
                # No closeout created yet
                count += 1
    
    return count


def get_top_overdue_permits(queryset, now, limit=10):
    """Get top overdue permits sorted by age"""
    from django.db import models
    
    verification_sla = timedelta(hours=DEFAULT_VERIFICATION_SLA_HOURS)
    approval_sla = timedelta(hours=DEFAULT_APPROVAL_SLA_HOURS)
    
    # Get overdue verification permits
    verification_overdue = queryset.filter(
        status='submitted'
    ).annotate(
        age=Case(
            When(submitted_at__isnull=False, then=now - F('submitted_at')),
            default=now - F('created_at'),
            output_field=models.DurationField()
        )
    ).filter(age__gt=verification_sla)
    
    # Get overdue approval permits
    approval_overdue = queryset.filter(
        status='under_review'
    ).annotate(
        age=Case(
            When(verified_at__isnull=False, then=now - F('verified_at')),
            default=now - F('updated_at'),
            output_field=models.DurationField()
        )
    ).filter(age__gt=approval_sla)
    
    # Combine and sort by age
    combined = list(verification_overdue) + list(approval_overdue)
    combined.sort(key=lambda p: p.age, reverse=True)
    
    # Format results
    results = []
    for permit in combined[:limit]:
        age_hours = permit.age.total_seconds() / 3600
        results.append({
            'id': permit.id,
            'permit_number': permit.permit_number,
            'title': permit.title or permit.description[:50],
            'status': permit.status,
            'age_hours': round(age_hours, 1),
            'project': permit.project_id,
            'permit_type': {
                'id': permit.permit_type.id,
                'name': permit.permit_type.name,
                'color_code': permit.permit_type.color_code,
            },
            'planned_end_time': permit.planned_end_time.isoformat() if permit.planned_end_time else None,
            'created_by': {
                'id': permit.created_by.id,
                'name': f"{permit.created_by.name} {permit.created_by.surname}".strip(),
            } if permit.created_by else None,
        })
    
    return results


def get_expiring_soon_permits(queryset, now, limit=10):
    """Get permits expiring soon"""
    expiring_threshold = now + timedelta(hours=DEFAULT_EXPIRING_SOON_HOURS)
    
    expiring = queryset.filter(
        status__in=['approved', 'active', 'suspended'],
        planned_end_time__lte=expiring_threshold,
        planned_end_time__gt=now
    ).order_by('planned_end_time')[:limit]
    
    results = []
    for permit in expiring:
        hours_left = (permit.planned_end_time - now).total_seconds() / 3600
        results.append({
            'id': permit.id,
            'permit_number': permit.permit_number,
            'title': permit.title or permit.description[:50],
            'status': permit.status,
            'hours_left': round(hours_left, 1),
            'planned_end_time': permit.planned_end_time.isoformat(),
            'permit_type': {
                'id': permit.permit_type.id,
                'name': permit.permit_type.name,
                'color_code': permit.permit_type.color_code,
            },
        })
    
    return results
