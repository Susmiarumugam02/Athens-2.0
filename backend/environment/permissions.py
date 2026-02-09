from rest_framework import permissions

class ESGPermission(permissions.BasePermission):
    """
    Custom permission for ESG operations
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Master admin has full access
        if hasattr(request.user, 'admin_type') and request.user.admin_type in ['master', 'masteradmin']:
            return True
        
        # ESG roles have access
        if hasattr(request.user, 'esg_role') and request.user.esg_role:
            return True
        
        # Admin users and project admins have access
        if request.user.user_type in ['projectadmin', 'adminuser', 'clientuser', 'epcuser', 'contractoruser']:
            return True
        
        # Admin types have access
        if hasattr(request.user, 'admin_type') and request.user.admin_type in ['client', 'epc', 'contractor']:
            return True
        
        return False
    
    def has_object_permission(self, request, view, obj):
        if not self.has_permission(request, view):
            return False
        
        # Master admin can access all objects
        if hasattr(request.user, 'admin_type') and request.user.admin_type in ['master', 'masteradmin']:
            return True
        
        # Users can only access objects from their project
        if hasattr(obj, 'site') and hasattr(request.user, 'project'):
            return obj.site == request.user.project
        
        return True
