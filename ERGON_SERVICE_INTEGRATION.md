# Ergon Service Integration - Complete

## ✅ Step 1: Database Models - COMPLETE

**Models Added:**
- `Service` - Stores external services (Ergon, HR, Finance, etc.)
- `TenantService` - Links tenants to enabled services with tier/config

**Ergon Service Created:**
- ID: 1
- Name: Ergon
- Type: HR & Workforce Management
- URL: `/services/ergon`
- Tiers: Basic (Free) + Premium ($999)

## ⏳ Step 2: Superadmin API Endpoints - PENDING

**Required Endpoints:**
```
GET    /api/control-plane/services/              # List all services
POST   /api/control-plane/services/              # Create service
GET    /api/control-plane/services/{id}/         # Get service details
PUT    /api/control-plane/services/{id}/         # Update service
DELETE /api/control-plane/services/{id}/         # Delete service

GET    /api/control-plane/tenant-services/       # List tenant-service assignments
POST   /api/control-plane/tenant-services/       # Enable service for tenant
DELETE /api/control-plane/tenant-services/{id}/  # Disable service for tenant
```

## ⏳ Step 3: Superadmin UI - PENDING

**Required Pages:**
1. **Services Management** (`/superadmin/services`)
   - List all services
   - Add/Edit/Delete services
   - View service details (features, pricing)

2. **Tenant Services** (`/superadmin/tenants/{id}/services`)
   - Enable/disable services for specific tenant
   - Select tier (basic/premium/enterprise)
   - Configure service-specific settings

## ⏳ Step 4: Ergon Integration - PENDING

**Integration Options:**

### Option A: Proxy Integration (Recommended)
- Keep Ergon as separate PHP app
- Add nginx proxy to route `/services/ergon/*` to Ergon
- Athens 2.0 handles authentication, Ergon uses session

### Option B: Full Migration
- Migrate Ergon to Django/React
- Integrate as Athens 2.0 module
- More work but better long-term

## Next Steps

1. **Add Superadmin API endpoints** for service management
2. **Add Superadmin UI** for managing services
3. **Deploy Ergon** and configure nginx proxy
4. **Test integration** with tenant assignment

## Quick Commands

**Enable Ergon for a tenant:**
```python
from control_plane.models import Tenant, Service, TenantService

tenant = Tenant.objects.get(id=1)
ergon = Service.objects.get(code='ergon')

TenantService.objects.create(
    tenant=tenant,
    service=ergon,
    tier='premium',
    is_enabled=True
)
```

**Check tenant's enabled services:**
```python
tenant = Tenant.objects.get(id=1)
services = tenant.tenant_services.filter(is_enabled=True)
for ts in services:
    print(f'{ts.service.name} ({ts.tier})')
```
