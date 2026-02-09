from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from authentication.models import CustomUser

class PermissionRequest(models.Model):
    PERMISSION_TYPES = [
        ('edit', 'Edit'),
        ('delete', 'Delete'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('denied', 'Denied'),
    ]
    
    requester = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='permission_requests')
    approver = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='permission_approvals')
    permission_type = models.CharField(max_length=10, choices=PERMISSION_TYPES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    reason = models.TextField()
    
    # Generic relation to any model
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['requester', 'content_type', 'object_id', 'permission_type', 'status']

class PermissionGrant(models.Model):
    permission_request = models.OneToOneField(PermissionRequest, on_delete=models.CASCADE)
    used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()
    
    class Meta:
        db_table = 'permissions_permissiongrant'