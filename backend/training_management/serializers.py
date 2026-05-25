from rest_framework import serializers
from .models import Training, TrainingAttendance, TrainingQRSession
from authentication.models import User

PARTICIPANT_REQUIRED_TYPES = {
    Training.TYPE_INDUCTION,
    Training.TYPE_INDUCTION_TRAINING,
    Training.TYPE_SAFETY,
    Training.TYPE_SAFETY_TRAINING,
    Training.TYPE_PTW_TRAINING,
    Training.TYPE_TOOLBOX_TRAINING,
    Training.TYPE_INSPECTION_TRAINING,
}

TRAINING_TYPE_ALIASES = {
    'induction': Training.TYPE_INDUCTION,
    'induction training': Training.TYPE_INDUCTION_TRAINING,
    'induction_training': Training.TYPE_INDUCTION_TRAINING,
    'safety': Training.TYPE_SAFETY,
    'safety training': Training.TYPE_SAFETY_TRAINING,
    'safety_training': Training.TYPE_SAFETY_TRAINING,
    'ptw training': Training.TYPE_PTW_TRAINING,
    'ptw_training': Training.TYPE_PTW_TRAINING,
    'toolbox talk': Training.TYPE_TOOLBOX_TRAINING,
    'toolbox training': Training.TYPE_TOOLBOX_TRAINING,
    'toolbox_training': Training.TYPE_TOOLBOX_TRAINING,
    'inspection training': Training.TYPE_INSPECTION_TRAINING,
    'inspection_training': Training.TYPE_INSPECTION_TRAINING,
    'job training': Training.TYPE_JOB_TRAINING,
    'job_training': Training.TYPE_JOB_TRAINING,
    'technical training': Training.TYPE_TECHNICAL,
    'technical': Training.TYPE_TECHNICAL,
    'compliance training': Training.TYPE_COMPLIANCE,
    'compliance': Training.TYPE_COMPLIANCE,
    'other': Training.TYPE_OTHER,
}


class TrainingAttendanceSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    employee_code = serializers.CharField(source='user.employee_id', read_only=True)
    department = serializers.CharField(source='user.department', read_only=True)
    designation = serializers.CharField(source='user.designation', read_only=True)
    profile_photo = serializers.SerializerMethodField()
    completion_status = serializers.SerializerMethodField()
    training_completed = serializers.SerializerMethodField()
    marked_by_email = serializers.EmailField(source='marked_by.email', read_only=True)

    class Meta:
        model = TrainingAttendance
        fields = [
            'id', 'training', 'user', 'user_email', 'user_name',
            'employee_code', 'department', 'designation', 'profile_photo',
            'attendance_status', 'remarks', 'marked_by', 'marked_by_email',
            'attendance_method', 'verification_status', 'verified_by', 'gps_location',
            'device_info', 'marked_at', 'completed_at', 'completion_status', 'training_completed',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['marked_at', 'completed_at', 'created_at', 'updated_at']

    def get_user_name(self, obj):
        return obj.user.get_full_name()

    def get_profile_photo(self, obj):
        return obj.user.profile_photo.url if obj.user.profile_photo else None

    def get_completion_status(self, obj):
        return 'completed' if obj.attendance_status in ('present', 'completed') else 'not_started'

    def get_training_completed(self, obj):
        return obj.attendance_status in ('present', 'completed')


class TrainingSerializer(serializers.ModelSerializer):
    training_type = serializers.CharField()
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    attendances = TrainingAttendanceSerializer(many=True, read_only=True)
    attendance_count = serializers.SerializerMethodField()
    participants = serializers.SerializerMethodField()
    completion_percentage = serializers.SerializerMethodField()
    active_qr_session = serializers.SerializerMethodField()
    participant_ids = serializers.ListField(required=False, write_only=True)
    department = serializers.CharField(required=False, allow_blank=True, write_only=True)
    job_role = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = Training
        fields = [
            'id', 'project', 'company', 'tenant_id', 'training_type', 'mode', 'title', 'trainer',
            'training_date', 'training_time', 'location', 'duration_hours',
            'description', 'status', 'assigned_user_ids', 'site_lat', 'site_lng',
            'participant_ids', 'department', 'job_role',
            'geo_radius_meters', 'created_by', 'created_by_email',
            'attendances', 'attendance_count', 'participants', 'completion_percentage',
            'active_qr_session',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['company', 'tenant_id', 'created_by', 'created_at', 'updated_at']
        extra_kwargs = {'project': {'required': False}}

    def get_active_qr_session(self, obj):
        from django.utils import timezone
        session = obj.qr_sessions.filter(is_active=True).order_by('-created_at').first()
        if not session or not session.is_valid:
            return None
        import json
        return {
            'session_id': session.id,
            'qr_token': session.qr_token,
            'session_token': session.session_token or session.qr_token,
            'qr_image': session.qr_image,
            'qr_payload': json.dumps({
                'training_id': obj.id,
                'session_token': session.qr_token,
                'tenant_id': obj.tenant_id,
                'expires_at': session.expires_at.isoformat(),
                'title': obj.title,
            }),
            'expires_at': session.expires_at,
        }

    def get_attendance_count(self, obj):
        total = obj.attendances.count()
        completed = obj.attendances.filter(attendance_status__in=['present', 'completed']).count()
        return {
            'total': total,
            'present': obj.attendances.filter(attendance_status='present').count(),
            'absent': obj.attendances.filter(attendance_status='absent').count(),
            'pending': obj.attendances.filter(attendance_status='pending').count(),
            'completed': obj.attendances.filter(attendance_status='completed').count(),
            'completion_percentage': round((completed / total) * 100) if total else 0,
        }

    def get_participants(self, obj):
        return [
            {
                'employee_id': attendance.user_id,
                'attendance_status': attendance.attendance_status,
                'completion_status': 'completed' if attendance.attendance_status in ('present', 'completed') else 'not_started',
            }
            for attendance in obj.attendances.all()
        ]

    def get_completion_percentage(self, obj):
        total = obj.attendances.count()
        if not total:
            return 0
        completed = obj.attendances.filter(attendance_status__in=['present', 'completed']).count()
        return round((completed / total) * 100)

    def _normalize_user_ids(self, value):
        if not value:
            return []
        unique_ids = []
        for item in value:
            raw_id = item
            if isinstance(item, dict):
                raw_id = item.get('value', item.get('id'))
            try:
                user_id = int(raw_id)
            except (TypeError, ValueError):
                raise serializers.ValidationError('Invalid employee selection.')
            if user_id not in unique_ids:
                unique_ids.append(user_id)
            else:
                raise serializers.ValidationError('Duplicate participants are not allowed.')
        return unique_ids

    def validate_training_type(self, value):
        normalized = TRAINING_TYPE_ALIASES.get(str(value).strip().lower())
        if normalized:
            return normalized
        valid_values = {choice[0] for choice in Training.TYPE_CHOICES}
        if value not in valid_values:
            raise serializers.ValidationError('Invalid training type.')
        return value

    def validate_assigned_user_ids(self, value):
        return self._validate_employee_ids(self._normalize_user_ids(value))

    def _validate_employee_ids(self, unique_ids):
        if not unique_ids:
            return []
        request = self.context.get('request')
        qs = User.objects.filter(
            id__in=unique_ids,
            role_type='user',
            is_active=True,
            approval_status='approved',
        )
        if request and request.user.user_type != 'superadmin':
            qs = qs.filter(created_by=request.user)

        if qs.count() != len(unique_ids):
            raise serializers.ValidationError('Only approved active employees can be assigned.')
        return unique_ids

    def validate(self, attrs):
        participant_ids = attrs.pop('participant_ids', None)
        attrs.pop('department', None)
        attrs.pop('job_role', None)

        if participant_ids is not None:
            normalized_participants = self._validate_employee_ids(self._normalize_user_ids(participant_ids))
            assigned = attrs.get('assigned_user_ids') or []
            merged = []
            for user_id in [*assigned, *normalized_participants]:
                if user_id not in merged:
                    merged.append(user_id)
            attrs['assigned_user_ids'] = merged

        training_type = attrs.get('training_type') or getattr(self.instance, 'training_type', None)
        assigned_user_ids = attrs.get('assigned_user_ids')
        if training_type in PARTICIPANT_REQUIRED_TYPES and not assigned_user_ids:
            raise serializers.ValidationError({'assigned_user_ids': 'Please assign at least one employee.'})
        return attrs


class UserTrainingSerializer(serializers.ModelSerializer):
    """Lightweight serializer for user-facing assigned training view."""
    my_attendance = serializers.SerializerMethodField()
    has_active_qr = serializers.SerializerMethodField()
    qr_enabled = serializers.SerializerMethodField()
    attendance_marked = serializers.SerializerMethodField()
    display_status = serializers.SerializerMethodField()
    instructions = serializers.CharField(source='description', read_only=True)

    class Meta:
        model = Training
        fields = [
            'id', 'training_type', 'mode', 'title', 'trainer',
            'training_date', 'training_time', 'location', 'duration_hours',
            'description', 'status',
            'instructions', 'my_attendance', 'has_active_qr', 'qr_enabled',
            'attendance_marked', 'display_status',
        ]

    def get_has_active_qr(self, obj):
        session = obj.qr_sessions.filter(is_active=True).order_by('-created_at').first()
        return bool(session and session.is_valid)

    def get_qr_enabled(self, obj):
        return self.get_has_active_qr(obj)

    def get_attendance_marked(self, obj):
        att = self._attendance_for_request_user(obj)
        return bool(att and att.attendance_status in ('present', 'completed'))

    def get_display_status(self, obj):
        att = self._attendance_for_request_user(obj)
        if att and att.attendance_status in ('present', 'completed'):
            return 'completed'
        if obj.status == Training.STATUS_CANCELLED:
            return 'expired'
        if obj.status == Training.STATUS_COMPLETED:
            return 'completed'
        return 'pending'

    def _attendance_for_request_user(self, obj):
        request = self.context.get('request')
        if not request:
            return None
        return obj.attendances.filter(user=request.user).first()

    def get_my_attendance(self, obj):
        att = self._attendance_for_request_user(obj)
        if not att:
            return {
                'attendance_status': 'pending',
                'attendance_method': None,
                'verified_by': None,
                'completed_at': None,
                'marked_at': None,
            }
        return {
            'id': att.id,
            'attendance_status': att.attendance_status,
            'attendance_method': att.attendance_method,
            'verified_by': att.verified_by,
            'completed_at': att.completed_at,
            'marked_at': att.marked_at,
        }


class MarkAttendanceSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    attendance_status = serializers.ChoiceField(choices=['present', 'absent', 'completed'])
    remarks = serializers.CharField(required=False, allow_blank=True)


class BulkMarkAttendanceSerializer(serializers.Serializer):
    attendances = MarkAttendanceSerializer(many=True)
