import secrets
import uuid
from datetime import timedelta
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from worker.models import Worker

def _generate_join_code() -> str:
    return f"{secrets.randbelow(10**6):06d}"

class ToolboxTalk(models.Model):
    STATUS_CHOICES = (
        ('planned', _('Planned')),
        ('completed', _('Completed')),
        ('cancelled', _('Cancelled')),
    )
    
    DURATION_UNIT_CHOICES = (
        ('minutes', _('Minutes')),
        ('hours', _('Hours')),
    )
    
    # Multi-tenant isolation field - MANDATORY
    athens_tenant_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="Athens tenant identifier for multi-tenant isolation"
    )
    
    title = models.CharField(_('Title'), max_length=255)
    description = models.TextField(_('Description'), blank=True)
    date = models.DateField(_('Date'))
    duration = models.PositiveIntegerField(_('Duration'), default=30)
    duration_unit = models.CharField(_('Duration Unit'), max_length=10, choices=DURATION_UNIT_CHOICES, default='minutes')
    location = models.CharField(_('Location'), max_length=255)
    conducted_by = models.CharField(_('Conducted By'), max_length=255)
    status = models.CharField(_('Status'), max_length=20, choices=STATUS_CHOICES, default='planned')
    project = models.ForeignKey(
        'authentication.Project',
        on_delete=models.CASCADE,
        related_name='toolbox_talks',
        null=True,
        blank=True
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='created_toolbox_talks',
        verbose_name=_('Created By')
    )
    evidence_photo = models.ImageField(_('Evidence Photo'), upload_to='toolbox_talk_evidence/', blank=True, null=True)
    join_code = models.CharField(_('Join Code'), max_length=12, blank=True, null=True)
    qr_token = models.CharField(_('QR Token'), max_length=64, blank=True, null=True)
    qr_expires_at = models.DateTimeField(_('QR Expires At'), blank=True, null=True)
    created_at = models.DateTimeField(_('Created At'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Updated At'), auto_now=True)
    
    class Meta:
        verbose_name = _('Toolbox Talk')
        verbose_name_plural = _('Toolbox Talks')
        ordering = ['-date']
    
    def save(self, *args, **kwargs):
        if not self.join_code:
            self.join_code = _generate_join_code()
        if not self.qr_token:
            self.qr_token = uuid.uuid4().hex
        if not self.qr_expires_at:
            self.qr_expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.title
    
    @property
    def total_minutes(self):
        """Calculate total duration in minutes"""
        if self.duration_unit == 'hours':
            return self.duration * 60
        return self.duration


class ToolboxTalkAttendance(models.Model):
    STATUS_CHOICES = (
        ('present', _('Present')),
        ('absent', _('Absent')),
    )
    
    # Multi-tenant isolation field - MANDATORY
    athens_tenant_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="Athens tenant identifier for multi-tenant isolation"
    )
    
    toolbox_talk = models.ForeignKey(
        ToolboxTalk, 
        on_delete=models.CASCADE, 
        related_name='attendance_records',
        verbose_name=_('Toolbox Talk')
    )
    worker = models.ForeignKey(
        Worker,
        on_delete=models.CASCADE,
        related_name='toolbox_talk_attendance',
        verbose_name=_('Worker')
    )
    status = models.CharField(_('Status'), max_length=10, choices=STATUS_CHOICES, default='present')
    attendance_photo = models.ImageField(_('Attendance Photo'), upload_to='toolbox_talk_attendance/', blank=True, null=True)
    match_score = models.FloatField(_('Match Score'), default=0)
    timestamp = models.DateTimeField(_('Timestamp'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('Toolbox Talk Attendance')
        verbose_name_plural = _('Toolbox Talk Attendance Records')
        unique_together = ('toolbox_talk', 'worker')
    
    def __str__(self):
        return f"{self.worker.name} - {self.toolbox_talk.title} - {self.status}"
