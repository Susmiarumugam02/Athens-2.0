from rest_framework import permissions

class SafetyObservationPermission(permissions.BasePermission):
    """
    Custom permission for SafetyObservation:
    - adminuser with admin_type 'clientuser' or 'epcuser' can create and view
    - adminuser with admin_type 'contractoruser' can view only
    - projectadmin users can view/edit/delete observations created by their clientusers
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if getattr(user, 'user_type', None) == 'adminuser':
            admin_type = getattr(user, 'admin_type', None)
            if admin_type == 'epcuser':
                # Allow all operations including DELETE
                return True
            elif admin_type == 'clientuser':
                # Allow create, safe methods, update methods, and DELETE
                if request.method in permissions.SAFE_METHODS or request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
                    return True
                else:
                    return False
            elif admin_type == 'contractoruser':
                # View and update if assigned, no DELETE
                if request.method in permissions.SAFE_METHODS or request.method in ['PUT', 'PATCH']:
                    return True
                else:
                    return False
            else:
                return False

        if getattr(user, 'user_type', None) == 'projectadmin':
            # Allow access to list and retrieve views; object-level permissions will handle edit/delete
            if view.action in ['list', 'retrieve']:
                return True
            # For create, update, delete, permission will be checked at object level
            if view.action in ['create', 'update', 'partial_update', 'destroy']:
                return True
            return False

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if getattr(user, 'user_type', None) == 'adminuser':
            admin_type = getattr(user, 'admin_type', None)
            if admin_type == 'epcuser':
                # EPCUser has full permissions for all observations (except closed ones for modifications)
                if request.method == 'DELETE':
                    return True  # Allow delete regardless of status
                elif obj.observationStatus.lower() != 'closed':
                    # Allow all operations for non-closed observations
                    return True
                else:
                    # If observation is closed, allow only safe methods (view)
                    return request.method in permissions.SAFE_METHODS
            elif admin_type == 'clientuser':
                # ClientUser can view all and update/delete if they created it
                if request.method in permissions.SAFE_METHODS:
                    return True
                elif request.method == 'DELETE':
                    # Allow delete if they created it
                    return obj.created_by == user
                elif request.method in ['PUT', 'PATCH']:
                    # Allow update if they created it or are assigned to it (and not closed)
                    if obj.observationStatus.lower() != 'closed':
                        if obj.created_by == user or obj.correctiveActionAssignedTo == user.username:
                            return True
                    return False
                else:
                    return False
            elif admin_type == 'contractoruser':
                # View and update if assigned to them, no DELETE
                if request.method in permissions.SAFE_METHODS:
                    return True
                elif request.method in ['PUT', 'PATCH']:
                    # Allow update if they are assigned to this observation (and not closed)
                    if obj.observationStatus.lower() != 'closed' and obj.correctiveActionAssignedTo == user.username:
                        return True
                    return False
                else:
                    return False
            else:
                return False

        if getattr(user, 'user_type', None) == 'projectadmin':
            # projectadmin can view/edit/delete observations created by their clientusers
            # Check if the observation's created_by user was created by this projectadmin
            if obj.created_by and obj.created_by.created_by == user:
                return True
            else:
                return False

        return False
