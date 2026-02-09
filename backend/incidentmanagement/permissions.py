from rest_framework import permissions
from django.contrib.auth import get_user_model

User = get_user_model()


class CanManageIncidents(permissions.BasePermission):
    """
    Enhanced permission class for incident management operations
    Integrates with the sophisticated user management hierarchy
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        # Allow all authenticated users to view incidents within their project
        if request.method in permissions.SAFE_METHODS:
            return True

        # Master admin has full access
        if getattr(request.user, 'admin_type', None) == 'master':
            return True

        # Project admins and their users can manage incidents
        allowed_admin_types = [
            'client', 'epc', 'contractor',  # Project admins
            'clientuser', 'epcuser', 'contractoruser'  # Admin users
        ]

        user_admin_type = getattr(request.user, 'admin_type', None)
        return user_admin_type in allowed_admin_types
    
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False

        # Master admin has full access
        if getattr(request.user, 'admin_type', None) == 'master':
            return True

        # Project-based access control
        user_project = getattr(request.user, 'project', None)
        incident_project = getattr(obj, 'project', None)

        # Users can only access incidents from their project
        if user_project and incident_project and user_project != incident_project:
            return False

        # Allow read access to all authenticated users within the same project
        if request.method in permissions.SAFE_METHODS:
            return True

        # For DELETE operations - company-type-based permissions
        if request.method == 'DELETE':
            user_admin_type = getattr(request.user, 'admin_type', None)
            
            # Handle different object types (Incident vs EightDProcess)
            if hasattr(obj, 'reported_by'):
                # This is an Incident object
                reporter_admin_type = getattr(obj.reported_by, 'admin_type', None)
            elif hasattr(obj, 'incident'):
                # This is an EightDProcess object
                reporter_admin_type = getattr(obj.incident.reported_by, 'admin_type', None)
            else:
                return False

            # Company type mapping for admin users
            company_type_mapping = {
                'clientuser': 'client',
                'epcuser': 'epc',
                'contractoruser': 'contractor'
            }

            # Get user's company type (normalize admin users to their parent company type)
            if user_admin_type in ['client', 'epc', 'contractor']:
                user_company_type = user_admin_type
            elif user_admin_type in company_type_mapping:
                user_company_type = company_type_mapping[user_admin_type]
            else:
                # If user doesn't have a valid admin_type for deletion, deny access
                return False

            # Get reporter's company type
            if reporter_admin_type in ['client', 'epc', 'contractor']:
                reporter_company_type = reporter_admin_type
            else:
                reporter_company_type = company_type_mapping.get(reporter_admin_type)

            # User can only delete incidents from their company type
            return user_company_type == reporter_company_type

        # For EDIT operations - allow modification by:
        # 1. Incident reporter
        # 2. Assigned investigator  
        # 3. Same company type admins and users
        
        # Handle different object types (Incident vs EightDProcess)
        if hasattr(obj, 'reported_by'):
            # This is an Incident object
            if obj.reported_by == request.user or obj.assigned_investigator == request.user:
                return True
            reporter = obj.reported_by
        elif hasattr(obj, 'incident'):
            # This is an EightDProcess object
            if obj.incident.reported_by == request.user or obj.incident.assigned_investigator == request.user:
                return True
            reporter = obj.incident.reported_by
        else:
            return False

        user_admin_type = getattr(request.user, 'admin_type', None)

        # Project admins and admin users can modify incidents from their company type
        company_type_mapping = {
            'clientuser': 'client',
            'epcuser': 'epc',
            'contractoruser': 'contractor'
        }

        # Get user's company type (normalize admin users to their parent company type)
        if user_admin_type in ['client', 'epc', 'contractor']:
            user_company_type = user_admin_type
        elif user_admin_type in company_type_mapping:
            user_company_type = company_type_mapping[user_admin_type]
        else:
            user_company_type = None

        if user_company_type:
            reporter_admin_type = getattr(reporter, 'admin_type', None)

            # Get reporter's company type
            if reporter_admin_type in ['client', 'epc', 'contractor']:
                reporter_company_type = reporter_admin_type
            else:
                reporter_company_type = company_type_mapping.get(reporter_admin_type)

            return user_company_type == reporter_company_type

        return False


class CanInvestigateIncidents(permissions.BasePermission):
    """
    Permission class for incident investigation operations
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Allow viewing for all authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Allow investigation management for specific user types
        allowed_user_types = [
            'adminuser', 'clientuser', 'epcuser',
            'client', 'epc', 'master'
        ]
        
        return request.user.user_type in allowed_user_types
    
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        # Allow read access to all authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Allow modification by assigned investigator, team members, or admin users
        if (obj.investigator == request.user or
            obj.team_members.filter(id=request.user.id).exists() or
            request.user.user_type in ['adminuser', 'master']):
            return True
        
        return False


class CanManageCAPAs(permissions.BasePermission):
    """
    Permission class for CAPA management operations
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Allow viewing for all authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Allow CAPA management for specific user types
        allowed_user_types = [
            'adminuser', 'clientuser', 'epcuser', 'contractoruser',
            'client', 'epc', 'contractor', 'master'
        ]
        
        return request.user.user_type in allowed_user_types
    
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        # Allow read access to all authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Allow modification by assigned person, verifier, or admin users
        if (obj.assigned_person == request.user or
            obj.verified_by == request.user or
            request.user.user_type in ['adminuser', 'master']):
            return True
        
        return False


class CanViewReports(permissions.BasePermission):
    """
    Permission class for viewing incident management reports
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Allow report viewing for management and admin users
        allowed_user_types = [
            'adminuser', 'clientuser', 'epcuser',
            'client', 'epc', 'master'
        ]
        
        return request.user.user_type in allowed_user_types


# === COMMERCIAL GRADE PERMISSION CLASSES ===

class CanViewFinancialData(permissions.BasePermission):
    """
    Permission to view financial/cost data related to incidents
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        # Master admin has full access
        if getattr(request.user, 'admin_type', None) == 'master':
            return True

        # Only project admins and specific roles can view financial data
        allowed_admin_types = ['client', 'epc', 'contractor']
        user_admin_type = getattr(request.user, 'admin_type', None)

        return user_admin_type in allowed_admin_types


class CanManageRiskAssessment(permissions.BasePermission):
    """
    Permission to manage risk assessments and risk-related data
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        # Master admin has full access
        if getattr(request.user, 'admin_type', None) == 'master':
            return True

        # Safety officers, project admins, and EPC users can manage risk assessments
        allowed_admin_types = ['client', 'epc', 'contractor', 'epcuser']
        user_admin_type = getattr(request.user, 'admin_type', None)

        # Check if user has safety officer role (can be extended with custom roles)
        if hasattr(request.user, 'designation') and 'safety' in request.user.designation.lower():
            return True

        return user_admin_type in allowed_admin_types


class CanAccessAnalytics(permissions.BasePermission):
    """
    Permission to access analytics and reporting features
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        # Master admin has full access
        if getattr(request.user, 'admin_type', None) == 'master':
            return True

        # Project admins and senior roles can access analytics
        allowed_admin_types = ['client', 'epc', 'contractor']
        user_admin_type = getattr(request.user, 'admin_type', None)

        # Grade A users (Site Incharge) can also access analytics
        if getattr(request.user, 'grade', None) == 'A':
            return True

        return user_admin_type in allowed_admin_types


class CanManageWorkflows(permissions.BasePermission):
    """
    Permission to manage incident workflows and templates
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        # Master admin has full access
        if getattr(request.user, 'admin_type', None) == 'master':
            return True

        # Only project admins can manage workflows
        allowed_admin_types = ['client', 'epc', 'contractor']
        user_admin_type = getattr(request.user, 'admin_type', None)

        return user_admin_type in allowed_admin_types


class CanApproveIncidents(permissions.BasePermission):
    """
    Permission to approve incidents and related actions
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        # Master admin has full access
        if getattr(request.user, 'admin_type', None) == 'master':
            return True

        # Project admins and Grade A users can approve
        allowed_admin_types = ['client', 'epc', 'contractor']
        user_admin_type = getattr(request.user, 'admin_type', None)

        # Grade A users (Site Incharge) can approve
        if getattr(request.user, 'grade', None) == 'A':
            return True

        return user_admin_type in allowed_admin_types


class CanExportData(permissions.BasePermission):
    """
    Permission to export incident data and reports
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        # Master admin has full access
        if getattr(request.user, 'admin_type', None) == 'master':
            return True

        # Project admins and Grade A/B users can export data
        allowed_admin_types = ['client', 'epc', 'contractor']
        user_admin_type = getattr(request.user, 'admin_type', None)

        # Grade A and B users can export data
        if getattr(request.user, 'grade', None) in ['A', 'B']:
            return True

        return user_admin_type in allowed_admin_types


class CanManage8DProcessElements(permissions.BasePermission):
    """
    Permission to manage 8D process elements (teams, containment actions, root causes, etc.)
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        # Master admin has full access
        if getattr(request.user, 'admin_type', None) == 'master':
            return True

        # Allow viewing for all authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True

        # Allow 8D process management for specific user types
        allowed_admin_types = [
            'client', 'epc', 'contractor',  # Project admins
            'clientuser', 'epcuser', 'contractoruser'  # Admin users
        ]

        user_admin_type = getattr(request.user, 'admin_type', None)
        return user_admin_type in allowed_admin_types

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False

        # Master admin has full access
        if getattr(request.user, 'admin_type', None) == 'master':
            return True

        # Allow read access to all authenticated users within the same project
        if request.method in permissions.SAFE_METHODS:
            user_project = getattr(request.user, 'project', None)

            # Handle different object types that might have project relationships
            if hasattr(obj, 'eight_d_process') and hasattr(obj.eight_d_process, 'incident'):
                return obj.eight_d_process.incident.project == user_project
            elif hasattr(obj, 'incident'):
                return obj.incident.project == user_project

            return True

        # For write operations, check project-based access and user permissions
        user_project = getattr(request.user, 'project', None)
        user_admin_type = getattr(request.user, 'admin_type', None)

        # Check if user has permission to manage 8D elements
        allowed_admin_types = [
            'client', 'epc', 'contractor',  # Project admins
            'clientuser', 'epcuser', 'contractoruser'  # Admin users
        ]

        if user_admin_type not in allowed_admin_types:
            return False

        # Check project access
        if hasattr(obj, 'eight_d_process') and hasattr(obj.eight_d_process, 'incident'):
            return obj.eight_d_process.incident.project == user_project
        elif hasattr(obj, 'incident'):
            return obj.incident.project == user_project

        return True


class ProjectBasedPermission(permissions.BasePermission):
    """
    Base permission class that enforces project-based access control
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        # Master admin bypasses project restrictions
        if getattr(request.user, 'admin_type', None) == 'master':
            return True

        # All other users must have a project assigned
        return hasattr(request.user, 'project') and request.user.project is not None

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False

        # Master admin has access to all objects
        if getattr(request.user, 'admin_type', None) == 'master':
            return True

        # Check if object belongs to user's project
        user_project = getattr(request.user, 'project', None)

        # Handle different object types that might have project relationships
        if hasattr(obj, 'project'):
            return obj.project == user_project
        elif hasattr(obj, 'incident') and hasattr(obj.incident, 'project'):
            return obj.incident.project == user_project
        elif hasattr(obj, 'reported_by') and hasattr(obj.reported_by, 'project'):
            return obj.reported_by.project == user_project

        return False
