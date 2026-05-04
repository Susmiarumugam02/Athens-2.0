# Subscription Module - Visual Quick Reference

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         SUPERADMIN                               │
│                    (Control Plane Layer)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼             ▼
         ┌──────────┐  ┌──────────┐  ┌──────────┐
         │ Tenants  │  │Subscrip- │  │ Services │
         │          │  │  tions   │  │          │
         └──────────┘  └──────────┘  └──────────┘
                │             │             │
                └─────────────┼─────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Tenant Services  │
                    │  (Access Layer)  │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Tenant Users   │
                    └──────────────────┘
```

---

## 📊 Data Model

```
┌─────────────────────────────────────────────────────────────────┐
│ TENANT: ABC Corp (ID: 5)                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📋 SUBSCRIPTION                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Plan: Professional                                         │ │
│  │ Status: ✅ Active                                          │ │
│  │ Valid: 2024-01-01 → 2025-01-01                            │ │
│  │ Created: 2024-01-01 by admin@athens.com                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  🔧 SERVICES                                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ✅ ERGON                                                   │ │
│  │    Tier: Premium                                           │ │
│  │    Enabled: 2024-01-01                                     │ │
│  │    Features: Advanced Analytics, Automation, API           │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ ✅ Workforce                                               │ │
│  │    Tier: Basic                                             │ │
│  │    Enabled: 2024-01-01                                     │ │
│  │    Features: Task Management, Basic Reports                │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ ❌ Contractor Compliance                                   │ │
│  │    Tier: N/A                                               │ │
│  │    Enabled: Never                                          │ │
│  │    Features: N/A                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Workflow

### Creating a Tenant with Services

```
Step 1: Create Tenant
┌─────────────────────┐
│ POST /tenants/      │
│ {                   │
│   name: "ABC Corp"  │
│   code: "abc-corp"  │
│ }                   │
└─────────────────────┘
         │
         ▼
    Tenant ID: 5

Step 2: Create Subscription
┌─────────────────────────────┐
│ POST /subscriptions/        │
│ {                           │
│   tenant: 5                 │
│   plan_name: "Professional" │
│   status: "active"          │
│   valid_from: "2024-01-01"  │
│   valid_until: "2025-01-01" │
│ }                           │
└─────────────────────────────┘
         │
         ▼
  Subscription ID: 1

Step 3: Enable Services
┌──────────────────────────────────┐
│ POST /tenant-services/ergon/     │
│      enable/                     │
│ {                                │
│   tenant_id: 5                   │
│   tier: "premium"                │
│ }                                │
└──────────────────────────────────┘
         │
         ▼
  TenantService ID: 1
  (ERGON enabled for ABC Corp)

┌──────────────────────────────────┐
│ POST /tenant-services/workforce/ │
│      enable/                     │
│ {                                │
│   tenant_id: 5                   │
│   tier: "basic"                  │
│ }                                │
└──────────────────────────────────┘
         │
         ▼
  TenantService ID: 2
  (Workforce enabled for ABC Corp)
```

---

## 🎯 Access Control Logic

```
User Login
    │
    ▼
┌─────────────────────────┐
│ Is Tenant Active?       │
│ tenant.is_active = true │
└─────────────────────────┘
    │ ✅ Yes
    ▼
┌─────────────────────────────┐
│ Is Subscription Active?     │
│ subscription.status = active│
└─────────────────────────────┘
    │ ✅ Yes
    ▼
┌─────────────────────────────────┐
│ Is Subscription Valid (Dates)?  │
│ now() between valid_from/until  │
└─────────────────────────────────┘
    │ ✅ Yes
    ▼
┌─────────────────────────────┐
│ Is Service Enabled?         │
│ tenant_service.is_enabled   │
└─────────────────────────────┘
    │ ✅ Yes
    ▼
┌─────────────────────────────┐
│ ✅ GRANT ACCESS             │
└─────────────────────────────┘
```

---

## 📱 UI Pages

### Subscriptions Page (`/superadmin/subscriptions`)

```
┌────────────────────────────────────────────────────────────────┐
│ 📄 Subscriptions                    [⚙️ Manage Services]       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Tenant    │ Plan    │ Status │ Services  │ Valid From │ Actions│
│───────────┼─────────┼────────┼───────────┼────────────┼────────│
│ ABC Corp  │ Pro     │ ✅ Active│ 2 enabled │ 2024-01-01 │ [⚙️][👁️]│
│ XYZ Ltd   │ Starter │ ⚠️ Trial │ 1 enabled │ 2024-02-01 │ [⚙️][👁️]│
│ DEF Inc   │ Enter   │ ✅ Active│ 3 enabled │ 2024-01-15 │ [⚙️][👁️]│
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│ Summary Stats:                                                  │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│ │ Total: 3     │ │ Active: 2    │ │ Services: 6  │           │
│ └──────────────┘ └──────────────┘ └──────────────┘           │
└────────────────────────────────────────────────────────────────┘
```

### Services Page (`/superadmin/services`)

```
┌────────────────────────────────────────────────────────────────┐
│ 📦 Services Management              [📄 View Subscriptions]    │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Tenant    │ ERGON      │ Workforce  │ Contractor Compliance   │
│───────────┼────────────┼────────────┼─────────────────────────│
│ ABC Corp  │ ✅ Premium │ ✅ Basic   │ ⭕ Disabled             │
│ XYZ Ltd   │ ✅ Basic   │ ⭕ Disabled│ ⭕ Disabled             │
│ DEF Inc   │ ✅ Enter   │ ✅ Premium │ ✅ Premium              │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│ Legend:                                                         │
│ ✅ Enabled  ⭕ Disabled  [basic] [premium] [enterprise]        │
└────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Tables

### subscriptions
```
┌────┬──────────┬──────────────┬────────┬────────────┬─────────────┐
│ id │ tenant_id│ plan_name    │ status │ valid_from │ valid_until │
├────┼──────────┼──────────────┼────────┼────────────┼─────────────┤
│ 1  │ 5        │ Professional │ active │ 2024-01-01 │ 2025-01-01  │
│ 2  │ 8        │ Starter      │ trial  │ 2024-02-01 │ 2024-03-01  │
│ 3  │ 12       │ Enterprise   │ active │ 2024-01-15 │ NULL        │
└────┴──────────┴──────────────┴────────┴────────────┴─────────────┘
```

### services
```
┌────┬───────────────────────┬───────────────────────┬────────────────┐
│ id │ name                  │ code                  │ service_type   │
├────┼───────────────────────┼───────────────────────┼────────────────┤
│ 1  │ ERGON                 │ ergon                 │ hr_workforce   │
│ 2  │ Workforce             │ workforce             │ project        │
│ 3  │ Contractor Compliance │ contractor-compliance │ sustainability │
└────┴───────────────────────┴───────────────────────┴────────────────┘
```

### tenant_services
```
┌────┬──────────┬────────────┬─────────┬────────────┬────────────┐
│ id │ tenant_id│ service_id │ tier    │ is_enabled │ enabled_at │
├────┼──────────┼────────────┼─────────┼────────────┼────────────┤
│ 1  │ 5        │ 1          │ premium │ true       │ 2024-01-01 │
│ 2  │ 5        │ 2          │ basic   │ true       │ 2024-01-01 │
│ 3  │ 8        │ 1          │ basic   │ true       │ 2024-02-01 │
│ 4  │ 12       │ 1          │ enterprise│ true     │ 2024-01-15 │
│ 5  │ 12       │ 2          │ premium │ true       │ 2024-01-15 │
│ 6  │ 12       │ 3          │ premium │ true       │ 2024-01-15 │
└────┴──────────┴────────────┴─────────┴────────────┴────────────┘
```

---

## 🔑 Key Concepts

### 1️⃣ One Subscription, Many Services
```
Tenant "ABC Corp"
    └─ Subscription: "Professional" (1)
        └─ Services: (N)
            ├─ ERGON (premium)
            ├─ Workforce (basic)
            └─ Contractor Compliance (disabled)
```

### 2️⃣ Independent Control
```
Subscription Status: Active ✅
    ├─ ERGON: Enabled ✅
    ├─ Workforce: Disabled ❌  ← Can disable individual service
    └─ Contractor: Enabled ✅
```

### 3️⃣ Tier Flexibility
```
Same Subscription, Different Tiers:
    ├─ ERGON: Premium (advanced features)
    ├─ Workforce: Basic (limited features)
    └─ Contractor: Enterprise (all features)
```

---

## 📈 Subscription Lifecycle

```
Day 0: Sign Up
    ↓
    Create Tenant
    Create Subscription (status: trial)
    Enable Services (tier: basic)
    ↓
Day 14: Trial Ends
    ↓
    Payment Received? 
    ├─ Yes → Status: active, Valid: +1 year
    └─ No → Status: past_due, Grace: 7 days
    ↓
Day 21: Grace Period Ends
    ↓
    Payment Received?
    ├─ Yes → Status: active
    └─ No → Status: cancelled, Services: disabled
    ↓
Day 365: Renewal
    ↓
    Auto-renew or Manual renewal
    Valid until: +1 year
```

---

## 🎯 Quick Actions

### Enable Service for Tenant
```bash
curl -X POST https://api.athens.com/api/system/tenant-services/ergon/enable/ \
  -H "Authorization: Bearer {token}" \
  -d '{
    "tenant_id": 5,
    "tier": "premium"
  }'
```

### Disable Service for Tenant
```bash
curl -X POST https://api.athens.com/api/system/tenant-services/ergon/disable/ \
  -H "Authorization: Bearer {token}" \
  -d '{
    "tenant_id": 5
  }'
```

### Check Tenant's Services
```bash
curl -X GET https://api.athens.com/api/system/tenant-services/?tenant_id=5 \
  -H "Authorization: Bearer {token}"
```

---

## ✅ Current State

**What Works**:
- ✅ Create/view subscriptions
- ✅ Enable/disable services per tenant
- ✅ Set tier per service
- ✅ Service-specific configuration
- ✅ Audit logging
- ✅ UI for management

**What's Missing**:
- ❌ Automatic billing
- ❌ Usage limits enforcement
- ❌ Subscription plan templates
- ❌ Tier-based feature gating in UI
- ❌ Payment gateway integration

---

## 📚 Related Docs

- [How Subscription Module Works](./HOW_SUBSCRIPTION_MODULE_WORKS.md) - Full explanation
- [Service Subscription Enhancement](./SERVICE_SUBSCRIPTION_ENHANCEMENT.md) - Future plans
- [Service Subscription Quick Card](./SERVICE_SUBSCRIPTION_QUICK_CARD.md) - Quick reference
- [Services Subscriptions Refactor](./SERVICES_SUBSCRIPTIONS_REFACTOR_COMPLETE.md) - Latest changes
