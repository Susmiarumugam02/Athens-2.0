from django.db import models
from authentication.models import User

class ProjectModule(models.Model):
    """Track which module components are enabled for each project"""
    MODULE_CHOICES = [
        # ERGON Category Components
        ('ergon_tasks', 'ERGON - Task Management'),
        ('ergon_planner', 'ERGON - Daily Planner'),
        ('ergon_followups', 'ERGON - Follow-ups'),
        ('ergon_advance', 'ERGON - Advance/Expenses'),
        ('ergon_manpower', 'ERGON - Manpower/Machinery'),
        ('ergon_ledger', 'ERGON - Financial Ledger'),
        
        # Workforce Category Components
        ('workforce_profile', 'Workforce - Profile Management'),
        ('workforce_attendance', 'Workforce - Attendance'),
        ('workforce_leave', 'Workforce - Leave Management'),
        
        # Other Modules
        ('ptw', 'Permit to Work'),
        ('incident', 'Incident Management'),
        ('safety', 'Safety Observation'),
        ('training', 'Training'),
    ]
    
    project_id = models.IntegerField(db_index=True)
    athens_tenant_id = models.IntegerField(db_index=True)
    module_code = models.CharField(max_length=50, choices=MODULE_CHOICES)
    is_enabled = models.BooleanField(default=True)
    enabled_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    enabled_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'project_modules'
        unique_together = ['project_id', 'module_code']
        indexes = [
            models.Index(fields=['project_id', 'is_enabled']),
            models.Index(fields=['athens_tenant_id', 'module_code'])
        ]
