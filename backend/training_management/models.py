import uuid
from django.db import models
from django.utils import timezone
from authentication.models import User, Project
from control_plane.models import Tenant


class Training(models.Model):
    """Training sessions created by admins"""
    TYPE_INDUCTION = 'induction'
    TYPE_INDUCTION_TRAINING = 'induction_training'
    TYPE_SAFETY = 'safety'
    TYPE_SAFETY_TRAINING = 'safety_training'
    TYPE_PTW_TRAINING = 'ptw_training'
    TYPE_TOOLBOX_TRAINING = 'toolbox_training'
    TYPE_INSPECTION_TRAINING = 'inspection_training'
    TYPE_TECHNICAL = 'technical'
    TYPE_JOB_TRAINING = 'job_training'
    TYPE_COMPLIANCE = 'compliance'
    TYPE_OTHER = 'other'
    INDUCTION_TYPES = (TYPE_INDUCTION, TYPE_INDUCTION_TRAINING)
    
    TYPE_CHOICES = [
        (TYPE_INDUCTION, 'Induction Training'),
        (TYPE_INDUCTION_TRAINING, 'Induction Training'),
        (TYPE_SAFETY, 'Safety Training'),
        (TYPE_SAFETY_TRAINING, 'Safety Training'),
        (TYPE_PTW_TRAINING, 'PTW Training'),
        (TYPE_TOOLBOX_TRAINING, 'Toolbox Talk'),
        (TYPE_INSPECTION_TRAINING, 'Inspection Training'),
        (TYPE_TECHNICAL, 'Technical Training'),
        (TYPE_JOB_TRAINING, 'Job Training'),
        (TYPE_COMPLIANCE, 'Compliance Training'),
        (TYPE_OTHER, 'Other'),
    ]
    
    STATUS_SCHEDULED = 'scheduled'
    STATUS_ONGOING = 'ongoing'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'
    
    STATUS_CHOICES = [
        (STATUS_SCHEDULED, 'Scheduled'),
        (STATUS_ONGOING, 'Ongoing'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]
    
    MODE_ONLINE = 'online'
    MODE_OFFLINE = 'offline'
    MODE_CHOICES = [
        (MODE_ONLINE, 'Online'),
        (MODE_OFFLINE, 'Offline'),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='trainings')
    company = models.ForeignKey(
        Tenant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='company_trainings',
        db_constraint=False,
        help_text='Company ownership marker for audit/reporting; access is controlled by created_by.',
    )
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='tenant_id',
        related_name='tenant_trainings',
        db_constraint=False,
        help_text='Tenant ownership marker for audit/reporting; access is controlled by created_by.',
    )
    training_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    mode = models.CharField(max_length=10, choices=MODE_CHOICES, default=MODE_OFFLINE,
                            help_text='online = user self-completes; offline = admin marks attendance')
    title = models.CharField(max_length=255)
    trainer = models.CharField(max_length=255)
    training_date = models.DateField()
    training_time = models.TimeField(null=True, blank=True)
    location = models.CharField(max_length=255)
    duration_hours = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_SCHEDULED)
    otp_code = models.CharField(max_length=6, null=True, blank=True)
    otp_expires_at = models.DateTimeField(null=True, blank=True)
    site_lat = models.FloatField(null=True, blank=True)
    site_lng = models.FloatField(null=True, blank=True)
    geo_radius_meters = models.IntegerField(default=200)
    
    assigned_user_ids = models.JSONField(
        default=list, blank=True,
        help_text='List of user IDs assigned to this training'
    )

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_trainings')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'trainings'
        ordering = ['-training_date', '-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.training_date}"


class TrainingAttendance(models.Model):
    """Attendance records for training sessions"""
    STATUS_PRESENT = 'present'
    STATUS_ABSENT = 'absent'
    STATUS_PENDING = 'pending'
    STATUS_COMPLETED = 'completed'

    STATUS_CHOICES = [
        (STATUS_PRESENT, 'Present'),
        (STATUS_ABSENT, 'Absent'),
        (STATUS_PENDING, 'Pending'),
        (STATUS_COMPLETED, 'Completed'),
    ]

    training = models.ForeignKey(Training, on_delete=models.CASCADE, related_name='attendances')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='training_attendances')
    attendance_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    remarks = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    attendance_method = models.CharField(
        max_length=20,
        choices=[
            ('qr', 'QR Code'),
            ('otp', 'OTP'),
            ('face', 'Face Verification'),
            ('admin', 'Admin Manual'),
            ('geo', 'Geolocation'),
            ('online', 'Online Self-Complete'),
        ],
        null=True,
        blank=True,
    )
    verification_status = models.CharField(max_length=30, default='pending')
    verified_by = models.CharField(max_length=255, null=True, blank=True)
    geo_lat = models.FloatField(null=True, blank=True)
    geo_lng = models.FloatField(null=True, blank=True)
    gps_location = models.JSONField(default=dict, blank=True)
    device_info = models.JSONField(default=dict, blank=True)

    marked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='marked_attendances')
    marked_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'training_attendance'
        unique_together = ['training', 'user']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.training.title} - {self.attendance_status}"
    
    def save(self, *args, **kwargs):
        """Auto-activate user when marked present for induction training"""
        is_new = self.pk is None
        old_status = None
        
        if not is_new:
            old_instance = TrainingAttendance.objects.filter(pk=self.pk).first()
            if old_instance:
                old_status = old_instance.attendance_status
        
        super().save(*args, **kwargs)
        
        # Auto-activate: when INDUCTION training attendance becomes present OR completed
        activating = (
            self.attendance_status in (self.STATUS_PRESENT, self.STATUS_COMPLETED)
            and old_status not in (self.STATUS_PRESENT, self.STATUS_COMPLETED)
            and self.training.training_type in Training.INDUCTION_TYPES
        )
        if activating:
            now = timezone.now()
            self.user.induction_attended = True
            self.user.induction_attended_at = now
            self.user.induction_marked_by = self.marked_by
            self.user.induction_completed = True
            self.user.induction_completed_at = now
            self.user.status = User.STATUS_ACTIVE
            self.user.module_access_enabled = True
            self.user.attendance_verified = True
            self.user.modules_unlocked = True
            self.user.access_status = 'active'
            self.user.onboarding_completed = True
            self.user.training_status = 'completed'
            self.user.attendance_status = 'verified'
            self.user.access_level = 'full_access'
            self.user.onboarding_status = 'completed'
            self.user.save(update_fields=[
                'induction_attended', 'induction_attended_at', 'induction_marked_by',
                'induction_completed', 'induction_completed_at',
                'status', 'module_access_enabled', 'attendance_verified',
                'modules_unlocked', 'access_status', 'onboarding_completed',
                'training_status', 'attendance_status', 'access_level', 'onboarding_status',
            ])


class TrainingQRSession(models.Model):
    """Unique QR session per training — one active session at a time."""
    training = models.ForeignKey(Training, on_delete=models.CASCADE, related_name='qr_sessions')
    qr_token = models.CharField(max_length=64, unique=True, db_index=True)
    session_token = models.CharField(max_length=64, blank=True, db_index=True)
    qr_image = models.TextField(blank=True)
    expires_at = models.DateTimeField()
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_qr_sessions')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Single-use enforcement
    is_used = models.BooleanField(default=False, db_index=True)
    used_at = models.DateTimeField(null=True, blank=True)
    used_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='used_qr_sessions',
    )

    class Meta:
        db_table = 'training_qr_sessions'
        ordering = ['-created_at']

    def __str__(self):
        return f"QR:{self.qr_token[:12]}… — {self.training.title}"

    @property
    def is_valid(self):
        return self.is_active and not self.is_used and timezone.now() < self.expires_at

    @classmethod
    def generate_for(cls, training, created_by, valid_hours=24):
        """Deactivate old sessions and create a fresh one."""
        cls.objects.filter(training=training, is_active=True).update(is_active=False)
        token = f"IND-QR-{uuid.uuid4().hex.upper()[:16]}"
        return cls.objects.create(
            training=training,
            qr_token=token,
            session_token=token,
            qr_image='',
            expires_at=timezone.now() + timezone.timedelta(hours=valid_hours),
            created_by=created_by,
            is_active=True,
            is_used=False,
        )
