# Project Isolation Utilities
# Ensures data isolation between different companies/projects

from django.db import models
from django.core.exceptions import PermissionDenied
import logging

logger = logging.getLogger(__name__)

def get_user_project(user):
    """Get the project assigned to a user"""
    return getattr(user, 'project', None)

def apply_project_isolation(queryset, user):
    """
    Apply project isolation to any queryset
    Only returns data from the user's assigned project
    """
    user_project = get_user_project(user)
    
    if not user_project:
        # If user has no project, return empty queryset
        return queryset.none()
    
    # Check if the model has a project field
    model = queryset.model
    
    if hasattr(model, 'project'):
        return queryset.filter(project=user_project)
    elif hasattr(model, 'project_id'):
        return queryset.filter(project_id=user_project.id)
    elif hasattr(model, 'site') and hasattr(model.site.field.related_model, 'project'):
        # For models that reference project through a site field
        return queryset.filter(site__project=user_project)
    else:
        # If no project field found, log warning and return empty queryset for safety
        logger.warning(f"No project field found in model {model.__name__} for isolation")
        return queryset.none()

def apply_user_project_isolation(queryset, user):
    """
    Apply project isolation specifically for user querysets
    """
    user_project = get_user_project(user)
    
    if not user_project:
        return queryset.none()
    
    return queryset.filter(project=user_project)

def apply_user_project_isolation_with_induction(queryset, user):
    """
    Apply project isolation for users with induction training filter
    """
    user_project = get_user_project(user)
    
    if not user_project:
        return queryset.none()
    
    # Filter by project and add induction training requirement
    filtered_queryset = queryset.filter(project=user_project)
    
    try:
        # Try to apply induction training filter if the model exists
        from inductiontraining.models import InductionTraining
        
        # Get users who have completed induction training
        trained_user_ids = InductionTraining.objects.filter(
            project=user_project,
            is_approved=True
        ).values_list('user_id', flat=True)
        
        # Include users who have completed induction training
        filtered_queryset = filtered_queryset.filter(id__in=trained_user_ids)
        
    except ImportError:
        # If induction training module doesn't exist, just return project-filtered queryset
        pass
    except Exception as e:
        logger.debug(f"Error applying induction filter: {str(e)}")
    
    return filtered_queryset

def validate_project_access(user, obj):
    """
    Validate that a user has access to a specific object based on project isolation
    Raises PermissionDenied if access is not allowed
    """
    user_project = get_user_project(user)
    
    if not user_project:
        raise PermissionDenied("User must be assigned to a project")
    
    # Check object's project
    obj_project = None
    if hasattr(obj, 'project'):
        obj_project = obj.project
    elif hasattr(obj, 'project_id'):
        obj_project_id = obj.project_id
        if obj_project_id:
            from .models import Project
            try:
                obj_project = Project.objects.get(id=obj_project_id)
            except Project.DoesNotExist:
                raise PermissionDenied("Object's project not found")
    elif hasattr(obj, 'site') and hasattr(obj.site, 'project'):
        obj_project = obj.site.project
    
    if not obj_project or obj_project.id != user_project.id:
        raise PermissionDenied("Access denied: Object belongs to different project")
    
    return True

def get_project_isolated_queryset(model_class, user):
    """
    Get a project-isolated queryset for any model
    """
    queryset = model_class.objects.all()
    return apply_project_isolation(queryset, user)

class ProjectIsolationMixin:
    """
    Mixin for ViewSets to automatically apply project isolation
    """
    
    def get_queryset(self):
        queryset = super().get_queryset()
        return apply_project_isolation(queryset, self.request.user)
    
    def perform_create(self, serializer):
        user_project = get_user_project(self.request.user)
        if not user_project:
            raise PermissionDenied("User must be assigned to a project")
        
        # Try to set project field
        if hasattr(serializer.Meta.model, 'project'):
            serializer.save(project=user_project)
        elif hasattr(serializer.Meta.model, 'site'):
            # For models that use site field, we need to find or create a site for this project
            serializer.save()  # Let the model handle site assignment
        else:
            serializer.save()

def ensure_project_isolation_middleware(get_response):
    """
    Middleware to ensure project isolation is applied to all requests
    """
    def middleware(request):
        # Add project isolation context to request
        if hasattr(request, 'user') and request.user.is_authenticated:
            request.user_project = get_user_project(request.user)
        
        response = get_response(request)
        return response
    
    return middleware