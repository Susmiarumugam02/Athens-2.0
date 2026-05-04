from rest_framework import serializers
from .models import ManpowerEntry, WorkType, DailyManpowerSummary


class WorkTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkType
        fields = ['id', 'name', 'description', 'color_code', 'is_active', 'created_at']
        read_only_fields = ['created_at']


class ManpowerEntrySerializer(serializers.ModelSerializer):
    work_type_details = WorkTypeSerializer(source='work_type', read_only=True)
    total_hours = serializers.ReadOnlyField()
    efficiency_score = serializers.ReadOnlyField()

    class Meta:
        model = ManpowerEntry
        fields = [
            'id', 'date', 'category', 'gender', 'count', 'work_type', 'work_type_details',
            'shift', 'hours_worked', 'overtime_hours', 'total_hours', 'attendance_status',
            'notes', 'efficiency_score', 'project_id', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class ManpowerWriteSerializer(serializers.Serializer):
    """Bulk write serializer for creating multiple entries at once"""
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
        from django.db import transaction
        from django.db.models import Sum

        date = validated_data['date']
        categories = validated_data['categories']
        work_type_id = validated_data.get('work_type_id')
        shift = validated_data.get('shift', 'general')
        hours_worked = validated_data.get('hours_worked', 8.0)
        overtime_hours = validated_data.get('overtime_hours', 0.0)
        attendance_status = validated_data.get('attendance_status', 'present')
        notes = validated_data.get('notes', '')

        request = self.context.get('request')
        athens_tenant_id = getattr(request, 'athens_tenant_id', None)
        project_id = getattr(request, 'project_id', None)
        user_id = request.user.id if request and request.user else None

        work_type = None
        if work_type_id:
            work_type = WorkType.objects.filter(
                id=work_type_id,
                athens_tenant_id=athens_tenant_id,
                is_active=True
            ).first()

        with transaction.atomic():
            # Delete existing entries for this date/tenant/project/shift
            ManpowerEntry.objects.filter(
                athens_tenant_id=athens_tenant_id,
                project_id=project_id,
                date=date,
                shift=shift,
                created_by_id=user_id
            ).delete()

            created_entries = []
            for category_name, genders in categories.items():
                for gender, count in genders.items():
                    if count > 0:
                        entry = ManpowerEntry.objects.create(
                            athens_tenant_id=athens_tenant_id,
                            project_id=project_id,
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
                            created_by_id=user_id
                        )
                        created_entries.append(entry)

            # Update daily summary
            self._update_daily_summary(athens_tenant_id, project_id, date)

        return created_entries

    def _update_daily_summary(self, athens_tenant_id, project_id, date):
        """Update or create daily summary for the given date"""
        from django.db.models import Sum

        entries = ManpowerEntry.objects.filter(
            athens_tenant_id=athens_tenant_id,
            project_id=project_id,
            date=date
        )

        if not entries.exists():
            DailyManpowerSummary.objects.filter(
                athens_tenant_id=athens_tenant_id,
                project_id=project_id,
                date=date
            ).delete()
            return

        total_workers = entries.aggregate(total=Sum('count'))['total'] or 0
        total_hours = entries.aggregate(total=Sum('hours_worked'))['total'] or 0
        total_overtime = entries.aggregate(total=Sum('overtime_hours'))['total'] or 0

        status_counts = entries.values('attendance_status').annotate(count=Sum('count'))
        present_count = sum(item['count'] for item in status_counts if item['attendance_status'] == 'present')
        absent_count = sum(item['count'] for item in status_counts if item['attendance_status'] == 'absent')
        late_count = sum(item['count'] for item in status_counts if item['attendance_status'] == 'late')
        half_day_count = sum(item['count'] for item in status_counts if item['attendance_status'] == 'half_day')

        DailyManpowerSummary.objects.update_or_create(
            athens_tenant_id=athens_tenant_id,
            project_id=project_id,
            date=date,
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


class DailyManpowerSummarySerializer(serializers.ModelSerializer):
    efficiency = serializers.SerializerMethodField()

    class Meta:
        model = DailyManpowerSummary
        fields = [
            'id', 'date', 'total_workers', 'total_hours', 'total_overtime',
            'present_count', 'absent_count', 'late_count', 'half_day_count',
            'efficiency', 'project_id', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_efficiency(self, obj):
        return round(obj.calculate_efficiency(), 1)
