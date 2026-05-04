"""
Centralized Tenant Resolution Utility

This module provides a single point for tenant extraction and validation
across the Athens platform, ensuring consistent tenant isolation.
"""

import logging
import jwt
import uuid
from typing import Optional
from django.conf import settings
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.core.exceptions import ObjectDoesNotExist
from .tenant_models import AthensTenant

logger = logging.getLogger(__name__)


class TenantResolver:
    """
    Centralized tenant resolution and validation.
    
    Handles extraction from authenticated user context only.
    """
    
    @staticmethod
    def _is_uuid(value: str) -> bool:
        """Check if value is a valid UUID string"""
        try:
            uuid.UUID(str(value))
            return True
        except Exception:
            return False
    
    @staticmethod
    def extract_tenant_id(request):
        """
        Extract tenant ID from request using multiple sources.
        Supports: int, numeric string, UUID string.
        
        Returns:
            Tenant ID (int, str, or UUID) or None if not found
        """
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            # Fall back to Authorization header for JWT-authenticated requests
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if not auth_header.startswith('Bearer '):
                return None

            token = auth_header.split(' ', 1)[1]
            try:
                # Validate the token before decoding
                UntypedToken(token)
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            except (InvalidToken, TokenError, jwt.PyJWTError) as exc:
                logger.warning(f"Failed to validate JWT for tenant resolution: {exc}")
                return None

            # Check multiple claim keys (priority order)
            tenant_id = (
                payload.get('tenant_id') or 
                payload.get('athens_tenant_id') or 
                payload.get('company_id')  # Legacy support
            )
            if tenant_id:
                logger.debug(f"Extracted tenant from JWT payload: {tenant_id}")
                return tenant_id

            return None

        # Check user attributes (priority order)
        tenant_id = (
            getattr(user, 'athens_tenant_id', None) or
            getattr(user, 'company_id', None)  # Legacy support
        )
        if tenant_id:
            logger.debug(f"Extracted tenant from authenticated user: {tenant_id}")
            return tenant_id

        return None
    
    @staticmethod
    def validate_tenant(tenant_id) -> Optional[object]:
        """
        Validate tenant exists and is active.
        Accepts tenant_id in any of these forms:
        - int (1)
        - numeric string ("1")
        - UUID string ("c46fa62d-f629-4531-a867-96779ccfdc4e")
        - UUID object
        
        Tries control_plane.Tenant (int PK) first when numeric, else AthensTenant (UUID).
        
        Args:
            tenant_id: Tenant ID (int, str, or UUID)
            
        Returns:
            Tenant instance or None if invalid
        """
        if tenant_id is None:
            return None
        
        tid_raw = str(tenant_id).strip()
        if not tid_raw:
            return None
        
        # 1) Numeric -> control_plane.Tenant (int PK)
        if tid_raw.isdigit():
            tid_int = int(tid_raw)
            try:
                from control_plane.models import Tenant as ControlPlaneTenant
                tenant = ControlPlaneTenant.objects.get(id=tid_int, is_active=True)
                logger.debug(f"Validated control_plane tenant: {tid_int}")
                return tenant
            except ObjectDoesNotExist:
                logger.warning(f"Control plane tenant not found or inactive: {tid_int}")
                return None
            except Exception as e:
                logger.error(f"Control plane tenant validation error: {e}")
                return None
        
        # 2) UUID -> Try both control_plane.Tenant (by extracting int) and AthensTenant
        if TenantResolver._is_uuid(tid_raw):
            # 2a) Check if UUID is all-zeros format representing an integer (e.g., 00000000-0000-0000-0000-000000000001 = 1)
            try:
                # Extract last segment and try as integer
                uuid_parts = tid_raw.split('-')
                if len(uuid_parts) == 5:
                    last_segment = uuid_parts[-1]
                    if last_segment.isdigit() or all(c in '0123456789abcdefABCDEF' for c in last_segment):
                        # Try converting hex to int
                        tid_int = int(last_segment, 16)
                        if tid_int > 0:
                            from control_plane.models import Tenant as ControlPlaneTenant
                            tenant = ControlPlaneTenant.objects.filter(id=tid_int, is_active=True).first()
                            if tenant:
                                logger.debug(f"Validated control_plane tenant from UUID: {tid_int}")
                                return tenant
            except Exception:
                pass
            
            # 2b) Try AthensTenant with UUID
            try:
                tenant = AthensTenant.objects.get(id=tid_raw, is_active=True)
                logger.debug(f"Validated AthensTenant: {tid_raw}")
                return tenant
            except ObjectDoesNotExist:
                logger.warning(f"AthensTenant not found or inactive: {tid_raw}")
                return None
            except Exception as e:
                logger.error(f"AthensTenant validation error: {e}")
                return None
        
        # 3) Non-numeric, non-UUID -> invalid
        logger.warning(f"Invalid tenant_id format: {tid_raw}")
        return None
    
    @staticmethod
    def resolve_tenant(request):
        """
        Complete tenant resolution: extract and validate.
        
        Args:
            request: Django request object
            
        Returns:
            Tenant instance or None if not found/invalid
        """
        tenant_id = TenantResolver.extract_tenant_id(request)
        if not tenant_id:
            return None
        
        tenant = TenantResolver.validate_tenant(tenant_id)
        return tenant
    
    @staticmethod
    def attach_tenant_context(request, tenant):
        """
        Attach tenant context to request object.
        
        Args:
            request: Django request object
            tenant: Tenant instance (control_plane.Tenant or AthensTenant)
        """
        if not tenant:
            return
        
        request.athens_tenant_id = tenant.id
        request.athens_tenant = tenant
        request.tenant = tenant  # Alias for convenience
        
        user = getattr(request, 'user', None)
        user_state = getattr(user, '_state', None) if user is not None else None
        request.tenant_db = getattr(user_state, 'db', None)
        
        if hasattr(tenant, 'master_admin_id'):
            request.master_admin_id = tenant.master_admin_id
        
        logger.debug(f"Attached tenant context: {tenant.id}")


def get_current_tenant(user):
    """
    Helper function to get current tenant for a user.
    
    Args:
        user: User instance
        
    Returns:
        AthensTenant: Tenant instance or None
    """
    if not user or not user.is_authenticated:
        return None
    
    tenant_id = getattr(user, 'athens_tenant_id', None)
    if not tenant_id:
        return None
    
    return TenantResolver.validate_tenant(tenant_id)
