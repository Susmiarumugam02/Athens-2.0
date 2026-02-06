from django.db import models
from django.utils.text import slugify


class ProjectStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    INACTIVE = "inactive", "Inactive"
    ARCHIVED = "archived", "Archived"


class ProjectRole(models.TextChoices):
    OWNER = "owner", "Owner"
    ADMIN = "admin", "Admin"
    MEMBER = "member", "Member"
    VIEWER = "viewer", "Viewer"


class Project(models.Model):
    company = models.ForeignKey("control_plane.Tenant", on_delete=models.CASCADE, related_name="projects")
    name = models.CharField(max_length=255)
    code = models.SlugField(max_length=100, db_index=True)
    status = models.CharField(max_length=20, choices=ProjectStatus.choices, default=ProjectStatus.ACTIVE)
    
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    
    created_by = models.ForeignKey("authentication.User", on_delete=models.SET_NULL, null=True, related_name="created_projects")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = "projects"
        ordering = ["-created_at"]
        unique_together = [("company", "code"), ("company", "name")]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["code"]),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.code})"
    
    def save(self, *args, **kwargs):
        if not self.code:
            base_slug = slugify(self.name)
            self.code = base_slug
            counter = 1
            while Project.objects.filter(company=self.company, code=self.code).exists():
                self.code = f"{base_slug}-{counter}"
                counter += 1
        super().save(*args, **kwargs)


class ProjectMembership(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey("authentication.User", on_delete=models.CASCADE, related_name="project_memberships")
    role = models.CharField(max_length=20, choices=ProjectRole.choices, default=ProjectRole.MEMBER)
    is_active = models.BooleanField(default=True)
    
    created_by = models.ForeignKey("authentication.User", on_delete=models.SET_NULL, null=True, related_name="created_memberships")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = "project_memberships"
        ordering = ["-created_at"]
        unique_together = [("project", "user")]
        indexes = [
            models.Index(fields=["project", "is_active"]),
            models.Index(fields=["user", "is_active"]),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.project.name} ({self.role})"
