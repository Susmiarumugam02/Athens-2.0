from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

class WorkType(models.Model):
    """Work types for manpower tracking"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    color_code = models.CharField(max_length=7, default='#1890ff')  # Hex color
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

class ManpowerEntry(models.Model):
    GENDER_CHOICES = [
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Others', 'Others'),
    ]

    SHIFT_CHOICES = [
        ('day', 'Day Shift'),
        ('night', 'Night Shift'),
        ('general', 'General'),
    ]

    ATTENDANCE_STATUS_CHOICES = [
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('late', 'Late'),
        ('half_day', 'Half Day'),
    ]

    date = models.DateField()
    category = models.CharField(max_length=100)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    count = models.PositiveIntegerField(validators=[MinValueValidator(0)])

    # Enhanced fields
    work_type = models.ForeignKey(
        WorkType,
        on_delete=models.CASCADE,
        related_name='manpower_entries',
        null=True,
        blank=True
    )
    shift = models.CharField(max_length=10, choices=SHIFT_CHOICES, default='general', null=True, blank=True)
    hours_worked = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        default=8.0,
        validators=[MinValueValidator(0), MaxValueValidator(24)],
        null=True,
        blank=True
    )
    overtime_hours = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        default=0.0,
        validators=[MinValueValidator(0), MaxValueValidator(12)],
        null=True,
        blank=True
    )
    attendance_status = models.CharField(
        max_length=10,
        choices=ATTENDANCE_STATUS_CHOICES,
        default='present',
        null=True,
        blank=True
    )
    notes = models.TextField(blank=True, null=True)

    # User tracking fields
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='created_manpower_entries'
    )
    project = models.ForeignKey(
        'authentication.Project',
        on_delete=models.CASCADE,
        related_name='manpower_entries',
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        permissions = [
            ("view_all_manpower", "Can view all manpower entries"),
            ("manage_manpower", "Can manage manpower entries"),
        ]

    class Meta:
        permissions = [
            ("view_all_manpower", "Can view all manpower entries"),
            ("manage_manpower", "Can manage manpower entries"),
        ]
        unique_together = ['date', 'category', 'gender', 'work_type', 'shift', 'created_by']
        ordering = ['-date', 'category', 'gender']

    def __str__(self):
        work_type_str = f" - {self.work_type.name}" if self.work_type else ""
        shift_str = f" ({self.shift})" if self.shift != 'general' else ""
        return f"{self.date} - {self.category} - {self.gender}: {self.count}{work_type_str}{shift_str}"

    @property
    def total_hours(self):
        """Calculate total hours including overtime"""
        return float(self.hours_worked) + float(self.overtime_hours)

    @property
    def efficiency_score(self):
        """Calculate efficiency based on hours worked vs standard 8 hours"""
        if self.count == 0:
            return 0
        standard_hours = 8.0
        actual_hours = float(self.hours_worked)
        return min((actual_hours / standard_hours) * 100, 100)

class DailyManpowerSummary(models.Model):
    """Daily summary of manpower for quick reporting"""
    date = models.DateField(unique=True)
    total_workers = models.PositiveIntegerField(default=0)
    total_hours = models.DecimalField(max_digits=8, decimal_places=1, default=0)
    total_overtime = models.DecimalField(max_digits=8, decimal_places=1, default=0)
    present_count = models.PositiveIntegerField(default=0)
    absent_count = models.PositiveIntegerField(default=0)
    late_count = models.PositiveIntegerField(default=0)
    half_day_count = models.PositiveIntegerField(default=0)

    # Project relationship
    project = models.ForeignKey(
        'authentication.Project',
        on_delete=models.CASCADE,
        related_name='daily_summaries',
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']
        unique_together = ['date', 'project']

    def __str__(self):
        return f"Summary for {self.date}: {self.total_workers} workers"

    def calculate_efficiency(self):
        """Calculate overall efficiency for the day"""
        if self.total_workers == 0:
            return 0
        standard_hours = self.total_workers * 8
        return min((float(self.total_hours) / standard_hours) * 100, 100) if standard_hours > 0 else 0
