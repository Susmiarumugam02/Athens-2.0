# Athens 2.0 — User Process Flow

**Document Type:** Architecture Reference  
**Last Updated:** 2025  
**Scope:** All user tiers — SuperAdmin → MasterAdmin → Project Admin → Company Users

---

## 1. User Tier Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  TIER 1 — SUPERADMIN (Platform Level)                           │
│  Global access · No tenant · Controls the entire SaaS platform  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ creates
┌───────────────────────────▼─────────────────────────────────────┐
│  TIER 2 — MASTERADMIN (Tenant Level)                            │
│  Scoped to ONE Tenant · Manages projects & project admins        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ creates
┌───────────────────────────▼─────────────────────────────────────┐
│  TIER 3 — PROJECT ADMIN (Project Level)                         │
│  admin_type: client | epc | contractor                          │
│  Scoped to ONE Project · Manages company users                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ creates
┌───────────────────────────▼─────────────────────────────────────┐
│  TIER 4 — COMPANY USERS (End Users)                             │
│  Scoped to a Project · Access Athens modules                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Tier 1 — SuperAdmin

### Identity
| Field | Value |
|-------|-------|
| `user_type` | `superadmin` |
| `tenant` | `null` (no tenant) |
| `admin_type` | `null` |
| Login route | `/superadmin/dashboard` |
| Created via | Django `createsuperuser` CLI |

### Responsibilities
- Create, enable, disable, and delete **Tenants** (companies subscribing to Athens)
- Create **MasterAdmin** users and assign them to a Tenant
- Manage **Subscriptions** (trial → active → past_due → cancelled)
- Enable/disable external **Services** per tenant (e.g. ERGON, Workforce)
- Sync tenants with **Athens modules** (PTW, Incident, Safety Obs, etc.)
- View platform-wide **Audit Logs** (SecurityLog + AthensAuditLog)
- Reset or disable any MasterAdmin account

### Process Flow

```
1. SuperAdmin logs in → POST /api/auth/login/
2. Redirected to /superadmin/dashboard
3. Creates a Tenant:
     POST /api/control-plane/tenants/
     { name, code, admin_email, contact_phone, industry, timezone }
4. Syncs tenant with Athens modules:
     POST /api/control-plane/tenants/{id}/sync_athens/
     → Creates AthensTenantLink with DEFAULT_ATHENS_MODULES
5. Optionally updates enabled modules:
     PATCH /api/control-plane/tenants/{id}/athens_modules/
     { enabled_modules: ["PTW", "INCIDENT", "SAFETY_OBS", ...] }
6. Creates a MasterAdmin for the tenant:
     POST /api/control-plane/masters/
     { email, name, surname, athens_tenant_id }
     → User created with user_type=masteradmin, tenant FK set
7. Creates a Subscription for the tenant:
     POST /api/control-plane/subscriptions/
     { tenant, plan_name, status, valid_from, valid_until }
8. Enables external services for the tenant:
     POST /api/control-plane/tenant-services/toggle/
     { tenant_id, service_code, enable: true }
```

### API Endpoints (SuperAdmin only)
```
GET  /api/control-plane/tenants/                    List all tenants
POST /api/control-plane/tenants/                    Create tenant
GET  /api/control-plane/tenants/{id}/               Tenant detail
PUT  /api/control-plane/tenants/{id}/               Update tenant
DEL  /api/control-plane/tenants/{id}/               Delete tenant
POST /api/control-plane/tenants/{id}/disable/       Disable tenant
POST /api/control-plane/tenants/{id}/enable/        Enable tenant
POST /api/control-plane/tenants/{id}/sync_athens/   Sync Athens modules
GET  /api/control-plane/tenants/{id}/athens_modules/ Get modules
PATCH /api/control-plane/tenants/{id}/athens_modules/ Update modules

GET  /api/control-plane/masters/                    List MasterAdmins
POST /api/control-plane/masters/                    Create MasterAdmin
PUT  /api/control-plane/masters/{id}/               Update MasterAdmin
DEL  /api/control-plane/masters/{id}/               Delete MasterAdmin

GET  /api/control-plane/subscriptions/              List subscriptions
POST /api/control-plane/subscriptions/              Create subscription
PUT  /api/control-plane/subscriptions/{id}/         Update subscription
DEL  /api/control-plane/subscriptions/{id}/         Delete subscription

GET  /api/control-plane/audit-logs/                 Security audit logs
GET  /api/control-plane/athens-audit-logs/          Athens audit logs
POST /api/control-plane/tenant-services/toggle/     Toggle service
```

### Permission Guard
```python
class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.user_type == 'superadmin'
```

---

## 3. Tier 2 — MasterAdmin

### Identity
| Field | Value |
|-------|-------|
| `user_type` | `masteradmin` |
| `tenant` | FK → Tenant (required, set by SuperAdmin) |
| `athens_tenant_id` | UUID of the assigned Tenant |
| `admin_type` | `null` |
| Login route | `/master-admin` |
| Created by | SuperAdmin via control plane |

### Responsibilities
- Manage **Projects** within their tenant
- Create **Project Admins** (Client / EPC / Contractor types)
- Manage and approve **Company Users** within their tenant
- View tenant-scoped dashboard statistics
- Reset or disable project admin accounts

### Login Constraint
MasterAdmin **cannot log in** without a tenant assigned. The login endpoint explicitly blocks this:
```
POST /api/auth/login/
→ If user_type == masteradmin AND tenant is null:
    403 { code: "TENANT_MISSING", detail: "Tenant not assigned. Contact Superadmin." }
```

### Process Flow

```
1. MasterAdmin logs in → POST /api/auth/login/
   → Tenant check passes → JWT issued
   → Redirected to /master-admin

2. Views dashboard stats:
     GET /api/auth/masteradmin/dashboard/stats/
     → Returns: total_projects, active_projects, total_users, pending_approvals

3. Creates a Project:
     POST /api/auth/masteradmin/projects/
     {
       projectName, projectCategory, location,
       subscriber_role: "client" | "epc",
       client_company_id,
       epc_company_ids: [],
       contractor_company_ids: [],
       commencementDate, deadlineDate
     }
     → athens_tenant_id auto-set from MasterAdmin's tenant

4. Creates a Project Admin:
     POST /api/auth/masteradmin/admin-users/create-project-admin/
     {
       project_id,
       admin_type: "client" | "epc" | "contractor",
       username,
       company_name,
       registered_address
     }
     → 16-char password auto-generated
     → is_password_reset_required = true
     → Response includes { username, password } for download as .txt

5. Views admins for a project:
     GET /api/auth/masteradmin/projects/{id}/admins/
     → Returns: { client: {...}, epc: {...}, contractors: [...] }

6. Manages company users:
     GET  /api/auth/masteradmin/users/                    List users
     POST /api/auth/masteradmin/users/{id}/approve/       Approve user
     POST /api/auth/masteradmin/users/{id}/toggle-status/ Enable/disable
     POST /api/auth/masteradmin/users/{id}/reset-password/ Reset password
     DEL  /api/auth/masteradmin/admin-users/{id}/         Delete admin
```

### API Endpoints (MasterAdmin only)
```
GET  /api/auth/masteradmin/dashboard/stats/                  Dashboard stats
GET  /api/auth/masteradmin/my-tenant/                        Own tenant info

GET  /api/auth/masteradmin/projects/                         List projects
POST /api/auth/masteradmin/projects/                         Create project
GET  /api/auth/masteradmin/projects/{id}/                    Project detail
PUT  /api/auth/masteradmin/projects/{id}/                    Update project
DEL  /api/auth/masteradmin/projects/{id}/                    Delete project
GET  /api/auth/masteradmin/projects/{id}/admins/             Project admins

GET  /api/auth/masteradmin/users/                            List company users
POST /api/auth/masteradmin/users/{id}/approve/               Approve user
POST /api/auth/masteradmin/users/{id}/reset-password/        Reset password
POST /api/auth/masteradmin/users/{id}/toggle-status/         Enable/disable

GET  /api/auth/masteradmin/admin-users/                      List admin users
POST /api/auth/masteradmin/admin-users/create-project-admin/ Create project admin
DEL  /api/auth/masteradmin/admin-users/{id}/                 Delete admin user
```

### Permission Guard
```python
class IsMasterAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.user_type == 'masteradmin'
```
All queries are automatically scoped: `Project.objects.filter(athens_tenant_id=tenant.id)`

---

## 4. Tier 3 — Project Admin

Project Admins are `companyuser` type users with an `admin_type` set. There are three subtypes.

### 4a. Client Admin

| Field | Value |
|-------|-------|
| `user_type` | `companyuser` |
| `admin_type` | `client` |
| `project` | FK → Project |
| `tenant` | Inherited from project's `athens_tenant_id` |
| Limit | **Exactly ONE per project** (enforced at creation) |

**Role:** Represents the client/owner company on the project. Has the broadest visibility across all project participants.

### 4b. EPC Admin (Engineering, Procurement & Construction)

| Field | Value |
|-------|-------|
| `user_type` | `companyuser` |
| `admin_type` | `epc` |
| `project` | FK → Project |
| `tenant` | Inherited from project's `athens_tenant_id` |
| Limit | Depends on `subscriber_role` of the Project |

**EPC limit rules (enforced at creation):**
```
Project.subscriber_role == "client"  → Unlimited EPC admins allowed
Project.subscriber_role == "epc"     → Maximum ONE EPC admin allowed
```

### 4c. Contractor Admin

| Field | Value |
|-------|-------|
| `user_type` | `companyuser` |
| `admin_type` | `contractor` |
| `project` | FK → Project |
| `tenant` | Inherited from project's `athens_tenant_id` |
| Limit | **Unlimited** |

**Role:** Represents sub-contractors working under the EPC or Client. Multiple contractors can be added to a single project without restriction.

### Project Admin Creation Flow

```
MasterAdmin → POST /api/auth/masteradmin/admin-users/create-project-admin/
{
  project_id: 1,
  admin_type: "client" | "epc" | "contractor",
  username: "acme_client",          ← no spaces allowed, must be unique
  company_name: "ACME Corp",
  registered_address: "123 Main St, City"
}

Validation:
  ✓ Project exists and belongs to MasterAdmin's tenant
  ✓ Username is unique across all users
  ✓ Username has no spaces
  ✓ client: only 1 allowed per project
  ✓ epc: max 1 if project.subscriber_role == "epc"
  ✓ contractor: unlimited

On success:
  → User created with:
       email = "{username}@temp.local"   (placeholder)
       password = 16-char auto-generated (letters + digits + !@#$%^&*)
       is_autogenerated_password = True
       is_password_reset_required = True
       is_active = True
  → Response: { username, password, admin_type, company_name, registered_address }
  → MasterAdmin downloads credentials as .txt file
  → Audit log entry created (SecurityLog.MASTER_CREATED)

First Login:
  → User logs in with provided credentials
  → is_password_reset_required = True → forced password change
  → Redirected to /app after password reset
```

### Project Structure on the Model

```python
class Project(models.Model):
    subscriber_role       # "client" or "epc" — who is paying
    client_company_id     # UUID — single client (only one allowed)
    epc_company_ids       # JSON list — multiple EPCs if client subscriber
    contractor_company_ids # JSON list — unlimited contractors
    athens_tenant_id      # UUID — links project to tenant
```

---

## 5. Tier 4 — Company Users (End Users)

### Identity
| Field | Value |
|-------|-------|
| `user_type` | `companyuser` |
| `admin_type` | `null` |
| `project` | FK → Project (optional) |
| `tenant` | FK → Tenant |
| `company_id` | Integer ID of tenant |
| Login route | `/app` → `/services/athens_sustainability/dashboard` |

### Responsibilities
- Access Athens modules enabled for their tenant
- Submit PTW, Incidents, Safety Observations, etc.
- Use ERGON (Tasks, Planner, Follow-ups, Advance, Manpower, Ledger)
- Use Workforce (Profiles, Attendance, Leave, Payroll)
- View only data scoped to their `company_id`

### Module Access
Company users only see menu items for modules enabled on their tenant:
```typescript
// menuConfig.ts
getMenuForRole('companyuser', '/app', enabledModules)
// Filters items where item.moduleRequired is in enabledModules[]
```

Available modules:
```
Safety:    PTW, Incident Management, Safety Observation, Quality, Inspection
Training:  Induction Training, Job Training, TBT
ERGON:     ergon_tasks, ergon_planner, ergon_followups,
           ergon_advance, ergon_manpower, ergon_ledger
Workforce: workforce_profile, workforce_attendance,
           workforce_leave, workforce_employee, workforce_payroll
Comms:     MOM, Chatbox, Voice Translator, AI Bot
```

---

## 6. Unified Login Flow (All Tiers)

```
POST /api/auth/login/
{ email, password, totp_code? }

Step 1: Find user by email
  → User not found → 401 "Invalid credentials"

Step 2: Check account lock
  → locked_until > now() → 403 "Account is locked"
  → Response includes: locked_until, lockout_expires_at

Step 3: Verify password
  → Wrong password → increment failed_login_count
  → failed_login_count >= 5 → lock account for 30 minutes
  → Response includes: attempts_remaining

Step 4: Check 2FA
  → user.requires_2fa == True AND no totp_code provided
  → 200 { requires_2fa: true, user_id }
  → Frontend redirects to /2fa

Step 5: MasterAdmin tenant check
  → user_type == masteradmin AND tenant is null
  → 403 { code: "TENANT_MISSING" }

Step 6: Issue JWT tokens
  → Reset failed_login_count = 0
  → access token: 60 minutes
  → refresh token: 7 days
  → Token payload includes: user_type, company_id

Step 7: Redirect by user_type
  superadmin   → /superadmin/dashboard
  masteradmin  → /master-admin
  companyuser  → /services/athens_sustainability/dashboard
  serviceuser  → /service
```

### Token Refresh Flow
```
Any API call → 401 Unauthorized
  → Check: refresh token exists in localStorage
  → POST /api/auth/token/refresh/ { refresh }
  → Success: new access token stored, original request retried
  → Failure: tokens cleared → redirect to /login
```

### Security Controls
| Control | Value |
|---------|-------|
| Rate limit | 5 login attempts per minute |
| Account lockout | 5 failed attempts → 30-minute lock |
| Password expiry | 90 days (`password_changed_at`) |
| Access token TTL | 60 minutes |
| Refresh token TTL | 7 days (with blacklisting on logout) |
| 2FA | TOTP (optional per user) |

---

## 7. Data Isolation Model

All data in Athens is isolated by `athens_tenant_id` (UUID). This is the single isolation key.

```
Tenant (control_plane.Tenant)
  id (PK, integer)
  ↑
  └── User.tenant (FK)              ← MasterAdmin & CompanyUsers
  └── User.athens_tenant_id (UUID)  ← Legacy field (same value)
  └── User.company_id (integer)     ← Same as tenant.id
  └── Project.athens_tenant_id      ← Projects scoped to tenant
  └── AthensTenantLink              ← Module enable/disable config
  └── Subscription                  ← Billing plan
  └── TenantService                 ← External service toggles
```

**Query scoping pattern used throughout:**
```python
# MasterAdmin views always filter by tenant
Project.objects.filter(athens_tenant_id=request.user.tenant.id)
User.objects.filter(tenant=request.user.tenant)
```

---

## 8. Complete Hierarchy Diagram

```
SuperAdmin (platform-wide)
│
│  Creates
├──► Tenant A (e.g. "ACME Construction")
│     ├── Subscription: Enterprise Plan
│     ├── Services: ERGON enabled, Workforce enabled
│     ├── Athens Modules: PTW, INCIDENT, SAFETY_OBS, ...
│     │
│     │  Assigned to
│     ├──► MasterAdmin (e.g. masteradmin@acme.com)
│     │     │
│     │     │  Creates
│     │     ├──► Project: "Highway Bridge Project"
│     │     │     subscriber_role: "client"
│     │     │     │
│     │     │     │  Creates (1 only)
│     │     │     ├──► Client Admin
│     │     │     │     admin_type: "client"
│     │     │     │     company_name: "ACME Corp"
│     │     │     │     └── Company Users (workers, supervisors)
│     │     │     │
│     │     │     │  Creates (unlimited, since subscriber=client)
│     │     │     ├──► EPC Admin 1
│     │     │     │     admin_type: "epc"
│     │     │     │     company_name: "BuildTech EPC"
│     │     │     │     └── Company Users
│     │     │     │
│     │     │     ├──► EPC Admin 2
│     │     │     │     admin_type: "epc"
│     │     │     │     company_name: "StructPro EPC"
│     │     │     │     └── Company Users
│     │     │     │
│     │     │     │  Creates (unlimited)
│     │     │     ├──► Contractor Admin 1
│     │     │     │     admin_type: "contractor"
│     │     │     │     company_name: "FastBuild Ltd"
│     │     │     │     └── Company Users
│     │     │     │
│     │     │     └──► Contractor Admin N
│     │     │           admin_type: "contractor"
│     │     │           company_name: "SafeWork Co"
│     │     │           └── Company Users
│     │     │
│     │     └──► Project: "Refinery Expansion"
│     │           subscriber_role: "epc"
│     │           ├──► Client Admin (1 only)
│     │           ├──► EPC Admin (1 only — EPC is subscriber)
│     │           └──► Contractor Admins (unlimited)
│     │
│
└──► Tenant B (e.g. "XYZ Manufacturing")
      └── MasterAdmin → Projects → Admins → Users
```

---

## 9. Frontend Route & Layout Mapping

| User Type | Layout | Base Route | Sidebar Menu |
|-----------|--------|------------|--------------|
| `superadmin` | `SuperadminLayout` | `/superadmin/*` | Tenants, Masters, Subscriptions, Services, Audit Logs |
| `masteradmin` | `MasterAdminLayout` | `/master-admin/*` | Projects, Admin Users, Menu Management |
| `companyuser` | `CompanyLayout` | `/app/*` | Athens modules (filtered by `enabledModules`) |
| `serviceuser` | Service-specific | `/services/*` | Service-specific pages |

---

## 10. Audit Trail

Every significant action is logged. Two audit systems run in parallel:

**SecurityLog** (authentication app) — covers:
- `login_success`, `login_failed`, `logout`
- `account_locked`, `password_change`
- `tenant_created`, `tenant_disabled`
- `subscription_changed`
- `master_created`, `master_disabled`
- `project_created`, `project_updated`
- `project_member_added`, `project_member_removed`

**AthensAuditLog** (control_plane app) — covers:
- `tenant_created`, `tenant_updated`, `tenant_suspended`, `tenant_reactivated`
- `tenant_synced`, `modules_updated`, `subscription_updated`

**TenantAuditLog** (tenant_models) — immutable append-only log:
- `module_enabled`, `module_disabled`
- `menu_enabled`, `menu_disabled`
- `master_admin_changed`
- Cannot be updated or deleted (enforced at ORM level)
