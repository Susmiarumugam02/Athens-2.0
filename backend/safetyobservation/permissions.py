from rest_framework import permissions


def _has_observation_access_context(user):
    """Accept both legacy tenant IDs and the current company/project context."""
    if getattr(user, 'company_id', None) or getattr(user, 'tenant_id', None):
        return True

    raw_tenant_id = getattr(user, 'athens_tenant_id', None)
    if raw_tenant_id:
        return True

    project = getattr(user, 'project', None)
    return bool(project and getattr(project, 'company_id', None))


def _tenant_ids_match(user, obj):
    user_company_id = getattr(user, 'company_id', None) or getattr(user, 'tenant_id', None)
    obj_tenant_id = getattr(obj, 'athens_tenant_id', None)
    if user_company_id and obj_tenant_id:
        return str(user_company_id) == str(obj_tenant_id)

    raw_tenant_id = getattr(user, 'athens_tenant_id', None)
    if raw_tenant_id and obj_tenant_id:
        return str(raw_tenant_id) == str(obj_tenant_id)

    project = getattr(user, 'project', None)
    if project and getattr(obj, 'project_id', None):
        return getattr(project, 'id', None) == getattr(obj, 'project_id', None)

    return False

class SafetyObservationPermission(permissions.BasePermission):
    """
    Custom permission for SafetyObservation:
    - adminuser/companyuser with admin_type 'clientuser'/'client' or 'epcuser'/'epc' can create and view
    - adminuser/companyuser with admin_type 'contractoruser'/'contractor' can view only
    - projectadmin users can view/edit/delete observations created by their clientusers
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        user_type = getattr(user, 'user_type', None)
        if user_type in ['adminuser', 'companyuser']:
            admin_type = getattr(user, 'admin_type', None)
            if admin_type in ['epcuser', 'epc']:
                # Allow all operations including DELETE
                return True
            elif admin_type in ['clientuser', 'client']:
                # Allow create, safe methods, update methods, and DELETE
                if request.method in permissions.SAFE_METHODS or request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
                    return True
                else:
                    return False
            elif admin_type in ['contractoruser', 'contractor']:
                # View and update if assigned, no DELETE
                if request.method in permissions.SAFE_METHODS or request.method in ['PUT', 'PATCH']:
                    return True
                else:
                    return False
            elif admin_type:
                return False

        if user_type == 'projectadmin':
            # Allow access to list and retrieve views; object-level permissions will handle edit/delete
            if view.action in ['list', 'retrieve']:
                return True
            # For create, update, delete, permission will be checked at object level
            if view.action in ['create', 'update', 'partial_update', 'destroy']:
                return True
            return False

        # Fallback: regular company users may have role_type='user' and no admin_type.
        # They still need Safety Observation access after onboarding/training unlock.
        if _has_observation_access_context(user):
            return True

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        user_type = getattr(user, 'user_type', None)
        if user_type in ['adminuser', 'companyuser']:
            admin_type = getattr(user, 'admin_type', None)
            if admin_type in ['epcuser', 'epc']:
                # EPCUser has full permissions for all observations (except closed ones for modifications)
                if request.method == 'DELETE':
                    return True  # Allow delete regardless of status
                elif obj.observationStatus.lower() != 'closed':
                    # Allow all operations for non-closed observations
                    return True
                else:
                    # If observation is closed, allow only safe methods (view)
                    return request.method in permissions.SAFE_METHODS
            elif admin_type in ['clientuser', 'client']:
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
            elif admin_type in ['contractoruser', 'contractor']:
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
            elif admin_type:
                return False

        if user_type == 'projectadmin':
            # projectadmin can view/edit/delete observations created by their clientusers
            # Check if the observation's created_by user was created by this projectadmin
            if obj.created_by and obj.created_by.created_by == user:
                return True
            else:
                return False

        if _tenant_ids_match(user, obj):
            if request.method in permissions.SAFE_METHODS:
                return True
            if request.method in ['PUT', 'PATCH']:
                return obj.created_by == user and obj.observationStatus.lower() != 'closed'
            if request.method == 'DELETE':
                return obj.created_by == user

        return False
