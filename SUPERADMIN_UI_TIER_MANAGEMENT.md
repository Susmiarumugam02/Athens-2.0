# Service Tier Management for Superadmin UI

## Important Distinction

**You are using**: Superadmin UI at `/superadmin/*` (frontend)
**NOT using**: Django Admin at `/admin/` (backend)

---

## Current Situation

### What You Can Do in Superadmin UI

✅ **Subscriptions Page** (`/superadmin/subscriptions`):
- View subscriptions
- Edit subscription (plan, status, dates)
- See service count

✅ **Services Page** (`/superadmin/services`):
- Enable/disable services
- See tier badges (basic/premium/enterprise)

❌ **What You CANNOT Do** (Yet):
- Change service tiers via UI
- Click tier badge to change it

---

## How to Change Service Tiers (For Superadmin UI Users)

### Method 1: CLI Command ⭐ (Recommended)

**Access server via SSH**:
```bash
ssh root@srv1068633
cd /var/www/athens-2.0/backend
source .venv/bin/activate
```

**Change tiers**:
```bash
# All services to premium
python manage.py change_service_tier "Renew Power" all premium

# Specific service
python manage.py change_service_tier "Renew Power" ergon enterprise
```

**Then refresh browser** to see updated tier badges.

---

### Method 2: Ask Developer/DevOps

If you don't have SSH access:

1. Contact your developer/DevOps team
2. Provide:
   - Tenant name: "Renew Power"
   - Service: "ergon" / "workforce" / "contractor-compliance" / "all"
   - Desired tier: "basic" / "premium" / "enterprise"
3. They run the CLI command
4. Refresh your browser

---

### Method 3: Django Admin (Backend Access Required)

**Only if you have backend access**:

1. Go to `http://localhost:8004/admin/` (different from `/superadmin/`)
2. Login with Django superuser credentials
3. Control Plane → Tenant Services
4. Change tier dropdown
5. Save

**Note**: This is a different interface from your Superadmin UI.

---

## Why Can't You Change Tiers in Superadmin UI?

**Current Implementation**:
- Services page shows tier badges
- Badges are **read-only** (display only)
- No click handler to change tier

**Future Feature** (Not Yet Implemented):
```
Services Page
  ↓
Click tier badge
  ↓
Dropdown appears: [basic] [premium] [enterprise]
  ↓
Select new tier
  ↓
API call updates tier
  ↓
Badge updates
```

---

## Recommended Workflow for Superadmin UI Users

### Scenario: Change Tier for a Tenant

**Step 1**: Identify what needs changing
- Go to `/superadmin/services`
- See current tier badges
- Note which services need tier changes

**Step 2**: Request change
- Contact developer/DevOps
- Or use SSH if you have access

**Step 3**: Verify change
- Refresh `/superadmin/services`
- Check tier badges updated

---

## Quick Reference

### Your Access Levels

| Interface | URL | Access | Can Change Tiers? |
|-----------|-----|--------|-------------------|
| Superadmin UI | `/superadmin/*` | ✅ You have | ❌ No (read-only) |
| Django Admin | `/admin/` | ❓ Maybe | ✅ Yes (if access) |
| SSH/CLI | Server terminal | ❓ Maybe | ✅ Yes (if access) |

---

## What You See in Superadmin UI

### Services Page
```
┌─────────────────────────────────────────────────────────────┐
│ Services Management                                          │
├─────────────────────────────────────────────────────────────┤
│ Tenant      │ ERGON      │ Workforce  │ Contractor         │
│─────────────┼────────────┼────────────┼────────────────────│
│ Renew Power │ ✅ premium │ ✅ premium │ ✅ premium         │
│             │    ↑       │    ↑       │    ↑               │
│             │ Read-only  │ Read-only  │ Read-only          │
└─────────────────────────────────────────────────────────────┘
```

**Tier badges are display-only** - you cannot click to change them.

---

## Solutions

### Option A: Use CLI (If You Have SSH Access)

```bash
# Connect to server
ssh root@srv1068633

# Navigate and activate
cd /var/www/athens-2.0/backend
source .venv/bin/activate

# Change tier
python manage.py change_service_tier "Renew Power" all premium

# Done - refresh browser
```

### Option B: Request from Developer

**Email/Message Template**:
```
Hi [Developer],

Please change service tiers for:
- Tenant: Renew Power
- Services: All (or specify: ergon, workforce, etc.)
- New Tier: Premium

Thanks!
```

### Option C: Wait for UI Feature

**Future Enhancement**: Click tier badge to change it directly in Superadmin UI.

**Status**: Not yet implemented.

---

## Summary

**Your Role**: Superadmin UI user
**Your Access**: `/superadmin/*` pages
**Current Limitation**: Cannot change tiers via UI
**Workaround**: Use CLI command or request from developer

**To Change Tiers**:
```bash
python manage.py change_service_tier "Renew Power" all premium
```

**Then**: Refresh browser to see changes

---

## Documentation for Your Role

- ✅ **This file** - How to manage tiers as Superadmin UI user
- ✅ **SERVICE_TIERS_CHEAT_SHEET.md** - Quick CLI commands
- ❌ **DJANGO_ADMIN_TIER_MANAGEMENT.md** - For Django Admin users (not you)

**Key Point**: You work in Superadmin UI, not Django Admin. They are different interfaces.
