# Service Tier & Subscription Link - Implementation Complete

## Changes Made

### 1. Tier Naming Updated
**Old**: basic, premium, enterprise  
**New**: starter, professional, enterprise

### 2. Auto-Tier Derivation from Subscription
When enabling a service, the tier is now **automatically derived** from the tenant's active subscription plan:

```python
Subscription Plan → Service Tier
─────────────────────────────────
Starter         → starter
Professional    → professional
Enterprise      → enterprise
```

### 3. Backend Changes

#### Models (`control_plane/models.py`)
- `TenantService.tier` choices: starter/professional/enterprise
- `TenantService.tier` default: 'starter'
- `AthensModuleSubscription.plan_tier` choices: starter/professional/enterprise

#### Service Manager (`system/service_manager.py`)
- `enable_service()` now accepts optional `tier` parameter
- If `tier=None`, automatically derives from active subscription
- Validates tier choices: starter/professional/enterprise
- `change_service_tier()` validates new tier choices

#### API Views (`system/views.py`)
- `enable_service` endpoint no longer requires tier in request
- Tier auto-derived from subscription if not provided

### 4. Frontend Changes

#### Services Page (`frontend/src/pages/superadmin/Services.tsx`)
- Legend updated: starter/professional/enterprise
- Enable service API call no longer sends tier (auto-derived)
- Tier badges display: starter/professional/enterprise

### 5. Database Migration

**File**: `backend/control_plane/migrations/0015_update_tier_choices.py`

- Updates `TenantService.tier` field choices
- Updates `AthensModuleSubscription.plan_tier` field choices
- Migrates existing data:
  - `basic` → `starter`
  - `premium` → `professional`
  - `enterprise` → `enterprise` (unchanged)

## How It Works Now

### Scenario 1: Enable Service (Auto-Tier)
```
1. Tenant "ABC Corp" has subscription: Professional
2. Superadmin enables ERGON service
3. System checks subscription plan: Professional
4. Service enabled with tier: professional
5. Badge shows: "professional"
```

### Scenario 2: Enable Service (Manual Tier)
```
1. Superadmin enables service with explicit tier
2. POST /api/system/tenant-services/ergon/enable/
   { "tenant_id": 5, "tier": "enterprise" }
3. Service enabled with tier: enterprise
4. Badge shows: "enterprise"
```

### Scenario 3: No Subscription
```
1. Tenant has no active subscription
2. Superadmin enables service
3. System defaults to: starter
4. Badge shows: "starter"
```

## Deployment Steps

```bash
cd /var/www/athens-2.0/backend
source .venv/bin/activate

# Run migration
python manage.py migrate control_plane 0015_update_tier_choices

# Verify data migration
python manage.py shell
>>> from control_plane.models import TenantService
>>> TenantService.objects.values_list('tier', flat=True).distinct()
['starter', 'professional', 'enterprise']

# Restart backend
sudo systemctl restart athens2-backend

# Build frontend
cd /var/www/athens-2.0/frontend
npm run build
sudo systemctl reload nginx
```

## Verification

### Check Tier Display
1. Go to `/superadmin/services`
2. Legend shows: starter | professional | enterprise
3. Enabled services show correct tier badges

### Check Auto-Derivation
1. Create tenant with Professional subscription
2. Enable any service (don't specify tier)
3. Service should show "professional" tier

### Check Existing Data
```sql
SELECT t.name, s.name, ts.tier 
FROM tenant_services ts
JOIN tenants t ON ts.tenant_id = t.id
JOIN services s ON ts.service_id = s.id
WHERE ts.is_enabled = true;
```

Expected: All tiers are starter/professional/enterprise (no basic/premium)

## Files Modified

- `backend/control_plane/models.py`
- `backend/system/service_manager.py`
- `backend/system/views.py`
- `frontend/src/pages/superadmin/Services.tsx`
- `backend/control_plane/migrations/0015_update_tier_choices.py` (new)

## Status

✅ Tier naming updated  
✅ Auto-derivation from subscription implemented  
✅ Migration created  
✅ Frontend updated  
⏳ Ready for deployment
