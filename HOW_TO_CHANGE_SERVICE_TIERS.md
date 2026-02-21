# How to Change Service Tiers

## Current Situation

When you enable a service in the Services page, it's automatically set to **"basic" tier**.

The tier badges you see (basic/premium/enterprise) show the current tier for each enabled service.

---

## Why All Services Show "basic"

**Default Behavior**: When you toggle a service ON, the system enables it with "basic" tier by default.

```
Services Page → Toggle ERGON ON
  ↓
API Call: POST /api/system/tenant-services/ergon/enable/
  Body: { tenant_id: 1, tier: "basic" }  ← Hardcoded to "basic"
  ↓
Result: ERGON enabled with "basic" tier
```

---

## How to Change Service Tier

### Method 1: Via Database (Current - Manual)

```bash
cd /var/www/athens-2.0/backend
source .venv/bin/activate
python manage.py shell
```

```python
from control_plane.models import TenantService, Tenant, Service

# Get tenant
tenant = Tenant.objects.get(name="Renew Power")

# Get service
service = Service.objects.get(code="ergon")

# Get tenant service
ts = TenantService.objects.get(tenant=tenant, service=service)

# Change tier
ts.tier = "premium"  # or "enterprise"
ts.save()

print(f"Updated {service.name} to {ts.tier} tier for {tenant.name}")
```

### Method 2: Via API (Current - Manual)

Currently there's no direct API endpoint to change tier. You need to:

1. Disable the service
2. Re-enable with new tier

```bash
# Disable service
curl -X POST http://localhost:8004/api/system/tenant-services/ergon/disable/ \
  -H "Authorization: Bearer {token}" \
  -d '{"tenant_id": 1}'

# Re-enable with premium tier
curl -X POST http://localhost:8004/api/system/tenant-services/ergon/enable/ \
  -H "Authorization: Bearer {token}" \
  -d '{"tenant_id": 1, "tier": "premium"}'
```

### Method 3: Via UI (Future Feature)

**Planned**: Click on tier badge to change it

```
Services Page
  ↓
Click on "basic" badge under ERGON
  ↓
Dropdown appears: [basic] [premium] [enterprise]
  ↓
Select "premium"
  ↓
API call updates tier
  ↓
Badge changes to "premium"
```

---

## Quick Fix: Update Services.tsx

To enable tier selection when enabling services, modify the enable API call:

**File**: `frontend/src/pages/superadmin/Services.tsx`

**Current**:
```typescript
await apiClient.post(`/api/system/tenant-services/${service.code}/enable/`, {
  tenant_id: tenant.id,
  tier: 'basic'  // ← Always basic
})
```

**Option 1 - Prompt for tier**:
```typescript
const tier = prompt('Select tier (basic/premium/enterprise):', 'basic')
if (!['basic', 'premium', 'enterprise'].includes(tier)) {
  toast.error('Invalid tier')
  return
}

await apiClient.post(`/api/system/tenant-services/${service.code}/enable/`, {
  tenant_id: tenant.id,
  tier: tier
})
```

**Option 2 - Default to premium**:
```typescript
await apiClient.post(`/api/system/tenant-services/${service.code}/enable/`, {
  tenant_id: tenant.id,
  tier: 'premium'  // ← Change default
})
```

---

## Recommended Solution: Add Tier Selector

### Step 1: Add tier state to Services.tsx

```typescript
const [selectedTier, setSelectedTier] = useState<Record<string, string>>({})

const handleToggle = async (tenant: Tenant, service: Service) => {
  const enabled = isServiceEnabled(tenant.id, service.code)
  
  if (!enabled) {
    // Show tier selector before enabling
    const tier = selectedTier[`${tenant.id}-${service.code}`] || 'basic'
    
    await apiClient.post(`/api/system/tenant-services/${service.code}/enable/`, {
      tenant_id: tenant.id,
      tier: tier
    })
  } else {
    // Disable
    await apiClient.post(`/api/system/tenant-services/${service.code}/disable/`, {
      tenant_id: tenant.id
    })
  }
}
```

### Step 2: Add tier dropdown in table cell

```typescript
<td key={service.code} className="py-3 px-4 text-center">
  <div className="flex flex-col items-center gap-2">
    {/* Toggle button */}
    <button onClick={() => handleToggle(tenant, service)}>
      {enabled ? <Power /> : <PowerOff />}
    </button>
    
    {/* Tier selector (show when disabled) */}
    {!enabled && (
      <select
        value={selectedTier[`${tenant.id}-${service.code}`] || 'basic'}
        onChange={(e) => setSelectedTier({
          ...selectedTier,
          [`${tenant.id}-${service.code}`]: e.target.value
        })}
        className="text-xs"
      >
        <option value="basic">Basic</option>
        <option value="premium">Premium</option>
        <option value="enterprise">Enterprise</option>
      </select>
    )}
    
    {/* Tier badge (show when enabled) */}
    {enabled && (
      <Badge variant="secondary" className="text-xs">
        {tier}
      </Badge>
    )}
  </div>
</td>
```

---

## Immediate Workaround

### For Renew Power tenant with 3 enabled services:

```bash
cd /var/www/athens-2.0/backend
source .venv/bin/activate
python manage.py shell
```

```python
from control_plane.models import TenantService, Tenant

tenant = Tenant.objects.get(name="Renew Power")

# Update all services to premium
for ts in TenantService.objects.filter(tenant=tenant, is_enabled=True):
    ts.tier = "premium"
    ts.save()
    print(f"Updated {ts.service.name} to premium")
```

**Result**: All 3 services will show "premium" badge instead of "basic"

---

## Summary

**Current State**:
- Services enable with "basic" tier by default
- Tier badges show current tier
- No UI to change tier after enabling

**To Change Tier Now**:
1. Use Python shell (Method 1 above)
2. Or disable + re-enable with new tier

**Future Enhancement**:
- Click tier badge to change
- Tier dropdown when enabling service
- Bulk tier update

**Quick Fix for Renew Power**:
```python
# Run in Django shell
from control_plane.models import TenantService, Tenant
tenant = Tenant.objects.get(name="Renew Power")
TenantService.objects.filter(tenant=tenant, is_enabled=True).update(tier="premium")
```

This will change all 3 enabled services from "basic" to "premium" tier.
