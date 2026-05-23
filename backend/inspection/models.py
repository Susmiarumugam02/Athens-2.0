from django.db import models
from django.conf import settings
from authentication.models import Project
import uuid

class Inspection(models.Model):
    INSPECTION_TYPES = [
        ('quality', 'Quality Inspection'),
        ('civil', 'Civil Inspection'),
        ('electrical', 'Electrical Inspection'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='inspections')
    inspection_type = models.CharField(max_length=20, choices=INSPECTION_TYPES)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=200)
    scheduled_date = models.DateTimeField()
    actual_start_date = models.DateTimeField(null=True, blank=True)
    actual_end_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    inspector = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='inspections_assigned')
    witnessed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='inspections_witnessed', help_text="User who witnessed the inspection")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='inspections_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.title} - {self.get_inspection_type_display()}"

class InspectionItem(models.Model):
    COMPLIANCE_CHOICES = [
        ('compliant', 'Compliant'),
        ('non_compliant', 'Non-Compliant'),
        ('not_applicable', 'Not Applicable'),
        ('observation', 'Observation'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inspection = models.ForeignKey(Inspection, on_delete=models.CASCADE, related_name='items')
    item_number = models.CharField(max_length=20)
    description = models.TextField()
    requirement = models.TextField(blank=True)
    compliance_status = models.CharField(max_length=20, choices=COMPLIANCE_CHOICES)
    findings = models.TextField(blank=True)
    recommendations = models.TextField(blank=True)
    photo = models.ImageField(upload_to='inspection_photos/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['item_number']
        
    def __str__(self):
        return f"{self.inspection.title} - Item {self.item_number}"

class InspectionTemplate(models.Model):
    CATEGORY_CHOICES = [
        ('safety', 'Safety'),
        ('ehs', 'EHS'),
        ('compliance', 'Compliance'),
        ('monthly_audit', 'Monthly Safety Audit'),
        ('quality', 'Quality'),
        ('environmental', 'Environmental'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='safety')
    description = models.TextField(blank=True)
    # JSON structure: [{"section": "...", "items": [{"id": "...", "text": "...", "hint": "..."}]}]
    sections = models.JSONField(default=list)
    # JSON: [{"key": "...", "label": "...", "type": "text|date|select", "required": bool}]
    header_fields = models.JSONField(default=list)
    is_sample = models.BooleanField(default=False, help_text='Pre-loaded sample template')
    is_active = models.BooleanField(default=True)
    version = models.CharField(max_length=20, default='1.0')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"


class InspectionReport(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inspection = models.OneToOneField(Inspection, on_delete=models.CASCADE, related_name='report')
    summary = models.TextField()
    total_items = models.IntegerField(default=0)
    compliant_items = models.IntegerField(default=0)
    non_compliant_items = models.IntegerField(default=0)
    observations = models.IntegerField(default=0)
    overall_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    recommendations = models.TextField(blank=True)
    inspector_signature = models.TextField(blank=True)
    report_date = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Report for {self.inspection.title}"