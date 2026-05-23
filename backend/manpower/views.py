# your_app/views.py

from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from collections import defaultdict
from django.db import transaction
from django.db.models import Sum, Count, Q, Avg
from django.utils import timezone
from datetime import datetime, timedelta
from .models import ManpowerEntry, WorkType, DailyManpowerSummary
from .serializers import (
    ManpowerEntrySerializer,
    ManpowerWriteSerializer,
    WorkTypeSerializer,
    DailyManpowerSummarySerializer
)
from .permissions import CanManageManpower
from permissions.decorators import require_permission
from authentication.tenant_scoped_utils import ensure_tenant_context, ensure_project, enforce_collaboration_read_only

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_endpoint(request):
    """Test endpoint to verify URL routing works"""
    ensure_tenant_context(request)
    ensure_project(request)
    return Response({
        'message': 'Manpower URL routing works!',
        'user': str(request.user),
        'authenticated': request.user.is_authenticated,
        'headers': dict(request.headers),
        'method': request.method,
        'path': request.path,
        'query_params': dict(request.GET)
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_manpower_endpoint(request):
    """Debug endpoint to test manpower functionality"""
    try:
        ensure_tenant_context(request)
        ensure_project(request)
        format_type = request.GET.get('format', 'grouped')
        return Response({
            'message': 'Debug manpower endpoint works!',
            'user': str(request.user),
            'authenticated': request.user.is_authenticated,
            'format': format_type,
            'user_type': getattr(request.user, 'user_type', None),
            'admin_type': getattr(request.user, 'admin_type', None),
        })
    except Exception as e:
        return Response({
            'error': str(e),
            'message': 'Debug endpoint failed'
        }, status=500)

class ManpowerEntryView(APIView):
    permission_classes = [IsAuthenticated, CanManageManpower]

    def get_queryset(self):
        """
        Filter manpower entries based on user type and permissions:
        - adminuser (clientuser, epcuser, contractoruser): see only entries they created
        - projectadmin: see all entries in their project (read-only)
        """
        user = self.request.user

        # Master admin has full access
        if getattr(user, 'admin_type', None) == 'master':
            return ManpowerEntry.objects.all()

        # Get user's project
        user_project = getattr(user, 'project', None)

        # If user is projectadmin, they can view all entries in their project
        if hasattr(user, 'user_type') and user.user_type == 'projectadmin':
            if user_project:
                return ManpowerEntry.objects.filter(project=user_project)
            else:
                return ManpowerEntry.objects.all()  # If no project, show all for now

        # If user is adminuser, they can see entries they created
        elif hasattr(user, 'user_type') and user.user_type == 'adminuser':
            queryset = ManpowerEntry.objects.filter(created_by=user)
            if user_project:
                queryset = queryset.filter(project=user_project)
            return queryset

        # For superusers or users with manage_manpower permission
        elif user.has_perm('manpower.manage_manpower') or user.is_superuser:
            return ManpowerEntry.objects.all()

        # Default: show all entries for debugging (temporary)
        return ManpowerEntry.objects.all()

    def get(self, request, format=None):
        # Check if individual records are requested (from query param or URL path)
        format_type = request.GET.get('format', 'grouped')
        
        # Check if this is the individual endpoint based on URL path
        if 'individual' in request.path:
            format_type = 'individual'

        # Apply date filtering
        queryset = self.get_queryset()
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        if format_type == 'individual':
            # Return individual records for CRUD operations
            entries = queryset.order_by('-date', 'id')
            serializer = ManpowerEntrySerializer(entries, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            # Return grouped data (default behavior)
            entries = queryset.order_by('-date', 'id')
            grouped_data = {}

            for entry in entries:
                key = entry.date.isoformat()
                if key not in grouped_data:
                    grouped_data[key] = {'id': entry.id, 'date': key, 'categories': {}}

                category = entry.category
                if category not in grouped_data[key]['categories']:
                    grouped_data[key]['categories'][category] = {'Male': 0, 'Female': 0, 'Others': 0}

                grouped_data[key]['categories'][category][entry.gender] = entry.count

            return Response(list(grouped_data.values()), status=status.HTTP_200_OK)

    def post(self, request):
        data = request.data
        date = data.get('date')
        categories = data.get('categories', {})

        if not date or not categories:
            return Response({'error': 'Date and categories are required'}, status=status.HTTP_400_BAD_REQUEST)

        # Get user's project
        user_project = getattr(request.user, 'project', None)

        # Extract enhanced fields with defaults
        work_type_id = data.get('work_type_id')
        shift = data.get('shift', 'general')
        hours_worked = data.get('hours_worked', 8.0)
        overtime_hours = data.get('overtime_hours', 0.0)
        attendance_status = data.get('attendance_status', 'present')
        notes = data.get('notes', '')

        # Get work type if provided
        work_type = None
        if work_type_id:
            try:
                work_type = WorkType.objects.get(id=work_type_id, is_active=True)
            except WorkType.DoesNotExist:
                pass

        created_entries = []
        try:
            with transaction.atomic():
                # Only delete entries created by the current user for this date
                self.get_queryset().filter(date=date).delete()

                for category, genders in categories.items():
                    for gender, count in genders.items():
                        count_int = int(count) if count is not None else 0
                        if count_int > 0:
                            # Create entry with all fields including enhanced ones
                            entry = ManpowerEntry.objects.create(
                                date=date,
                                category=category,
                                gender=gender,
                                count=count_int,
                                work_type=work_type,
                                shift=shift,
                                hours_worked=hours_worked,
                                overtime_hours=overtime_hours,
                                attendance_status=attendance_status,
                                notes=notes,
                                created_by=request.user,
                                project=user_project
                            )
                            serializer = ManpowerEntrySerializer(entry)
                            created_entries.append(serializer.data)

                # Update daily summary
                self._update_daily_summary(date, user_project, work_type, shift, hours_worked, overtime_hours, attendance_status)

            return Response({'created_entries': created_entries}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _update_daily_summary(self, date, project, work_type, shift, hours_worked, overtime_hours, attendance_status):
        """Update or create daily summary for the given date"""

        # Calculate totals for the date and project
        entries = ManpowerEntry.objects.filter(date=date, project=project)

        total_workers = entries.aggregate(total=Sum('count'))['total'] or 0
        total_hours = entries.aggregate(total=Sum('hours_worked'))['total'] or 0
        total_overtime = entries.aggregate(total=Sum('overtime_hours'))['total'] or 0

        # Count by attendance status
        status_counts = entries.values('attendance_status').annotate(count=Sum('count'))

        present_count = sum(item['count'] for item in status_counts if item['attendance_status'] == 'present')
        absent_count = sum(item['count'] for item in status_counts if item['attendance_status'] == 'absent')
        late_count = sum(item['count'] for item in status_counts if item['attendance_status'] == 'late')
        half_day_count = sum(item['count'] for item in status_counts if item['attendance_status'] == 'half_day')

        # Update or create summary
        DailyManpowerSummary.objects.update_or_create(
            date=date,
            project=project,
            defaults={
                'total_workers': total_workers,
                'total_hours': total_hours,
                'total_overtime': total_overtime,
                'present_count': present_count,
                'absent_count': absent_count,
                'late_count': late_count,
                'half_day_count': half_day_count,
            }
        )


class ManpowerEntryByDateView(APIView):
    permission_classes = [IsAuthenticated, CanManageManpower]

    def get_queryset(self):
        """Same filtering logic as ManpowerEntryView"""
        user = self.request.user
        user_project = getattr(user, 'project', None)

        if hasattr(user, 'user_type') and user.user_type == 'projectadmin':
            if user_project:
                return ManpowerEntry.objects.filter(project=user_project)
            else:
                return ManpowerEntry.objects.none()
        elif hasattr(user, 'user_type') and user.user_type == 'adminuser':
            queryset = ManpowerEntry.objects.filter(created_by=user)
            if user_project:
                queryset = queryset.filter(project=user_project)
            return queryset
        elif user.has_perm('manpower.manage_manpower'):
            return ManpowerEntry.objects.all()
        return ManpowerEntry.objects.none()

    def get(self, request):
        date_str = request.query_params.get('date')
        if not date_str:
            return Response({'error': 'Date query parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            entries = self.get_queryset().filter(date=date_str)
            grouped_data = defaultdict(lambda: {'Male': 0, 'Female': 0, 'Others': 0})
            for entry in entries:
                grouped_data[entry.category][entry.gender] += entry.count

            result = [{'category': category, **genders} for category, genders in grouped_data.items()]
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ManpowerEntryDetailView(APIView):
    permission_classes = [IsAuthenticated, CanManageManpower]
    model = ManpowerEntry  # Required for permission decorator

    def get_queryset(self):
        """Same filtering logic as ManpowerEntryView"""
        user = self.request.user
        user_project = getattr(user, 'project', None)

        if hasattr(user, 'user_type') and user.user_type == 'projectadmin':
            if user_project:
                return ManpowerEntry.objects.filter(project=user_project)
            else:
                return ManpowerEntry.objects.none()
        elif hasattr(user, 'user_type') and user.user_type == 'adminuser':
            queryset = ManpowerEntry.objects.filter(created_by=user)
            if user_project:
                queryset = queryset.filter(project=user_project)
            return queryset
        elif user.has_perm('manpower.manage_manpower'):
            return ManpowerEntry.objects.all()
        return ManpowerEntry.objects.none()

    @require_permission('edit')
    def put(self, request, pk):
        # Check permission first
        if request.user.user_type == 'adminuser':
            # Permission decorator will handle the check
            pass
        
        try:
            entry_to_update = self.get_queryset().get(id=pk)
            date_to_update = entry_to_update.date
        except ManpowerEntry.DoesNotExist:
            return Response({'error': 'Manpower entry not found'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        categories = data.get('categories', {})
        if not categories:
            return Response({'error': 'Categories data is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Get user's project
        user_project = getattr(request.user, 'project', None)

        updated_entries = []
        try:
            with transaction.atomic():
                # Now, delete all entries for the determined date created by this user and re-create them.
                self.get_queryset().filter(date=date_to_update).delete()

                for category, genders in categories.items():
                    for gender, count in genders.items():
                        count_int = int(count) if count is not None else 0
                        if count_int > 0:
                            # Create entry with user and project information
                            entry = ManpowerEntry.objects.create(
                                date=date_to_update,
                                category=category,
                                gender=gender,
                                count=count_int,
                                created_by=request.user,
                                project=user_project
                            )
                            serializer = ManpowerEntrySerializer(entry)
                            updated_entries.append(serializer.data)
            return Response({'updated_entries': updated_entries}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @require_permission('delete')
    def delete(self, request, pk):
        try:
            entry_to_delete = self.get_queryset().get(id=pk)
            date_to_clear = entry_to_delete.date
            # Only delete entries created by this user for the specific date
            self.get_queryset().filter(date=date_to_clear).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ManpowerEntry.DoesNotExist:
            return Response({'error': 'Manpower entry not found'}, status=status.HTTP_404_NOT_FOUND)


# === NEW ENHANCED VIEWS ===

class IndividualManpowerEntryView(APIView):
    """Handle individual manpower entry CRUD operations"""
    permission_classes = [IsAuthenticated, CanManageManpower]
    model = ManpowerEntry  # Required for permission decorator

    def get_queryset(self):
        """Filter by user's project"""
        user = self.request.user
        queryset = ManpowerEntry.objects.all()

        user_project = getattr(user, 'project', None)
        if user_project:
            queryset = queryset.filter(project=user_project)

        return queryset

    def get(self, request, pk):
        """Get individual record"""
        try:
            entry = self.get_queryset().get(pk=pk)
            serializer = ManpowerEntrySerializer(entry)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ManpowerEntry.DoesNotExist:
            return Response({'error': 'Record not found'}, status=status.HTTP_404_NOT_FOUND)

    @require_permission('edit')
    def put(self, request, pk):
        """Update individual record"""
        try:
            entry = self.get_queryset().get(pk=pk)

            # Update fields
            data = request.data
            if 'date' in data:
                entry.date = data['date']
            if 'category' in data:
                entry.category = data['category']
            if 'gender' in data:
                entry.gender = data['gender']
            if 'count' in data:
                entry.count = int(data['count'])
            if 'notes' in data:
                entry.notes = data['notes']

            entry.save()

            # Update daily summary
            self._update_daily_summary_for_date(entry.date, entry.project)

            serializer = ManpowerEntrySerializer(entry)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except ManpowerEntry.DoesNotExist:
            return Response({'error': 'Record not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @require_permission('delete')
    def delete(self, request, pk):
        """Delete individual record"""
        try:
            entry = self.get_queryset().get(pk=pk)
            entry_date = entry.date
            entry_project = entry.project

            entry.delete()

            # Update daily summary
            self._update_daily_summary_for_date(entry_date, entry_project)

            return Response({'message': 'Record deleted successfully'}, status=status.HTTP_204_NO_CONTENT)
        except ManpowerEntry.DoesNotExist:
            return Response({'error': 'Record not found'}, status=status.HTTP_404_NOT_FOUND)

    def _update_daily_summary_for_date(self, date, project):
        """Update daily summary after CRUD operations"""
        entries = ManpowerEntry.objects.filter(date=date, project=project)

        if entries.exists():
            total_workers = entries.aggregate(total=Sum('count'))['total'] or 0
            total_hours = entries.aggregate(total=Sum('hours_worked'))['total'] or 0
            total_overtime = entries.aggregate(total=Sum('overtime_hours'))['total'] or 0

            # Count by attendance status
            status_counts = entries.values('attendance_status').annotate(count=Sum('count'))

            present_count = sum(item['count'] for item in status_counts if item['attendance_status'] == 'present')
            absent_count = sum(item['count'] for item in status_counts if item['attendance_status'] == 'absent')
            late_count = sum(item['count'] for item in status_counts if item['attendance_status'] == 'late')
            half_day_count = sum(item['count'] for item in status_counts if item['attendance_status'] == 'half_day')

            DailyManpowerSummary.objects.update_or_create(
                date=date,
                project=project,
                defaults={
                    'total_workers': total_workers,
                    'total_hours': total_hours,
                    'total_overtime': total_overtime,
                    'present_count': present_count,
                    'absent_count': absent_count,
                    'late_count': late_count,
                    'half_day_count': half_day_count,
                }
            )
        else:
            # Delete summary if no entries exist
            DailyManpowerSummary.objects.filter(date=date, project=project).delete()


class WorkTypeView(APIView):
    """Manage work types for manpower tracking"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get all active work types"""
        work_types = WorkType.objects.filter(is_active=True).order_by('name')
        serializer = WorkTypeSerializer(work_types, many=True)
        return Response(serializer.data)

    def post(self, request):
        """Create new work type"""
        # Allow users who can manage manpower to create work types
        user_type = getattr(request.user, 'user_type', None)
        if user_type not in ['adminuser', 'projectadmin']:
            return Response(
                {'error': 'Only admin users can create work types'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = WorkTypeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DailyManpowerSummaryView(APIView):
    """Get daily manpower summaries with analytics"""
    permission_classes = [IsAuthenticated, CanManageManpower]

    def get(self, request):
        """Get daily summaries with optional date filtering"""
        user_project = getattr(request.user, 'project', None)

        # Date filtering
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')

        queryset = DailyManpowerSummary.objects.all()

        if user_project:
            queryset = queryset.filter(project=user_project)

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        # Default to last 30 days if no date filter
        if not start_date and not end_date:
            thirty_days_ago = timezone.now().date() - timedelta(days=30)
            queryset = queryset.filter(date__gte=thirty_days_ago)

        summaries = queryset.order_by('-date')[:50]  # Limit to 50 records
        serializer = DailyManpowerSummarySerializer(summaries, many=True)

        return Response({
            'summaries': serializer.data,
            'analytics': self._get_analytics(queryset)
        })

    def _get_analytics(self, queryset):
        """Calculate analytics for the given queryset"""
        if not queryset.exists():
            return {}

        # Basic aggregations
        analytics = queryset.aggregate(
            avg_workers=Avg('total_workers'),
            avg_hours=Avg('total_hours'),
            avg_overtime=Avg('total_overtime'),
            total_days=Count('id'),
            avg_present=Avg('present_count'),
            avg_absent=Avg('absent_count'),
            avg_late=Avg('late_count')
        )

        # Calculate trends (last 7 days vs previous 7 days)
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
@permission_classes([IsAuthenticated, CanManageManpower])
def manpower_dashboard_stats(request):
    """Get comprehensive manpower statistics for dashboard"""
    ensure_tenant_context(request)
    enforce_collaboration_read_only(request, domain='manpower')
    user_project = ensure_project(request)

    # Base querysets
    entries_qs = ManpowerEntry.objects.all()
    summaries_qs = DailyManpowerSummary.objects.all()

    entries_qs = entries_qs.filter(project=user_project)
    summaries_qs = summaries_qs.filter(project=user_project)

    # Date ranges
    today = timezone.now().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # Today's stats
    today_entries = entries_qs.filter(date=today)
    today_summary = summaries_qs.filter(date=today).first()

    # Weekly stats
    week_entries = entries_qs.filter(date__gte=week_ago)
    week_summaries = summaries_qs.filter(date__gte=week_ago)

    # Monthly stats
    month_entries = entries_qs.filter(date__gte=month_ago)
    month_summaries = summaries_qs.filter(date__gte=month_ago)

    # Calculate statistics
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
