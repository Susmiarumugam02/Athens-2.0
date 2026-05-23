# your_app/serializers.py

from rest_framework import serializers
from .models import ManpowerEntry, WorkType, DailyManpowerSummary

# --- Enhanced write-only serializer for complex manpower data ---
class ManpowerWriteSerializer(serializers.Serializer):
    date = serializers.DateField()
    categories = serializers.DictField(
        child=serializers.DictField(
            child=serializers.IntegerField(min_value=0)
        )
    )
    work_type_id = serializers.IntegerField(required=False, allow_null=True)
    shift = serializers.ChoiceField(
        choices=ManpowerEntry.SHIFT_CHOICES,
        default='general'
    )
    hours_worked = serializers.DecimalField(
        max_digits=4,
        decimal_places=1,
        default=8.0,
        min_value=0,
        max_value=24
    )
    overtime_hours = serializers.DecimalField(
        max_digits=4,
        decimal_places=1,
        default=0.0,
        min_value=0,
        max_value=12
    )
    attendance_status = serializers.ChoiceField(
        choices=ManpowerEntry.ATTENDANCE_STATUS_CHOICES,
        default='present'
    )
    notes = serializers.CharField(required=False, allow_blank=True)

    def create(self, validated_data):
        date = validated_data['date']
        categories = validated_data['categories']
        work_type_id = validated_data.get('work_type_id')
        shift = validated_data.get('shift', 'general')
        hours_worked = validated_data.get('hours_worked', 8.0)
        overtime_hours = validated_data.get('overtime_hours', 0.0)
        attendance_status = validated_data.get('attendance_status', 'present')
        notes = validated_data.get('notes', '')

        # Get work type if provided
        work_type = None
        if work_type_id:
            try:
                work_type = WorkType.objects.get(id=work_type_id, is_active=True)
            except WorkType.DoesNotExist:
                pass

        # Get user and project from context
        request = self.context.get('request')
        user = request.user if request else None
        user_project = getattr(user, 'project', None) if user else None

        # Delete existing entries for this date, user, work_type, and shift
        filter_kwargs = {
            'date': date,
            'created_by': user,
            'shift': shift
        }
        if work_type:
            filter_kwargs['work_type'] = work_type

        ManpowerEntry.objects.filter(**filter_kwargs).delete()

        created_entries = []
        # Loop through the nested structure and create the flat ManpowerEntry objects
        for category_name, genders in categories.items():
            for gender, count in genders.items():
                # Only create an entry if the count is greater than zero
                if count > 0:
                    entry = ManpowerEntry.objects.create(
                        date=date,
                        category=category_name,
                        gender=gender,
                        count=count,
                        work_type=work_type,
                        shift=shift,
                        hours_worked=hours_worked,
                        overtime_hours=overtime_hours,
                        attendance_status=attendance_status,
                        notes=notes,
                        created_by=user,
                        project=user_project
                    )
                    created_entries.append(entry)

        # Update daily summary
        self._update_daily_summary(date, user_project)

        return created_entries

    def _update_daily_summary(self, date, project):
        """Update or create daily summary for the given date"""
        from django.db.models import Sum, Count

        # Calculate totals for the date and project
        entries = ManpowerEntry.objects.filter(date=date, project=project)

        total_workers = entries.aggregate(total=Sum('count'))['total'] or 0
        total_hours = entries.aggregate(
            total=Sum('hours_worked', output_field=serializers.DecimalField())
        )['total'] or 0
        total_overtime = entries.aggregate(
            total=Sum('overtime_hours', output_field=serializers.DecimalField())
        )['total'] or 0

        # Count by attendance status
        status_counts = entries.values('attendance_status').annotate(
            count=Sum('count')
        )

        present_count = sum(
            item['count'] for item in status_counts
            if item['attendance_status'] == 'present'
        )
        absent_count = sum(
            item['count'] for item in status_counts
            if item['attendance_status'] == 'absent'
        )
        late_count = sum(
            item['count'] for item in status_counts
            if item['attendance_status'] == 'late'
        )
        half_day_count = sum(
            item['count'] for item in status_counts
            if item['attendance_status'] == 'half_day'
        )

        # Update or create summary
        summary, created = DailyManpowerSummary.objects.update_or_create(
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


class WorkTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkType
        fields = ['id', 'name', 'description', 'color_code', 'is_active']

class DailyManpowerSummarySerializer(serializers.ModelSerializer):
    efficiency = serializers.SerializerMethodField()

    class Meta:
        model = DailyManpowerSummary
        fields = [
            'id', 'date', 'total_workers', 'total_hours', 'total_overtime',
            'present_count', 'absent_count', 'late_count', 'half_day_count',
            'efficiency', 'project'
        ]

    def get_efficiency(self, obj):
        return round(obj.calculate_efficiency(), 1)

# --- Enhanced serializer for reading data (GET requests) ---
class ManpowerEntrySerializer(serializers.ModelSerializer):
    work_type_details = WorkTypeSerializer(source='work_type', read_only=True)
    total_hours = serializers.ReadOnlyField()
    efficiency_score = serializers.ReadOnlyField()
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = ManpowerEntry
        fields = [
            'id', 'date', 'category', 'gender', 'count', 'work_type', 'work_type_details',
            'shift', 'hours_worked', 'overtime_hours', 'total_hours', 'attendance_status',
            'notes', 'efficiency_score', 'created_by', 'created_by_name', 'project',
            'created_at', 'updated_at'
        ]