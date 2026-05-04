"""
Service Management Business Logic
Handles all service enablement, configuration, and lifecycle management
"""
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from typing import Dict, List, Optional, Tuple
import logging

from control_plane.models import Service, TenantService, Tenant
from authentication.models import User, SecurityLog
from authentication.utils import log_security_event

logger = logging.getLogger(__name__)


class ServiceManager:
    """Centralized service management business logic"""
    
    @staticmethod
    def get_available_services(include_inactive: bool = False) -> List[Service]:
        """Get all available services"""
        queryset = Service.objects.all()
        if not include_inactive:
            queryset = queryset.filter(is_active=True)
        return list(queryset.order_by('service_type', 'name'))
    
    @staticmethod
    def get_tenant_services(tenant: Tenant, enabled_only: bool = True) -> List[TenantService]:
        """Get services for a specific tenant"""
        queryset = TenantService.objects.filter(tenant=tenant).select_related('service')
        if enabled_only:
            queryset = queryset.filter(is_enabled=True)
        return list(queryset.order_by('-enabled_at'))
    
    @staticmethod
    def is_service_enabled(tenant: Tenant, service_code: str) -> bool:
        """Check if a service is enabled for tenant"""
        return TenantService.objects.filter(
            tenant=tenant,
            service__code=service_code,
            service__is_active=True,
            is_enabled=True
        ).exists()
    
    @staticmethod
    @transaction.atomic
    def enable_service(
        tenant: Tenant,
        service_code: str,
        user: User,
        tier: Optional[str] = None,
        config: Optional[Dict] = None,
        credentials: Optional[Dict] = None
    ) -> Tuple[TenantService, bool]:
        """
        Enable a service for a tenant
        Tier is auto-derived from subscription plan if not provided
        Returns: (TenantService, created: bool)
        """
        # Validate service exists and is active
        try:
            service = Service.objects.get(code=service_code, is_active=True)
        except Service.DoesNotExist:
            raise ValidationError(f"Service '{service_code}' not found or inactive")
        
        # Auto-derive tier from subscription if not provided
        if tier is None:
            from control_plane.models import Subscription
            try:
                subscription = Subscription.objects.filter(
                    tenant=tenant,
                    status='active'
                ).order_by('-created_at').first()
                
                if subscription:
                    # Map subscription plan to service tier
                    plan_to_tier = {
                        'Starter': 'starter',
                        'Professional': 'professional',
                        'Enterprise': 'enterprise'
                    }
                    tier = plan_to_tier.get(subscription.plan_name, 'starter')
                else:
                    tier = 'starter'  # Default if no subscription
            except Exception as e:
                logger.warning(f"Failed to derive tier from subscription: {e}")
                tier = 'starter'
        
        # Validate tier
        valid_tiers = ['starter', 'professional', 'enterprise']
        if tier not in valid_tiers:
            raise ValidationError(f"Invalid tier '{tier}'. Must be one of: {valid_tiers}")
        
        # Get or create tenant service
        tenant_service, created = TenantService.objects.get_or_create(
            tenant=tenant,
            service=service,
            defaults={
                'tier': tier,
                'is_enabled': True,
                'config': config or {},
                'credentials': credentials or {},
                'created_by': user,
            }
        )
        
        # If already exists but disabled, re-enable it
        if not created and not tenant_service.is_enabled:
            tenant_service.is_enabled = True
            tenant_service.tier = tier
            tenant_service.disabled_at = None
            if config:
                tenant_service.config = config
            if credentials:
                tenant_service.credentials = credentials
            tenant_service.save()
        
        # Log the action
        try:
            SecurityLog.objects.create(
                event_type='service_enabled',
                severity=SecurityLog.Severity.INFO,
                user=user,
                company_id=tenant.id,
                metadata={
                    'tenant_id': tenant.id,
                    'tenant_name': tenant.name,
                    'service_code': service_code,
                    'service_name': service.name,
                    'tier': tier,
                    'created': created
                }
            )
        except Exception as e:
            logger.error(f"Failed to log service enable: {e}")
        
        return tenant_service, created
    
    @staticmethod
    @transaction.atomic
    def disable_service(
        tenant: Tenant,
        service_code: str,
        user: User,
        reason: Optional[str] = None
    ) -> bool:
        """
        Disable a service for a tenant
        Returns: True if disabled, False if already disabled
        """
        try:
            service = Service.objects.get(code=service_code)
        except Service.DoesNotExist:
            raise ValidationError(f"Service '{service_code}' not found")
        
        try:
            tenant_service = TenantService.objects.get(tenant=tenant, service=service)
            
            if not tenant_service.is_enabled:
                return False  # Already disabled
            
            tenant_service.is_enabled = False
            tenant_service.disabled_at = timezone.now()
            if reason:
                tenant_service.config['disable_reason'] = reason
            tenant_service.save()
            
            # Log the action
            try:
                SecurityLog.objects.create(
                    event_type='service_disabled',
                    severity=SecurityLog.Severity.INFO,
                    user=user,
                    company_id=tenant.id,
                    metadata={
                        'tenant_id': tenant.id,
                        'tenant_name': tenant.name,
                        'service_code': service_code,
                        'service_name': service.name,
                        'reason': reason
                    }
                )
            except Exception as e:
                logger.error(f"Failed to log service disable: {e}")
            
            return True
            
        except TenantService.DoesNotExist:
            return False  # Service was never enabled
    
    @staticmethod
    @transaction.atomic
    def update_service_config(
        tenant: Tenant,
        service_code: str,
        user: User,
        config: Dict,
        merge: bool = True
    ) -> TenantService:
        """Update service configuration"""
        try:
            service = Service.objects.get(code=service_code)
            tenant_service = TenantService.objects.get(tenant=tenant, service=service)
            
            if merge:
                tenant_service.config.update(config)
            else:
                tenant_service.config = config
            
            tenant_service.save()
            
            # Log the action
            try:
                SecurityLog.objects.create(
                    event_type='service_config_updated',
                    severity=SecurityLog.Severity.INFO,
                    user=user,
                    company_id=tenant.id,
                    metadata={
                        'tenant_id': tenant.id,
                        'service_code': service_code,
                        'config_keys': list(config.keys())
                    }
                )
            except Exception as e:
                logger.error(f"Failed to log config update: {e}")
            
            return tenant_service
            
        except (Service.DoesNotExist, TenantService.DoesNotExist) as e:
            raise ValidationError(f"Service not found or not enabled: {e}")
    
    @staticmethod
    @transaction.atomic
    def change_service_tier(
        tenant: Tenant,
        service_code: str,
        user: User,
        new_tier: str
    ) -> TenantService:
        """Change service tier (upgrade/downgrade)"""
        valid_tiers = ['starter', 'professional', 'enterprise']
        if new_tier not in valid_tiers:
            raise ValidationError(f"Invalid tier '{new_tier}'")
        
        try:
            service = Service.objects.get(code=service_code)
            tenant_service = TenantService.objects.get(tenant=tenant, service=service)
            
            old_tier = tenant_service.tier
            tenant_service.tier = new_tier
            tenant_service.save()
            
            # Log the action
            try:
                SecurityLog.objects.create(
                    event_type='service_tier_changed',
                    severity=SecurityLog.Severity.INFO,
                    user=user,
                    company_id=tenant.id,
                    metadata={
                        'tenant_id': tenant.id,
                        'service_code': service_code,
                        'old_tier': old_tier,
                        'new_tier': new_tier
                    }
                )
            except Exception as e:
                logger.error(f"Failed to log tier change: {e}")
            
            return tenant_service
            
        except (Service.DoesNotExist, TenantService.DoesNotExist) as e:
            raise ValidationError(f"Service not found or not enabled: {e}")
    
    @staticmethod
    def get_service_stats(tenant: Tenant) -> Dict:
        """Get service usage statistics for tenant"""
        total_services = Service.objects.filter(is_active=True).count()
        enabled_services = TenantService.objects.filter(
            tenant=tenant,
            is_enabled=True
        ).count()
        
        services_by_type = {}
        for ts in TenantService.objects.filter(tenant=tenant, is_enabled=True).select_related('service'):
            service_type = ts.service.service_type
            services_by_type[service_type] = services_by_type.get(service_type, 0) + 1
        
        return {
            'total_available': total_services,
            'enabled': enabled_services,
            'disabled': total_services - enabled_services,
            'by_type': services_by_type,
            'utilization_rate': round((enabled_services / total_services * 100), 2) if total_services > 0 else 0
        }
    
    @staticmethod
    def validate_service_access(tenant: Tenant, service_code: str) -> Tuple[bool, Optional[str]]:
        """
        Validate if tenant can access a service
        Returns: (is_valid, error_message)
        """
        try:
            service = Service.objects.get(code=service_code)
            
            if not service.is_active:
                return False, "Service is not active"
            
            try:
                tenant_service = TenantService.objects.get(tenant=tenant, service=service)
                
                if not tenant_service.is_enabled:
                    return False, "Service is disabled for this tenant"
                
                return True, None
                
            except TenantService.DoesNotExist:
                return False, "Service not enabled for this tenant"
                
        except Service.DoesNotExist:
            return False, "Service not found"
