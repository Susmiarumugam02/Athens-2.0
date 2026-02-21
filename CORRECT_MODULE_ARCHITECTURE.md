# Athens 2.0 - Correct Module Architecture

## User Roles & Access

### 1. SuperAdmin (Platform Level)
**Purpose:** Manage the entire SaaS platform

**Access:**
- Tenant management (create/disable companies)
- Service enablement (enable/disable services per tenant)
- Master admin management
- Subscriptions & billing
- Platform audit logs
- System configuration

**No Access To:**
- Individual project data
- User modules (ERGON, Workforce, PTW, etc.)

---

### 2. MasterAdmin (Tenant Level)
**Purpose:** Manage company projects and enable modules

**Access:**
- Project management (create/edit projects)
- Admin user management (create project admins)
- **Module enablement per project** (enable/disable ERGON, Workforce, PTW, etc.)
- Menu configuration per project
- Company settings

**No Access To:**
- ERGON daily operations (that's for users)
- Workforce daily operations (that's for users)
- User-level modules

**Key Responsibility:**
- Enable ERGON module for Project A → Users in Project A can use ERGON
- Enable Workforce module for Project B → Users in Project B can use Workforce

---

### 3. Company Users (Project Level)
**Purpose:** Use enabled modules for daily work

**Access (based on enabled modules):**
- **ERGON** (if enabled for their project):
  - Daily Planner
  - Task Management
  - Follow-ups
  - Expenses
  - Manpower/Machinery
  - Financial Ledger
  
- **Workforce** (if enabled for their project):
  - Employee Profiles
  - Attendance
  - Leave Management
  
- **Other Modules** (if enabled):
  - PTW (Permit to Work)
  - Incident Management
  - Safety Observation
  - Training modules
  - etc.

---

## Module Flow

```
SuperAdmin
  ↓
Creates Tenant Company
  ↓
Enables Services (ERGON, Workforce, PTW, etc.)
  ↓
MasterAdmin (Tenant)
  ↓
Creates Projects
  ↓
Enables Modules per Project
  ↓
Company Users
  ↓
Use Enabled Modules
```

---

## Example Scenario

**Company:** ABC Construction  
**SuperAdmin:** Enables ERGON & Workforce services for ABC Construction

**MasterAdmin (ABC Construction):**
- Creates Project Alpha
- Enables ERGON for Project Alpha
- Enables Workforce for Project Alpha
- Creates Project Beta
- Enables only PTW for Project Beta

**Users:**
- **Project Alpha Users:** Can access ERGON + Workforce
- **Project Beta Users:** Can only access PTW

---

## Current Implementation Status

### ✅ Correct:
- SuperAdmin manages tenants and services
- Backend has multi-tenant isolation
- ERGON/Workforce APIs are user-facing

### ❌ Incorrect (Fixed):
- ~~ERGON/Workforce in MasterAdmin sidebar~~ → REMOVED
- ~~MasterAdmin accessing ERGON daily planner~~ → REMOVED
- ~~MasterAdmin routes for ERGON/Workforce~~ → REMOVED

### ⏳ TODO:
1. Add module enablement UI in MasterAdmin Projects page
2. Add user-facing ERGON/Workforce to Company User menu
3. Check module enablement before showing to users
4. Add project-level permissions

---

## Correct Menu Structure

### SuperAdmin Menu:
- Dashboard
- Tenants
- Services (enable/disable per tenant)
- Masters
- Subscriptions
- Audit Logs
- Configuration
- Settings

### MasterAdmin Menu:
- Dashboard
- Projects (with module enablement)
- Admin Users
- Menu Management
- Settings

### Company User Menu (dynamic based on enabled modules):
- Dashboard
- Projects
- **ERGON** (if enabled)
  - Daily Planner
  - Tasks
  - Expenses
  - etc.
- **Workforce** (if enabled)
  - Profiles
  - Attendance
  - Leave
- **PTW** (if enabled)
- **Incident Management** (if enabled)
- etc.

---

## Key Takeaway

**ERGON and Workforce are NOT admin tools.**  
**They are operational tools for users to do their daily work.**

MasterAdmin only decides which projects get which modules.  
Users actually use those modules.

---

**Last Updated:** February 18, 2025  
**Status:** Architecture Corrected ✅
