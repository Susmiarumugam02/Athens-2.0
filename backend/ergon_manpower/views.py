from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Avg, Count
from django.utils import timezone
from datetime import timedelta
from collections import defaultdict

from .models import ManpowerEntry, WorkType, DailyManpowerSummary
from .serializers import (
    ManpowerEntrySerializer,
    ManpowerWriteSerializer,
    WorkTypeSerializer,
    DailyManpowerSummarySerializer
)


class ManpowerEntryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ManpowerEntrySerializer

    def get_queryset(self):
        athens_tenant_id = getattr(self.request, 'athens_tenant_id', None)
        project_id = getattr(self.request, 'project_id', None)
        
        queryset = ManpowerEntry.objects.filter(athens_tenant_id=athens_tenant_id)
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        # Date filtering
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        return queryset.order_by('-date', 'id')

    def list(self, request, *args, **kwargs):
        format_type = request.query_params.get('format', 'grouped')
        
        if format_type == 'individual':
            return super().list(request, *args, **kwargs)
        
        # Grouped format (default)
        queryset = self.get_queryset()
        grouped_data = {}
        
        for entry in queryset:
            key = entry.date.isoformat()
            if key not in grouped_data:
                grouped_data[key] = {'id': entry.id, 'date': key, 'categories': {}}
            
            category = entry.category
            if category not in grouped_data[key]['categories']:
                grouped_data[key]['categories'][category] = {'Male': 0, 'Female': 0, 'Others': 0}
            
            grouped_data[key]['categories'][category][entry.gender] = entry.count
        
        return Response(list(grouped_data.values()))

    def create(self, request, *args, **kwargs):
        serializer = ManpowerWriteSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        created_entries = serializer.save()
        
        output_serializer = ManpowerEntrySerializer(created_entries, many=True)
        return Response({'created_entries': output_serializer.data}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def by_date(self, request):
        """Get entries for a specific date"""
        date_str = request.query_params.get('date')
        if not date_str:
            return Response({'error': 'Date parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        queryset = self.get_queryset().filter(date=date_str)
        grouped_data = defaultdict(lambda: {'Male': 0, 'Female': 0, 'Others': 0})
        
        for entry in queryset:
            grouped_data[entry.category][entry.gender] += entry.count
        
        result = [{'category': category, **genders} for category, genders in grouped_data.items()]
        return Response(result)


class WorkTypeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = WorkTypeSerializer

    def get_queryset(self):
        athens_tenant_id = getattr(self.request, 'athens_tenant_id', None)
        return WorkType.objects.filter(
            athens_tenant_id=athens_tenant_id,
            is_active=True
        ).order_by('name')

    def perform_create(self, serializer):
        athens_tenant_id = getattr(self.request, 'athens_tenant_id', None)
        serializer.save(athens_tenant_id=athens_tenant_id)


class DailyManpowerSummaryViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DailyManpowerSummarySerializer

    def get_queryset(self):
        athens_tenant_id = getattr(self.request, 'athens_tenant_id', None)
        project_id = getattr(self.request, 'project_id', None)
        
        queryset = DailyManpowerSummary.objects.filter(athens_tenant_id=athens_tenant_id)
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        # Date filtering
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        # Default to last 30 days if no filter
        if not start_date and not end_date:
            thirty_days_ago = timezone.now().date() - timedelta(days=30)
            queryset = queryset.filter(date__gte=thirty_days_ago)
        
        return queryset.order_by('-date')[:50]

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'summaries': serializer.data,
            'analytics': self._get_analytics(queryset)
        })

    def _get_analytics(self, queryset):
        """Calculate analytics for the given queryset"""
        if not queryset.exists():
            return {}

        analytics = queryset.aggregate(
            avg_workers=Avg('total_workers'),
            avg_hours=Avg('total_hours'),
            avg_overtime=Avg('total_overtime'),
            total_days=Count('id'),
            avg_present=Avg('present_count'),
            avg_absent=Avg('absent_count'),
            avg_late=Avg('late_count')
        )

        # Calculate trends
        latest_date = queryset.order_by('-date').first().date
        last_week = queryset.filter(
            date__gte=latest_date - timedelta(days=6),
            date__lte=latest_date
        )
        prev_week = queryset.filter(
            date__gte=latest_date - timedelta(days=13),
            date__lt=latest_date - timedelta(days=6)
        )

        last_week_avg = last_week.aggregate(avg=Avg('total_workers'))['avg'] or 0
        prev_week_avg = prev_week.aggregate(avg=Avg('total_workers'))['avg'] or 0

        trend = 0
        if prev_week_avg > 0:
            trend = ((last_week_avg - prev_week_avg) / prev_week_avg) * 100

        analytics['trend_percentage'] = round(trend, 1)
        analytics['avg_efficiency'] = round(
            sum(summary.calculate_efficiency() for summary in queryset) / queryset.count(), 1
        ) if queryset.count() > 0 else 0

        return analytics


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get comprehensive manpower statistics for dashboard"""
    athens_tenant_id = getattr(request, 'athens_tenant_id', None)
    project_id = getattr(request, 'project_id', None)

    entries_qs = ManpowerEntry.objects.filter(athens_tenant_id=athens_tenant_id)
    summaries_qs = DailyManpowerSummary.objects.filter(athens_tenant_id=athens_tenant_id)

    if project_id:
        entries_qs = entries_qs.filter(project_id=project_id)
        summaries_qs = summaries_qs.filter(project_id=project_id)

    today = timezone.now().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    today_summary = summaries_qs.filter(date=today).first()
    week_summaries = summaries_qs.filter(date__gte=week_ago)
    month_summaries = summaries_qs.filter(date__gte=month_ago)

    stats = {
        'today': {
            'total_workers': today_summary.total_workers if today_summary else 0,
            'present_workers': today_summary.present_count if today_summary else 0,
            'total_hours': float(today_summary.total_hours) if today_summary else 0,
            'overtime_hours': float(today_summary.total_overtime) if today_summary else 0,
            'efficiency': today_summary.calculate_efficiency() if today_summary else 0,
        },
        'week': {
            'avg_workers': week_summaries.aggregate(avg=Avg('total_workers'))['avg'] or 0,
            'total_hours': week_summaries.aggregate(total=Sum('total_hours'))['total'] or 0,
            'avg_efficiency': sum(s.calculate_efficiency() for s in week_summaries) / week_summaries.count() if week_summaries.count() > 0 else 0,
        },
        'month': {
            'avg_workers': month_summaries.aggregate(avg=Avg('total_workers'))['avg'] or 0,
            'total_hours': month_summaries.aggregate(total=Sum('total_hours'))['total'] or 0,
            'working_days': month_summaries.count(),
        },
        'trends': _get_trend_data(summaries_qs, today),
        'work_type_distribution': _get_work_type_distribution(entries_qs, week_ago),
        'attendance_breakdown': _get_attendance_breakdown(week_summaries),
    }

    return Response(stats)


def _get_trend_data(summaries_qs, end_date):
    """Get 7-day trend data"""
    trends = []
    for i in range(6, -1, -1):
        date = end_date - timedelta(days=i)
        summary = summaries_qs.filter(date=date).first()
        trends.append({
            'date': date.isoformat(),
            'workers': summary.total_workers if summary else 0,
            'hours': float(summary.total_hours) if summary else 0,
            'efficiency': summary.calculate_efficiency() if summary else 0,
        })
    return trends


def _get_work_type_distribution(entries_qs, start_date):
    """Get work type distribution for the period"""
    distribution = entries_qs.filter(date__gte=start_date).values(
        'work_type__name'
    ).annotate(
        total_workers=Sum('count'),
        total_hours=Sum('hours_worked')
    ).order_by('-total_workers')

    return [
        {
            'work_type': item['work_type__name'] or 'General',
            'workers': item['total_workers'],
            'hours': float(item['total_hours'])
        }
        for item in distribution
    ]


def _get_attendance_breakdown(summaries_qs):
    """Get attendance status breakdown"""
    if not summaries_qs.exists():
        return {}

    totals = summaries_qs.aggregate(
        present=Sum('present_count'),
        absent=Sum('absent_count'),
        late=Sum('late_count'),
        half_day=Sum('half_day_count')
    )

    total = sum(totals.values())
    if total == 0:
        return {}

    return {
        'present': {
            'count': totals['present'],
            'percentage': round((totals['present'] / total) * 100, 1)
        },
        'absent': {
            'count': totals['absent'],
            'percentage': round((totals['absent'] / total) * 100, 1)
        },
        'late': {
            'count': totals['late'],
            'percentage': round((totals['late'] / total) * 100, 1)
        },
        'half_day': {
            'count': totals['half_day'],
            'percentage': round((totals['half_day'] / total) * 100, 1)
        }
    }
