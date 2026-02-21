# Modules vs Menu Management - Complete Clarification

## ✅ Updated: Menu Management Now Includes ERGON & Workforce

### What Changed:
- Added **ERGON** and **WORKFORCE** to Menu Management
- Added **Operations preset** (ERGON + Workforce + Inventory)
- Menu Management now shows all 9 modules

---

## The Two Systems Explained

### 1. Module Enablement (Backend Access Control)
**Location:** Projects → Modules button  
**Purpose:** Control backend API access  
**Scope:** Functional access control

**What it does:**
- Enables/disables entire module functionality
- Controls API endpoint access
- Returns 403 if module not enabled
- Database: `project_modules` table

**Example:**
```
ERGON Module: DISABLED
↓
User tries to access /api/ergon/daily-planner/
↓
Result: 403 Forbidden
```

---

### 2. Menu Management (Frontend UI Customization)
**Location:** Menu Management page  
**Purpose:** Customize sidebar appearance  
**Scope:** Visual organization

**What it does:**
- Show/hide menu items in sidebar
- Assign role-based visibility
- Set feature flags per module
- Customize user experience

**Example:**
```
ERGON Menu Item: HIDDEN
↓
User looks at sidebar
↓
Result: ERGON not visible (but still accessible via URL if module enabled)
```

---

## How They Work Together

### Scenario 1: Both Enabled ✅
- **Module:** ENABLED
- **Menu:** VISIBLE
- **Result:** User sees menu item AND can access functionality

### Scenario 2: Module Disabled ❌
- **Module:** DISABLED
- **Menu:** VISIBLE
- **Result:** User sees menu item but gets 403 error when clicking

### Scenario 3: Menu Hidden 👁️
- **Module:** ENABLED
- **Menu:** HIDDEN
- **Result:** User can access via direct URL but doesn't see in sidebar

### Scenario 4: Both Disabled ❌❌
- **Module:** DISABLED
- **Menu:** HIDDEN
- **Result:** Complete block - no visibility, no access

---

## Complete Module List (9 Modules)

| Module | Description | Category |
|--------|-------------|----------|
| **ERGON** | Operations & Finance | Operations |
| **WORKFORCE** | HR, Attendance & Leave | Operations |
| **PTW** | Permit to Work | Safety |
| **OBSERVATIONS** | Safety Observations | Safety |
| **INCIDENTS** | Incident Management | Safety |
| **TRAINING** | Employee Training | HR |
| **ESG** | Environmental, Social, Governance | Compliance |
| **INVENTORY** | Inventory Management | Operations |
| **QUALITY** | Quality Management | Compliance |

---

## Presets in Menu Management

### 1. Operations Preset
Enables: ERGON, WORKFORCE, INVENTORY  
**Use case:** Projects focused on operations and resource management

### 2. EHS Standard Preset
Enables: PTW, OBSERVATIONS, INCIDENTS, TRAINING, ESG  
**Use case:** Projects focused on safety and compliance

### 3. Full Suite Preset
Enables: All 9 modules  
**Use case:** Large projects needing complete functionality

---

## MasterAdmin Workflow

### Step 1: Enable Module (Backend)
```
Projects → Select Project → Modules Button
↓
Toggle ERGON: ON
↓
Backend API access granted
```

### Step 2: Configure Menu (Frontend)
```
Menu Management → Select Project
↓
Check ERGON: Enabled
↓
Assign Roles: CLIENT_ADMIN, EPC_ADMIN
↓
Set Feature Flags: {"daily_planner": true}
↓
Sidebar shows ERGON for allowed roles
```

### Step 3: User Experience
```
Company User logs in
↓
Sees ERGON in sidebar (Menu Management)
↓
Clicks ERGON
↓
Can access functionality (Module Enabled)
```

---

## Best Practices

### ✅ Recommended:
1. Enable module first, then configure menu
2. Use presets for quick setup
3. Test with different roles
4. Document custom feature flags

### ❌ Avoid:
1. Showing menu items for disabled modules (confusing)
2. Hiding menu items for enabled modules (users won't find them)
3. Inconsistent role assignments across modules

---

## API Endpoints

### Module Enablement:
```
GET  /api/control-plane/project-modules/?project_id=1
POST /api/control-plane/project-modules/toggle/
GET  /api/control-plane/project-modules/enabled/
```

### Menu Management:
```
(Currently frontend-only, can be extended to backend)
```

---

## Summary

**Module Enablement** = "Can they use it?" (Backend)  
**Menu Management** = "Can they see it?" (Frontend)

Both work together to provide:
- **Security:** Module enablement controls access
- **UX:** Menu management controls visibility
- **Flexibility:** Different configurations per project

---

**Status:** ✅ COMPLETE  
**ERGON & Workforce:** Now in both systems  
**Last Updated:** February 18, 2025
