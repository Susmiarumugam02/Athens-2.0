from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class WorkType(models.Model):
    """Work types for manpower tracking"""
    athens_tenant_id = models.IntegerField(db_index=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    color_code = models.CharField(max_length=7, default='#1890ff')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ergon_work_type'
        ordering = ['name']
        unique_together = [['athens_tenant_id', 'name']]
        indexes = [
            models.Index(fields=['athens_tenant_id', 'is_active']),
        ]

    def __str__(self):
        return f"{self.name} (Tenant: {self.athens_tenant_id})"


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

    athens_tenant_id = models.IntegerField(db_index=True)
    project_id = models.BigIntegerField(null=True, blank=True, db_index=True)
    date = models.DateField()
    category = models.CharField(max_length=100)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    count = models.PositiveIntegerField(validators=[MinValueValidator(0)])
    
    work_type = models.ForeignKey(
        WorkType,
        on_delete=models.SET_NULL,
        related_name='manpower_entries',
        null=True,
        blank=True
    )
    shift = models.CharField(max_length=10, choices=SHIFT_CHOICES, default='general')
    hours_worked = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        default=8.0,
        validators=[MinValueValidator(0), MaxValueValidator(24)]
    )
    overtime_hours = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        default=0.0,
        validators=[MinValueValidator(0), MaxValueValidator(12)]
    )
    attendance_status = models.CharField(
        max_length=10,
        choices=ATTENDANCE_STATUS_CHOICES,
        default='present'
    )
    notes = models.TextField(blank=True)
    
    created_by_id = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ergon_manpower_entry'
        ordering = ['-date', 'category', 'gender']
        indexes = [
            models.Index(fields=['athens_tenant_id', 'date']),
            models.Index(fields=['athens_tenant_id', 'project_id', 'date']),
            models.Index(fields=['created_by_id']),
        ]

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
    athens_tenant_id = models.IntegerField(db_index=True)
    project_id = models.BigIntegerField(null=True, blank=True, db_index=True)
    date = models.DateField()
    total_workers = models.PositiveIntegerField(default=0)
    total_hours = models.DecimalField(max_digits=8, decimal_places=1, default=0)
    total_overtime = models.DecimalField(max_digits=8, decimal_places=1, default=0)
    present_count = models.PositiveIntegerField(default=0)
    absent_count = models.PositiveIntegerField(default=0)
    late_count = models.PositiveIntegerField(default=0)
    half_day_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ergon_daily_manpower_summary'
        ordering = ['-date']
        unique_together = [['athens_tenant_id', 'project_id', 'date']]
        indexes = [
            models.Index(fields=['athens_tenant_id', 'date']),
            models.Index(fields=['athens_tenant_id', 'project_id', 'date']),
        ]

    def __str__(self):
        return f"Summary for {self.date}: {self.total_workers} workers (Tenant: {self.athens_tenant_id})"

    def calculate_efficiency(self):
        """Calculate overall efficiency for the day"""
        if self.total_workers == 0:
            return 0
        standard_hours = self.total_workers * 8
        return min((float(self.total_hours) / standard_hours) * 100, 100) if standard_hours > 0 else 0
