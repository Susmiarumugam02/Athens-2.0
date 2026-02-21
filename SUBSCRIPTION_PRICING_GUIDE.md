# Subscription Plans & Pricing Guide

## 📋 Subscription Plans

### Starter Plan
**Price**: $49/month or $490/year (save 17%)

**Ideal For**: Small teams and startups

**Includes**:
- Up to 10 users
- Up to 5 projects
- Basic tier services
- Email support
- 10GB storage

**Services**:
- ERGON (basic)
- Workforce (basic)
- Contractor Compliance (basic)

---

### Professional Plan
**Price**: $199/month or $1,990/year (save 17%)

**Ideal For**: Growing businesses

**Includes**:
- Up to 50 users
- Up to 25 projects
- Premium tier services
- Priority email support
- 100GB storage
- Advanced analytics
- Automation features

**Services**:
- ERGON (premium)
- Workforce (premium)
- Contractor Compliance (premium)

---

### Enterprise Plan
**Price**: $999/month or $9,990/year (save 17%)

**Ideal For**: Large organizations

**Includes**:
- Unlimited users
- Unlimited projects
- Enterprise tier services
- 24/7 phone + email support
- 1TB storage
- API access
- Custom integrations
- Dedicated account manager
- SLA guarantee

**Services**:
- ERGON (enterprise)
- Workforce (enterprise)
- Contractor Compliance (enterprise)

---

## 🔄 How to Change Subscription Plan

### Method 1: Via UI (Recommended)

1. **Navigate to Subscriptions**
   ```
   Login as Superadmin
   → Go to /superadmin/subscriptions
   ```

2. **Edit Subscription**
   ```
   Find tenant row
   → Click Edit icon (orange pencil)
   → Edit Subscription modal opens
   ```

3. **Change Plan**
   ```
   Plan dropdown:
   ├─ Starter - $49/month
   ├─ Professional - $199/month
   └─ Enterprise - $999/month
   
   Select new plan
   → Click "Save Changes"
   ```

4. **Update Status (if needed)**
   ```
   Status dropdown:
   ├─ Trial (14 days free)
   ├─ Active (paid)
   ├─ Past Due (payment failed)
   └─ Cancelled (expired)
   ```

5. **Adjust Dates**
   ```
   Valid From: Start date
   Valid Until: End date (or leave blank for unlimited)
   ```

---

### Method 2: Via API

```bash
# Update subscription plan
curl -X PATCH http://localhost:8004/api/control-plane/subscriptions/1/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "plan_name": "Enterprise",
    "status": "active",
    "valid_from": "2024-01-01T00:00:00Z",
    "valid_until": "2025-01-01T00:00:00Z"
  }'
```

---

### Method 3: Via Django Admin

```
1. Navigate to http://localhost:8004/admin/
2. Login as superadmin
3. Go to Control Plane → Subscriptions
4. Click on subscription to edit
5. Change plan_name field:
   - Starter
   - Professional
   - Enterprise
6. Save
```

---

### Method 4: Via Python Shell

```python
from control_plane.models import Subscription

# Get subscription
sub = Subscription.objects.get(id=1)

# Change plan
sub.plan_name = 'Enterprise'
sub.status = 'active'
sub.save()

print(f"Updated to {sub.plan_name}")
```

---

## 💰 Pricing Breakdown

### Monthly Pricing

| Plan         | Monthly | Annual  | Savings |
|--------------|---------|---------|---------|
| Starter      | $49     | $490    | $98     |
| Professional | $199    | $1,990  | $398    |
| Enterprise   | $999    | $9,990  | $1,998  |

### Per-User Pricing (if needed)

| Plan         | Per User/Month | Max Users |
|--------------|----------------|-----------|
| Starter      | $4.90          | 10        |
| Professional | $3.98          | 50        |
| Enterprise   | Custom         | Unlimited |

---

## 🎯 Service Tiers by Plan

### What Each Tier Includes

#### Basic Tier (Starter Plan)
- Task Management
- Basic Reports
- Manual data entry
- Email support
- Standard features

#### Premium Tier (Professional Plan)
- All Basic features
- Advanced Analytics
- Automation (CLRA forms, etc.)
- Compliance Alerts
- Document Management
- Priority support

#### Enterprise Tier (Enterprise Plan)
- All Premium features
- Multi-site Management
- API Access
- Custom Workflows
- Bulk Operations
- Dedicated Support
- SLA Guarantee

---

## 📊 Current Implementation

### How It Works Now

**Subscription Plan** = Business relationship
- Defines: Starter / Professional / Enterprise
- Tracks: Status, dates, billing
- **Does NOT** automatically set service tiers

**Service Tiers** = Access control (independent)
- Each service has its own tier
- Must be set manually per service
- Can mix tiers (e.g., ERGON premium + Workforce basic)

### Example

```
Tenant: Renew Power
  └─ Subscription: Professional ($199/mo)
      └─ Services:
          ├─ ERGON (basic) ← Manually set
          ├─ Workforce (premium) ← Manually set
          └─ Contractor Compliance (disabled)
```

**Note**: Subscription plan name is for billing/display only. Service tiers are controlled separately in Services page.

---

## 🔧 How to Set Service Tiers

### Current Process (Manual)

1. **Set Subscription Plan**
   ```
   Subscriptions page → Edit → Select "Professional"
   ```

2. **Enable Services with Tiers**
   ```
   Services page → Toggle service ON
   → Service enabled with "basic" tier by default
   ```

3. **Change Service Tier** (Future Feature)
   ```
   Currently: All services enable with "basic" tier
   Future: Click tier badge to change (basic/premium/enterprise)
   ```

---

## 🚀 Recommended Workflow

### For New Tenant

1. **Create Subscription**
   ```
   Plan: Professional
   Status: trial (14 days)
   Valid: Now to +14 days
   ```

2. **Enable Services**
   ```
   Go to Services page
   Toggle ON desired services
   (All start with "basic" tier)
   ```

3. **After Trial Converts**
   ```
   Edit subscription:
   Status: trial → active
   Valid until: +1 year
   ```

4. **Upgrade Service Tiers** (Manual for now)
   ```
   Currently: Contact developer to change tier in database
   Future: Click tier badge in Services page
   ```

---

## 💡 Future Enhancements

### Phase 1: Automatic Tier Mapping
```
When subscription plan changes:
- Starter → Set all services to "basic"
- Professional → Set all services to "premium"
- Enterprise → Set all services to "enterprise"
```

### Phase 2: Tier Change UI
```
Services page:
- Click tier badge
- Dropdown: basic / premium / enterprise
- Save → Updates tier
```

### Phase 3: Billing Integration
```
- Stripe/Razorpay integration
- Automatic payment processing
- Invoice generation
- Payment webhooks
```

### Phase 4: Usage Limits
```
- Enforce max users per plan
- Enforce max projects per plan
- Storage quotas
- API rate limits
```

---

## 📝 Quick Reference

### Change Plan Name
```
Subscriptions page → Edit icon → Plan dropdown → Save
```

### Change Status
```
Subscriptions page → Edit icon → Status dropdown → Save
```

### Change Dates
```
Subscriptions page → Edit icon → Valid From/Until → Save
```

### Enable Service
```
Services page → Toggle button → Green = Enabled
```

### View Pricing
```
Subscriptions page → Edit icon → See pricing guide in modal
```

---

## ❓ FAQ

**Q: How do I change from Professional to Enterprise?**
A: Subscriptions page → Click Edit icon → Select "Enterprise" from Plan dropdown → Save

**Q: Does changing the plan automatically upgrade service tiers?**
A: No, currently service tiers must be changed separately (future feature)

**Q: What's the difference between plan and tier?**
A: Plan = Subscription level (Starter/Pro/Enterprise). Tier = Service level (basic/premium/enterprise). They're independent.

**Q: How do I give a tenant premium features?**
A: Currently: Contact developer to update service tier in database. Future: Click tier badge in Services page.

**Q: Can I mix tiers? (e.g., ERGON premium + Workforce basic)**
A: Yes! Each service has independent tier control.

**Q: Where is billing tracked?**
A: Currently: Plan name is stored but no billing integration. Future: Stripe/Razorpay integration planned.

**Q: How do I offer a discount?**
A: Currently: Manual adjustment in subscription record. Future: Coupon/discount system planned.

---

## 🔗 Related Documentation

- [How Subscription Module Works](./HOW_SUBSCRIPTION_MODULE_WORKS.md)
- [Subscription Module Visual Guide](./SUBSCRIPTION_MODULE_VISUAL_GUIDE.md)
- [Service Subscription Enhancement](./SERVICE_SUBSCRIPTION_ENHANCEMENT.md)
- [Subscription Display Fix](./SUBSCRIPTION_DISPLAY_FIX.md)

---

**Last Updated**: February 6, 2025
**Status**: ✅ Edit functionality added | Pricing guide complete
