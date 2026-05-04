# How Subscription Module Works

## Overview

The subscription module in Athens 2.0 uses a **two-layer architecture** to manage tenant access:

1. **Subscription Layer** - Business/billing relationship
2. **Service Layer** - Granular service access control

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        SUPERADMIN                            │
│                     (Control Plane)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─── Manages Tenants
                              ├─── Manages Subscriptions
                              └─── Manages Services
                              
┌─────────────────────────────────────────────────────────────┐
│                    TENANT: ABC Corp                          │
├─────────────────────────────────────────────────────────────┤
│  Subscription                                                │
│  ├─ Plan: "Professional"                                     │
│  ├─ Status: Active                                           │
│  ├─ Valid: 2024-01-01 to 2025-01-01                         │
│  └─ Created by: Superadmin                                   │
├─────────────────────────────────────────────────────────────┤
│  Services (TenantService)                                    │
│  ├─ ERGON                    [✓ Enabled]  [Premium]         │
│  ├─ Workforce                [✓ Enabled]  [Basic]           │
│  └─ Contractor Compliance    [✗ Disabled]                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Table 1: `subscriptions`

**Purpose**: Track tenant's subscription plan and billing period

```sql
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    plan_name VARCHAR(100),              -- "Starter", "Professional", "Enterprise"
    status VARCHAR(20),                  -- "active", "trial", "past_due", "cancelled"
    valid_from TIMESTAMP,                -- Subscription start date
    valid_until TIMESTAMP,               -- Subscription end date (NULL = unlimited)
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by_id INTEGER REFERENCES users(id)
);
```

**Example Data**:
```
id | tenant_id | plan_name     | status | valid_from | valid_until
---|-----------|---------------|--------|------------|-------------
1  | 5         | Professional  | active | 2024-01-01 | 2025-01-01
2  | 8         | Starter       | trial  | 2024-02-01 | 2024-03-01
3  | 12        | Enterprise    | active | 2024-01-15 | NULL
```

---

### Table 2: `services`

**Purpose**: Catalog of all available services in the platform

```sql
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE,            -- "ERGON", "Workforce"
    code VARCHAR(50) UNIQUE,             -- "ergon", "workforce"
    description TEXT,
    service_type VARCHAR(50),            -- "hr_workforce", "project", "sustainability"
    base_url VARCHAR(255),               -- "/ergon", "/workforce"
    icon VARCHAR(50),                    -- "briefcase", "users"
    is_active BOOLEAN DEFAULT TRUE,
    features JSONB,                      -- Features by tier
    pricing JSONB,                       -- Pricing by tier
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Example Data**:
```
id | name                  | code                  | service_type   | is_active
---|----------------------|----------------------|----------------|----------
1  | ERGON                | ergon                | hr_workforce   | true
2  | Workforce            | workforce            | project        | true
3  | Contractor Compliance| contractor-compliance| sustainability | true
```

**Features JSON Example**:
```json
{
  "basic": ["Task Management", "Basic Reports"],
  "premium": ["All Basic", "Advanced Analytics", "Automation"],
  "enterprise": ["All Premium", "API Access", "Dedicated Support"]
}
```

---

### Table 3: `tenant_services`

**Purpose**: Track which services are enabled for each tenant

```sql
CREATE TABLE tenant_services (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    service_id INTEGER REFERENCES services(id),
    tier VARCHAR(20),                    -- "basic", "premium", "enterprise"
    is_enabled BOOLEAN DEFAULT TRUE,
    config JSONB,                        -- Service-specific configuration
    credentials JSONB,                   -- API keys, tokens, etc.
    enabled_at TIMESTAMP,
    disabled_at TIMESTAMP,
    created_by_id INTEGER REFERENCES users(id),
    UNIQUE(tenant_id, service_id)
);
```

**Example Data**:
```
id | tenant_id | service_id | tier     | is_enabled | enabled_at
---|-----------|------------|----------|------------|------------
1  | 5         | 1          | premium  | true       | 2024-01-01
2  | 5         | 2          | basic    | true       | 2024-01-01
3  | 5         | 3          | basic    | false      | NULL
4  | 8         | 1          | basic    | true       | 2024-02-01
```

---

## How It Works: Step-by-Step

### 1. Tenant Creation

```
Superadmin creates tenant "ABC Corp"
  ↓
Tenant record created in `tenants` table
  ↓
Tenant ID: 5
```

### 2. Subscription Creation

```
Superadmin creates subscription for ABC Corp
  ↓
POST /api/control-plane/subscriptions/
{
  "tenant": 5,
  "plan_name": "Professional",
  "status": "active",
  "valid_from": "2024-01-01",
  "valid_until": "2025-01-01"
}
  ↓
Subscription record created
  ↓
Subscription ID: 1
```

### 3. Service Enablement

```
Superadmin enables ERGON service for ABC Corp
  ↓
POST /api/system/tenant-services/ergon/enable/
{
  "tenant_id": 5,
  "tier": "premium"
}
  ↓
TenantService record created
  ↓
ABC Corp can now access ERGON (premium tier)
```

### 4. User Access Check

```
User from ABC Corp logs in
  ↓
System checks:
  1. Is tenant active? ✓
  2. Is subscription active? ✓
  3. Is subscription valid (date range)? ✓
  4. Is service enabled? ✓
  ↓
User can access ERGON service
```

---

## API Endpoints

### Subscription Management

```bash
# List all subscriptions
GET /api/control-plane/subscriptions/

# Create subscription
POST /api/control-plane/subscriptions/
{
  "tenant": 5,
  "plan_name": "Professional",
  "status": "active",
  "valid_from": "2024-01-01",
  "valid_until": "2025-01-01"
}

# View subscription details
GET /api/control-plane/subscriptions/{id}/

# Update subscription
PATCH /api/control-plane/subscriptions/{id}/
{
  "status": "cancelled"
}
```

### Service Management

```bash
# List all available services
GET /api/system/services/

# List tenant's enabled services
GET /api/system/tenant-services/?tenant_id=5

# Enable service for tenant
POST /api/system/tenant-services/ergon/enable/
{
  "tenant_id": 5,
  "tier": "premium"
}

# Disable service for tenant
POST /api/system/tenant-services/ergon/disable/
{
  "tenant_id": 5
}
```

---

## User Interface Flow

### Superadmin Workflow

#### 1. View Subscriptions
```
Navigate to: /superadmin/subscriptions
  ↓
See list of all tenant subscriptions
  ├─ Tenant name
  ├─ Plan name
  ├─ Status (active/trial/cancelled)
  ├─ Service count (e.g., "2 enabled")
  ├─ Valid dates
  └─ Actions (View, Manage Services)
```

#### 2. Manage Services
```
Click "Manage Services" button
  ↓
Navigate to: /superadmin/services
  ↓
See matrix: Tenants × Services
  ├─ Each cell has toggle button
  ├─ Green = Enabled
  ├─ Gray = Disabled
  └─ Click to toggle on/off
```

#### 3. Enable Service
```
Click toggle button for ABC Corp × ERGON
  ↓
API call: POST /api/system/tenant-services/ergon/enable/
  ↓
Service enabled with "basic" tier
  ↓
Button turns green
  ↓
Tier badge appears: "basic"
```

---

## Business Logic

### Subscription Status Flow

```
Trial (14 days)
  ↓
  ├─ Payment received → Active
  └─ No payment → Past Due
                    ↓
                    ├─ Payment received → Active
                    └─ Grace period ends → Cancelled
```

### Service Access Control

```python
def can_access_service(user, service_code):
    # 1. Check tenant is active
    if not user.tenant.is_active:
        return False
    
    # 2. Check subscription is active
    subscription = Subscription.objects.get(tenant=user.tenant)
    if subscription.status != 'active':
        return False
    
    # 3. Check subscription is valid (date range)
    if subscription.valid_until and subscription.valid_until < now():
        return False
    
    # 4. Check service is enabled
    tenant_service = TenantService.objects.get(
        tenant=user.tenant,
        service__code=service_code
    )
    if not tenant_service.is_enabled:
        return False
    
    return True
```

---

## Real-World Example

### Scenario: ABC Corp Signs Up

**Day 1: Onboarding**
```
1. Superadmin creates tenant "ABC Corp"
2. Superadmin creates subscription:
   - Plan: "Professional"
   - Status: "trial"
   - Valid: 14 days
3. Superadmin enables services:
   - ERGON (basic tier)
   - Workforce (basic tier)
```

**Day 5: Upgrade Request**
```
1. ABC Corp requests ERGON premium features
2. Superadmin updates TenantService:
   - Change tier: basic → premium
3. ABC Corp now has access to:
   - Advanced analytics
   - Automation features
   - Priority support
```

**Day 14: Trial Ends**
```
1. ABC Corp makes payment
2. Superadmin updates subscription:
   - Status: trial → active
   - Valid until: +1 year
3. Services remain enabled
```

**Day 30: Add New Service**
```
1. ABC Corp requests Contractor Compliance
2. Superadmin enables service:
   - POST /api/system/tenant-services/contractor-compliance/enable/
   - Tier: premium
3. ABC Corp can now access Contractor Compliance module
```

**Day 365: Renewal**
```
1. Subscription expires
2. Status changes: active → past_due
3. Grace period: 7 days
4. If payment received:
   - Status: past_due → active
   - Valid until: +1 year
5. If no payment:
   - Status: past_due → cancelled
   - Services remain in database but disabled
```

---

## Key Concepts

### 1. Separation of Concerns

**Subscription** = Business relationship
- Who is the customer?
- What plan do they have?
- When does it expire?
- What's the billing status?

**TenantService** = Access control
- Which services can they use?
- What tier/features do they get?
- Is it currently enabled?
- What's the configuration?

### 2. Flexibility

- Tenant can have 1 subscription but multiple services
- Each service can have different tier (basic/premium/enterprise)
- Services can be enabled/disabled independently
- Subscription can be active while services are disabled (and vice versa)

### 3. Granular Control

Superadmin can:
- Enable/disable entire subscription
- Enable/disable individual services
- Change service tiers independently
- Configure each service separately

---

## Current Limitations

### What's NOT Implemented (Yet)

❌ **Automatic tier inheritance**
- Subscription tier doesn't auto-set service tiers
- Must manually set tier per service

❌ **Billing integration**
- No payment gateway integration
- No automatic billing
- No invoice generation

❌ **Usage limits**
- No max users enforcement
- No max projects enforcement
- No storage limits

❌ **Subscription plan templates**
- No predefined plans (Starter, Pro, Enterprise)
- Must manually create each subscription

❌ **Tier-based feature gating in UI**
- UI doesn't hide premium features for basic users
- No "Upgrade Required" prompts

---

## Future Enhancements

### Phase 1: Subscription Plans (Templates)
```
Create predefined plans:
- Starter: $49/mo, 5 users, basic tier
- Professional: $199/mo, 25 users, premium tier
- Enterprise: $999/mo, unlimited, enterprise tier
```

### Phase 2: Billing Integration
```
- Stripe/Razorpay integration
- Automatic billing
- Invoice generation
- Payment webhooks
```

### Phase 3: Usage Limits
```
- Enforce max users per plan
- Enforce max projects per plan
- Storage quotas
- API rate limits
```

### Phase 4: Feature Gating
```
- Hide premium features for basic users
- Show "Upgrade Required" prompts
- In-app upgrade flow
```

---

## Summary

**Current System**:
```
Tenant
  └─ Subscription (1) - Defines business relationship
      └─ TenantServices (N) - Defines service access
          ├─ ERGON (enabled, premium)
          ├─ Workforce (enabled, basic)
          └─ Contractor Compliance (disabled)
```

**How It Works**:
1. Superadmin creates tenant
2. Superadmin creates subscription (plan + dates)
3. Superadmin enables services (one by one)
4. Users access enabled services
5. System checks: tenant active + subscription active + service enabled

**Key Benefits**:
- ✅ Flexible (independent control)
- ✅ Granular (per-service configuration)
- ✅ Scalable (easy to add services)
- ✅ Simple (clear separation of concerns)

**Current State**: ✅ Production-ready for MVP
**Future**: Can enhance with billing, limits, templates as needed
