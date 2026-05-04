from rest_framework.permissions import BasePermission

class QualityManagerPermission(BasePermission):
    """
    Permission for quality management operations
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Allow all authenticated users for now
        return True

class QualityInspectorPermission(BasePermission):
    """
    Permission for quality inspectors
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Allow all authenticated users for now
        return True