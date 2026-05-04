# Service & Subscription Enhancement Plan

## Current State Analysis

### Issue 1: Services Page Only Shows ERGON and Workforce

**Root Cause**: Only 2 services are seeded in the database:
- `ergon` - Ergon (hr_workforce)
- `workforce` - Workforce (project)

**Missing Service**: Contractor Compliance

### Issue 2: Subscription Management Needs Enhancement

**Current Implementation**:
- Basic CRUD for subscriptions (Tenant, Plan Name, Status, Dates)
- No connection between Subscriptions and Services
- No tier-based feature management
- No billing/pricing integration

---

## Solution: Two-Track Enhancement

### Track 1: Add Missing Services (Immediate)

Add Contractor Compliance and future services to the Service catalog.

**Services to Add**:
1. **Contractor Compliance** (sustainability)
   - Code: `contractor-compliance`
   - Features: CLRA automation, contractor master, compliance tracking
   - Tiers: basic, premium, enterprise

2. **PTW - Permit to Work** (project) - Future
3. **Incident Management** (project) - Future
4. **Safety Observations** (project) - Future

### Track 2: Subscription-Service Integration (Strategic)

**Architecture Decision**: Two models working together

#### Model 1: Subscription (Tenant-Level)
```
Subscription
├── tenant (FK)
├── plan_name (string: "Starter", "Professional", "Enterprise")
├── plan_tier (string: "basic", "premium", "enterprise")
├── status (active/trial/past_due/cancelled)
├── valid_from / valid_until (dates)
├── max_users (int)
├── max_projects (int)
├── billing_amount (decimal)
├── billing_cycle (monthly/annual)
└── features (JSON: global features)
```

#### Model 2: TenantService (Service-Level)
```
TenantService
├── tenant (FK)
├── service (FK)
├── tier (basic/premium/enterprise) - inherits from Subscription
├── is_enabled (bool)
├── config (JSON: service-specific settings)
└── credentials (JSON: API keys, etc.)
```

**Relationship**:
- Subscription defines the **plan tier** for the tenant
- TenantService enables/disables **individual services** within that tier
- Service features are **tier-gated** (basic features vs premium features)

---

## Implementation Plan

### Phase 1: Add Contractor Compliance Service (30 min)

**Backend**:
1. Create migration to seed Contractor Compliance service
2. Add service features by tier

**Frontend**:
- No changes needed (auto-discovered)

### Phase 2: Enhance Subscription Model (2 hours)

**Backend Changes**:
1. Add fields to Subscription model:
   - `plan_tier` (basic/premium/enterprise)
   - `max_users`, `max_projects`
   - `billing_amount`, `billing_cycle`
   - `features` (JSON)

2. Add business logic:
   - Auto-set TenantService tier from Subscription tier
   - Validate service enablement against subscription tier
   - Tier upgrade/downgrade workflow

**Frontend Changes**:
1. Subscription page enhancements:
   - Show plan tier prominently
   - Display enabled services count
   - Show billing information
   - Add "Manage Services" button → links to Services page

2. Services page enhancements:
   - Show subscription tier at top
   - Disable services not available in current tier
   - Show "Upgrade Required" for premium/enterprise services

### Phase 3: Subscription Plans Management (3 hours)

**New Feature**: Subscription Plans (Template)

**Backend**:
```python
class SubscriptionPlan(models.Model):
    name = models.CharField(max_length=100)  # "Starter", "Professional"
    tier = models.CharField(max_length=20)   # basic, premium, enterprise
    price_monthly = models.DecimalField()
    price_annual = models.DecimalField()
    max_users = models.IntegerField()
    max_projects = models.IntegerField()
    included_services = models.JSONField()   # ["ergon", "workforce"]
    features = models.JSONField()            # Feature flags
    is_active = models.BooleanField()
```

**Frontend**:
- New page: `/superadmin/subscription-plans`
- CRUD for plan templates
- When creating subscription, select from plan templates

---

## Recommended Approach

### Option A: Minimal (Recommended for MVP)
1. ✅ Add Contractor Compliance service (Phase 1)
2. ✅ Keep current subscription model simple
3. ✅ Use TenantService for granular control
4. ⏳ Defer billing integration

**Pros**: Fast, works now, no breaking changes
**Cons**: Manual tier management

### Option B: Full Integration
1. ✅ Add Contractor Compliance service (Phase 1)
2. ✅ Enhance Subscription model (Phase 2)
3. ✅ Add Subscription Plans (Phase 3)
4. ✅ Billing integration (Phase 4)

**Pros**: Complete SaaS solution
**Cons**: 2-3 days of work

---

## Quick Win: Add Contractor Compliance Now

**Migration File**: `backend/control_plane/migrations/0013_add_contractor_compliance_service.py`

```python
from django.db import migrations

def add_contractor_compliance_service(apps, schema_editor):
    Service = apps.get_model('control_plane', 'Service')
    
    Service.objects.create(
        name='Contractor Compliance',
        code='contractor-compliance',
        description='CLRA automation, contractor master, and compliance tracking',
        service_type='sustainability',
        base_url='/contractor-compliance',
        icon='shield-check',
        is_active=True,
        features={
            'basic': [
                'Contractor Master',
                'Basic Compliance Tracking',
                'Manual CLRA Forms'
            ],
            'premium': [
                'All Basic Features',
                'Automated CLRA Forms (11 forms)',
                'Compliance Alerts',
                'Document Management'
            ],
            'enterprise': [
                'All Premium Features',
                'Multi-site Compliance',
                'Advanced Analytics',
                'API Access',
                'Dedicated Support'
            ]
        },
        pricing={
            'basic': {'monthly': 0, 'annual': 0},
            'premium': {'monthly': 99, 'annual': 999},
            'enterprise': {'monthly': 299, 'annual': 2999}
        }
    )

class Migration(migrations.Migration):
    dependencies = [
        ('control_plane', '0012_fix_tenant_deletion_cascade'),
    ]
    
    operations = [
        migrations.RunPython(add_contractor_compliance_service),
    ]
```

**Run**: `python manage.py migrate`

---

## Subscription Page Enhancement (Quick)

**Current**: Shows basic subscription info
**Enhanced**: Shows subscription + enabled services

**Add to Subscriptions.tsx**:
```tsx
// Show enabled services count
const [serviceStats, setServiceStats] = useState<Map<number, number>>(new Map())

// Fetch service count per tenant
useEffect(() => {
  const fetchServiceStats = async () => {
    const stats = new Map()
    for (const sub of subscriptions) {
      const res = await apiClient.get(`/api/system/tenant-services/?tenant_id=${sub.tenant}`)
      stats.set(sub.tenant, res.data.filter(ts => ts.is_enabled).length)
    }
    setServiceStats(stats)
  }
  if (subscriptions.length > 0) fetchServiceStats()
}, [subscriptions])

// In table, add column:
<td className="py-3 px-4 text-sm">
  <Badge variant="secondary">
    {serviceStats.get(sub.tenant) || 0} services enabled
  </Badge>
</td>
```

---

## Decision Required

**Question 1**: Do you want to add Contractor Compliance service now?
- ✅ Yes → I'll create the migration

**Question 2**: Subscription enhancement approach?
- Option A: Keep simple (current model works)
- Option B: Full integration (2-3 days work)

**Question 3**: Priority?
- High: Need billing/pricing now
- Medium: Can defer, focus on features
- Low: Current setup is fine

---

## Summary

**Services Issue**: Only 2 services seeded, need to add Contractor Compliance
**Subscriptions**: Current model is basic but functional. Can enhance with:
1. Plan tier integration
2. Service tier inheritance
3. Billing information
4. Subscription plan templates

**Recommendation**: 
1. Add Contractor Compliance service immediately (15 min)
2. Enhance subscriptions incrementally based on business needs
3. Keep TenantService as the source of truth for service enablement
