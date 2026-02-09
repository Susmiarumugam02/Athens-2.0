"""
PTW Filters - Canonical filter model for permits and related entities
"""
from django_filters import rest_framework as filters
from django.db.models import Q
from .models import Permit, PermitAudit
from .status_utils import normalize_permit_status


class PermitFilter(filters.FilterSet):
    """Canonical filter for Permit list endpoints"""
    
    # Project filter (already in filterset_fields, but explicit for clarity)
    project = filters.NumberFilter(field_name='project__id')
    
    # Status filter - supports comma-separated values
    status = filters.CharFilter(method='filter_status')
    
    # Permit type filters
    permit_type = filters.NumberFilter(field_name='permit_type__id')
    permit_category = filters.CharFilter(field_name='permit_type__category', lookup_expr='iexact')
    
    # Date range filters (default to created_at)
    date_from = filters.DateFilter(field_name='created_at', lookup_expr='gte')
    date_to = filters.DateFilter(field_name='created_at', lookup_expr='lte')
    
    # Planned time filters
    planned_start_from = filters.DateTimeFilter(field_name='planned_start_time', lookup_expr='gte')
    planned_start_to = filters.DateTimeFilter(field_name='planned_start_time', lookup_expr='lte')
    planned_end_from = filters.DateTimeFilter(field_name='planned_end_time', lookup_expr='gte')
    planned_end_to = filters.DateTimeFilter(field_name='planned_end_time', lookup_expr='lte')
    
    # Risk level filter
    risk_level = filters.CharFilter(field_name='risk_level', lookup_expr='iexact')
    
    # Priority filter
    priority = filters.CharFilter(field_name='priority', lookup_expr='iexact')
    
    # Created by filter
    created_by = filters.NumberFilter(field_name='created_by__id')
    
    class Meta:
        model = Permit
        fields = ['project', 'status', 'permit_type', 'permit_category', 'risk_level', 'priority', 'created_by']
    
    def filter_status(self, queryset, name, value):
        """Support comma-separated status values"""
        if not value:
            return queryset
        
        statuses = [s.strip() for s in value.split(',') if s.strip()]
        statuses = [normalize_permit_status(status) for status in statuses]
        if statuses:
            return queryset.filter(status__in=statuses)
        return queryset


class PermitAuditFilter(filters.FilterSet):
    """Filter for permit audit logs"""
    permit = filters.NumberFilter(field_name='permit__id')
    action = filters.CharFilter(field_name='action', lookup_expr='iexact')
    user = filters.NumberFilter(field_name='user__id')
    date_from = filters.DateTimeFilter(field_name='timestamp', lookup_expr='gte')
    date_to = filters.DateTimeFilter(field_name='timestamp', lookup_expr='lte')
    
    class Meta:
        model = PermitAudit
        fields = ['permit', 'action', 'user']
