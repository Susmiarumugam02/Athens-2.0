from django.contrib import admin
from .models import Project, ProjectMembership


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "company", "status", "created_at"]
    list_filter = ["status", "company"]
    search_fields = ["name", "code"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(ProjectMembership)
class ProjectMembershipAdmin(admin.ModelAdmin):
    list_display = ["user", "project", "role", "is_active", "created_at"]
    list_filter = ["role", "is_active", "project"]
    search_fields = ["user__email", "project__name"]
    readonly_fields = ["created_at", "updated_at"]
