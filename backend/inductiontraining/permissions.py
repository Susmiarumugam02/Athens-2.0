from rest_framework import permissions

class IsCreatorOrReadOnlyWithStatusCheck(permissions.BasePermission):
    """
    Custom permission to only allow creators of an object to edit it.
    Only allows edit/delete when status is 'planned'.
    """
    
    def has_permission(self, request, view):
        # Read permissions are allowed to any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # Write permissions are only allowed to authenticated users
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # For UPDATE/DELETE operations, only allow if status is 'planned'
        if request.method in ['PUT', 'PATCH', 'DELETE']:
            if obj.status != 'planned':
                return False
        
        # Check if user is project admin
        if hasattr(request.user, 'django_user_type') and request.user.django_user_type == 'projectadmin':
            return True
            
        # Write permissions are only allowed to the creator
        return obj.created_by == request.user