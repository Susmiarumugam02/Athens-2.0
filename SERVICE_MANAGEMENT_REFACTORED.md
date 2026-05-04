# Service Management System - Refactored

## Overview

Complete refactoring of the service management system with proper business logic separation, comprehensive features, and production-ready architecture.

---

## Architecture

### Business Logic Layer
**File:** `backend/system/service_manager.py`

Centralized `ServiceManager` class handles all service operations:
- Service enablement/disablement
- Configuration management
- Tier management (basic/premium/enterprise)
- Access validation
- Usage statistics
- Audit logging

### API Layer
**File:** `backend/system/views.py`

Clean REST API endpoints using the ServiceManager:
- Minimal view logic
- Proper error handling
- Permission checks
- Response formatting

---

## Features

### 1. Service Enablement
```python
ServiceManager.enable_service(
    tenant=tenant,
    service_code='ergon',
    user=user,
    tier='premium',
    config={'feature_flags': {'advanced_analytics': True}},
    credentials={'api_key': 'xxx'}
)
```

**Features:**
- Idempotent operation
- Tier selection (basic/premium/enterprise)
- Custom configuration
- Credential storage
- Automatic audit logging

### 2. Service Disablement
```python
ServiceManager.disable_service(
    tenant=tenant,
    service_code='ergon',
    user=user,
    reason='Budget constraints'
)
```

**Features:**
- Graceful disablement
- Reason tracking
- Timestamp recording
- Audit logging

### 3. Configuration Management
```python
ServiceManager.update_service_config(
    tenant=tenant,
    service_code='ergon',
    user=user,
    config={'max_users': 100, 'features': ['analytics']},
    merge=True  # Merge with existing or replace
)
```

**Features:**
- Merge or replace config
- Validation
- Audit trail

### 4. Tier Management
```python
ServiceManager.change_service_tier(
    tenant=tenant,
    service_code='ergon',
    user=user,
    new_tier='enterprise'
)
```

**Features:**
- Upgrade/downgrade
- Validation
- Audit logging

### 5. Access Validation
```python
is_valid, error = ServiceManager.validate_service_access(
    tenant=tenant,
    service_code='ergon'
)
```

**Returns:**
- `(True, None)` if valid
- `(False, "error message")` if invalid

### 6. Usage Statistics
```python
stats = ServiceManager.get_service_stats(tenant)
```

**Returns:**
```json
{
  "total_available": 10,
  "enabled": 5,
  "disabled": 5,
  "by_type": {
    "hr_workforce": 2,
    "finance": 1,
    "project": 2
  },
  "utilization_rate": 50.0
}
```

---

## API Endpoints

### GET /api/system/services/
List all available services

**Response:**
```json
[
  {
    "id": 1,
    "name": "ERGON",
    "code": "ergon",
    "description": "Operations & Finance Management",
    "service_type": "project",
    "base_url": "/ergon",
    "icon": "briefcase",
    "is_active": true
  }
]
```

### GET /api/system/tenant-services/
List enabled services for current tenant

**Response:**
```json
[
  {
    "id": 1,
    "service": {...},
    "tier": "premium",
    "is_enabled": true,
    "enabled_at": "2025-02-20T10:00:00Z"
  }
]
```

### GET /api/system/tenant-services/stats/
Get service usage statistics

**Response:**
```json
{
  "total_available": 10,
  "enabled": 5,
  "disabled": 5,
  "by_type": {"hr_workforce": 2},
  "utilization_rate": 50.0
}
```

### POST /api/system/tenant-services/{code}/enable/
Enable a service

**Request:**
```json
{
  "tier": "premium",
  "config": {
    "feature_flags": {
      "advanced_analytics": true
    }
  }
}
```

**Response:**
```json
{
  "message": "Service ERGON enabled",
  "data": {...}
}
```

### POST /api/system/tenant-services/{code}/disable/
Disable a service

**Request:**
```json
{
  "reason": "Budget constraints"
}
```

**Response:**
```json
{
  "message": "Service disabled"
}
```

### POST /api/system/tenant-services/{code}/config/
Update service configuration

**Request:**
```json
{
  "config": {
    "max_users": 100,
    "features": ["analytics", "reporting"]
  },
  "merge": true
}
```

**Response:**
```json
{
  "message": "Configuration updated",
  "data": {...}
}
```

### POST /api/system/tenant-services/{code}/tier/
Change service tier

**Request:**
```json
{
  "tier": "enterprise"
}
```

**Response:**
```json
{
  "message": "Tier changed to enterprise",
  "data": {...}
}
```

---

## Business Logic

### Service Tiers

| Tier | Features | Use Case |
|------|----------|----------|
| **Basic** | Core features | Small teams |
| **Premium** | Advanced features | Growing teams |
| **Enterprise** | All features + custom | Large organizations |

### Service Types

- `hr_workforce` - HR & Workforce Management
- `finance` - Finance & Accounting
- `crm` - Customer Relationship Management
- `inventory` - Inventory Management
- `project` - Project Management
- `sustainability` - Sustainability & ESG
- `other` - Other services

### Audit Logging

All service operations are automatically logged:
- `service_enabled`
- `service_disabled`
- `service_config_updated`
- `service_tier_changed`

**Log Structure:**
```json
{
  "event_type": "service_enabled",
  "severity": "INFO",
  "user_id": 1,
  "company_id": 1,
  "metadata": {
    "tenant_id": 1,
    "tenant_name": "Acme Corp",
    "service_code": "ergon",
    "service_name": "ERGON",
    "tier": "premium",
    "created": true
  }
}
```

---

## Permissions

### Required Permissions
- **Enable/Disable:** Owner or Admin role
- **View Services:** Any authenticated user
- **Update Config:** Owner or Admin role
- **Change Tier:** Owner or Admin role

### Permission Check
```python
from system.utils import check_service_admin_permission

has_permission, error = check_service_admin_permission(user)
if error:
    return error  # 403 Forbidden
```

---

## Error Handling

### Validation Errors
```json
{
  "error": "Service 'invalid' not found or inactive"
}
```

### Permission Errors
```json
{
  "error": "Only Owner or Admin can manage services"
}
```

### Server Errors
```json
{
  "error": "Failed to enable service"
}
```

---

## Database Schema

### Service Model
```python
class Service(models.Model):
    name = CharField(max_length=100, unique=True)
    code = SlugField(max_length=50, unique=True)
    description = TextField()
    service_type = CharField(max_length=50)
    base_url = CharField(max_length=255)
    icon = CharField(max_length=50)
    is_active = BooleanField(default=True)
    features = JSONField(default=dict)
    pricing = JSONField(default=dict)
```

### TenantService Model
```python
class TenantService(models.Model):
    tenant = ForeignKey(Tenant, on_delete=CASCADE)
    service = ForeignKey(Service, on_delete=CASCADE)
    tier = CharField(max_length=20)  # basic/premium/enterprise
    is_enabled = BooleanField(default=True)
    credentials = JSONField(default=dict)
    config = JSONField(default=dict)
    enabled_at = DateTimeField(auto_now_add=True)
    disabled_at = DateTimeField(null=True)
    created_by = ForeignKey(User, on_delete=SET_NULL)
```

---

## Testing

### Unit Tests
```python
from system.service_manager import ServiceManager

def test_enable_service():
    tenant_service, created = ServiceManager.enable_service(
        tenant=tenant,
        service_code='ergon',
        user=user,
        tier='premium'
    )
    assert created == True
    assert tenant_service.is_enabled == True
    assert tenant_service.tier == 'premium'
```

### Integration Tests
```bash
# Enable service
curl -X POST http://localhost:8004/api/system/tenant-services/ergon/enable/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tier": "premium"}'

# Get stats
curl http://localhost:8004/api/system/tenant-services/stats/ \
  -H "Authorization: Bearer $TOKEN"
```

---

## Migration from Old System

### Before (Old System)
```python
# Direct model manipulation in views
tenant_service, created = TenantService.objects.get_or_create(...)
if not created:
    tenant_service.is_enabled = True
    tenant_service.save()
```

### After (New System)
```python
# Business logic in ServiceManager
tenant_service, created = ServiceManager.enable_service(
    tenant=tenant,
    service_code='ergon',
    user=user,
    tier='premium'
)
```

**Benefits:**
- ✅ Centralized business logic
- ✅ Consistent validation
- ✅ Automatic audit logging
- ✅ Easier testing
- ✅ Better error handling

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `system/service_manager.py` | ⭐ NEW | Business logic layer |
| `system/views.py` | ✅ REFACTORED | Clean API layer |
| `system/urls.py` | ✅ UPDATED | New endpoints |

---

**Status:** ✅ Complete  
**Business Logic:** Properly separated  
**API:** RESTful and clean  
**Audit:** Comprehensive logging  

**Last Updated:** February 20, 2025
