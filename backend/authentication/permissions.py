from rest_framework import permissions
from authentication.models import UserType


class IsSuperAdmin(permissions.BasePermission):
    """Only superadmin users can access"""
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.user_type == UserType.SUPERADMIN
        )


class IsMasterAdmin(permissions.BasePermission):
    """Only master admin users can access"""
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.user_type == UserType.MASTERADMIN
        )


class IsCompanyUser(permissions.BasePermission):
    """Only company users can access"""
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.user_type == UserType.COMPANYUSER
        )


class IsServiceUser(permissions.BasePermission):
    """Only service users can access"""
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.user_type == UserType.SERVICEUSER
        )
