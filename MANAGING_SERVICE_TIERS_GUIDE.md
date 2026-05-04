# Managing Service Tiers - Complete Guide

## Overview

Service tiers (basic/premium/enterprise) control what features tenants can access for each service.

---

## Current Methods to Manage Tiers

### Method 1: CLI Command (Easiest) ⭐

**Change all services for a tenant**:
```bash
cd /var/www/athens-2.0/backend
source .venv/bin/activate
python manage.py change_service_tier "Renew Power" all premium
```

**Change specific service**:
```bash
python manage.py change_service_tier "Renew Power" ergon enterprise
python manage.py change_service_tier "Renew Power" workforce basic
python manage.py change_service_tier "Renew Power" contractor-compliance premium
```

**Syntax**:
```
python manage.py change_service_tier <tenant_name> <service_code> <tier>

tenant_name: "Renew Power" (exact name)
service_code: ergon | workforce | contractor-compliance | all
tier: basic | premium | enterprise
```

---

### Method 2: Django Shell

```bash
cd /var/www/athens-2.0/backend
source .venv/bin/activate
python manage.py shell
```

**Change all services**:
```python
from control_plane.models import TenantService, Tenant

tenant = Tenant.objects.get(name="Renew Power")
TenantService.objects.filter(tenant=tenant, is_enabled=True).update(tier="premium")
print("Updated all services to premium")
```

**Change specific service**:
```python
from control_plane.models import TenantService, Tenant, Service

tenant = Tenant.objects.get(name="Renew Power")
service = Service.objects.get(code="ergon")
ts = TenantService.objects.get(tenant=tenant, service=service)
ts.tier = "enterprise"
ts.save()
print(f"Updated {service.name} to enterprise")
```

**View current tiers**:
```python
from control_plane.models import TenantService, Tenant

tenant = Tenant.objects.get(name="Renew Power")
for ts in TenantService.objects.filter(tenant=tenant, is_enabled=True):
    print(f"{ts.service.name}: {ts.tier}")
```

---

### Method 3: Django Admin UI ⭐ (Now Available)

**Access**: `http://localhost:8004/admin/`

**Steps**:
1. Login as superadmin
2. Go to **Control Plane** → **Tenant Services**
3. Find service to change
4. Click **tier dropdown** in list (or open detail view)
5. Select: Basic / Premium / Enterprise
6. Click **Save**

**Features**:
- ✅ Visual dropdown (not text field)
- ✅ Quick edit in list view
- ✅ Filter by tier/tenant/service
- ✅ Search by name

**Best for**: Single service changes, visual management

---

### Method 4: API (Manual)

**Disable then re-enable with new tier**:
```bash
# 1. Disable service
curl -X POST http://localhost:8004/api/system/tenant-services/ergon/disable/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": 1}'

# 2. Re-enable with new tier
curl -X POST http://localhost:8004/api/system/tenant-services/ergon/enable/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": 1, "tier": "enterprise"}'
```

---

## Tier Comparison

### Basic Tier
**Features**:
- Core functionality
- Basic reports
- Manual operations
- Email support
- Standard features

**Best For**: Small teams, testing, trial users

**Services**:
- ERGON: Task management, basic planner
- Workforce: Basic project tracking
- Contractor: Manual compliance forms

---

### Premium Tier
**Features**:
- All Basic features
- Advanced analytics
- Automation (CLRA forms, etc.)
- Compliance alerts
- Document management
- Priority support

**Best For**: Growing businesses, professional use

**Services**:
- ERGON: Advanced analytics, automation
- Workforce: Advanced project management
- Contractor: Automated CLRA forms (11 forms)

---

### Enterprise Tier
**Features**:
- All Premium features
- Multi-site management
- API access
- Custom workflows
- Bulk operations
- Dedicated support
- SLA guarantee

**Best For**: Large organizations, complex needs

**Services**:
- ERGON: Full suite, API access
- Workforce: Enterprise features, integrations
- Contractor: Multi-site compliance, custom reports

---

## Quick Reference Commands

### View Current Tiers
```bash
cd backend && source .venv/bin/activate
python manage.py shell -c "
from control_plane.models import TenantService, Tenant
t = Tenant.objects.get(name='Renew Power')
for ts in TenantService.objects.filter(tenant=t, is_enabled=True):
    print(f'{ts.service.name}: {ts.tier}')
"
```

### Change All to Basic
```bash
python manage.py change_service_tier "Renew Power" all basic
```

### Change All to Premium
```bash
python manage.py change_service_tier "Renew Power" all premium
```

### Change All to Enterprise
```bash
python manage.py change_service_tier "Renew Power" all enterprise
```

### Mix Tiers (Different per Service)
```bash
python manage.py change_service_tier "Renew Power" ergon enterprise
python manage.py change_service_tier "Renew Power" workforce premium
python manage.py change_service_tier "Renew Power" contractor-compliance basic
```

---

## Common Scenarios

### Scenario 1: New Tenant Trial
```bash
# Start with basic tier
python manage.py change_service_tier "New Company" all basic
```

### Scenario 2: Upgrade to Premium
```bash
# Upgrade all services
python manage.py change_service_tier "Company Name" all premium
```

### Scenario 3: Partial Upgrade
```bash
# Keep most services basic, upgrade ERGON only
python manage.py change_service_tier "Company Name" ergon premium
```

### Scenario 4: Enterprise Customer
```bash
# Full enterprise access
python manage.py change_service_tier "Enterprise Corp" all enterprise
```

---

## Troubleshooting

### Error: Tenant not found
```bash
# List all tenants
python manage.py shell -c "
from control_plane.models import Tenant
for t in Tenant.objects.all():
    print(f'{t.id}: {t.name}')
"
```

### Error: Service not enabled
```bash
# Check enabled services
python manage.py shell -c "
from control_plane.models import TenantService, Tenant
t = Tenant.objects.get(name='Renew Power')
for ts in TenantService.objects.filter(tenant=t):
    print(f'{ts.service.name}: enabled={ts.is_enabled}, tier={ts.tier}')
"
```

### Verify Changes
```bash
# After changing tier, verify
python manage.py shell -c "
from control_plane.models import TenantService, Tenant, Service
t = Tenant.objects.get(name='Renew Power')
s = Service.objects.get(code='ergon')
ts = TenantService.objects.get(tenant=t, service=s)
print(f'ERGON tier: {ts.tier}')
"
```

---

## Future: UI-Based Tier Management

**Planned Feature**: Click tier badge to change

```
Services Page
  ↓
Click "premium" badge under ERGON
  ↓
Dropdown: [basic] [premium] [enterprise]
  ↓
Select "enterprise"
  ↓
Tier updated
```

**Implementation Status**: Not yet implemented

---

## Best Practices

### 1. Match Subscription Plan to Service Tier
```
Subscription: Starter → Services: basic
Subscription: Professional → Services: premium
Subscription: Enterprise → Services: enterprise
```

### 2. Document Tier Changes
Keep track of when and why tiers were changed for billing purposes.

### 3. Test Before Production
Test tier changes on a test tenant before applying to production tenants.

### 4. Communicate Changes
Notify tenant users when upgrading/downgrading tiers.

---

## Pricing by Tier

| Tier       | ERGON    | Workforce | Contractor | Total/Service |
|------------|----------|-----------|------------|---------------|
| Basic      | Free     | Free      | Free       | $0            |
| Premium    | $99/mo   | $99/mo    | $99/mo     | $99/mo        |
| Enterprise | $299/mo  | $299/mo   | $299/mo    | $299/mo       |

**Note**: Pricing is per service. Total cost = number of enabled services × tier price.

---

## Summary

**Easiest Method**: CLI command
```bash
python manage.py change_service_tier "Tenant Name" all premium
```

**Most Flexible**: Django shell (for complex operations)

**Most Visual**: Django Admin UI

**For Automation**: API endpoints

**Current Status**: All methods work. UI-based tier selector coming soon.

---

## Quick Start

**To change Renew Power to all premium**:
```bash
cd /var/www/athens-2.0/backend
source .venv/bin/activate
python manage.py change_service_tier "Renew Power" all premium
```

**Done!** Refresh Services page to see "premium" badges.
