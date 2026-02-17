# Original Athens "Create Admin" - Complete Parity Specification

**Generated:** 2025-02-06  
**Source:** /var/www/athens (Original Athens Application)  
**Target:** /var/www/athens-2.0 (Athens 2.0)

---

## 1. FILE MAP (Original Athens)

### Frontend Files
- **Main Component:** `/var/www/athens/app/frontend/src/features/admin/components/AdminCreation.tsx`
- **Route Definition:** `/var/www/athens/app/frontend/src/app/App.tsx` (Line 264)
  - Path: `/dashboard/admin-creation`
  - Role: `masteradmin` only
- **Menu Config:** 
  - `/var/www/athens/app/frontend/src/features/dashboard/config/menuConfig.tsx` (Line 414)
  - `/var/www/athens/app/frontend/src/features/dashboard/config/projectMenuConfig.tsx` (Line 315)
  - `/var/www/athens/app/frontend/src/features/dashboard/config/enhancedMenuConfig.tsx` (Line 162)

### Backend Files
- **View:** `/var/www/athens/app/backend/authentication/views.py`
  - Class: `MasterAdminCreateProjectAdminsView`
  - Class: `ProjectAdminListByProjectView`
  - Class: `ProjectListView`
- **URL Routes:** `/var/www/athens/app/backend/authentication/urls.py`
  - Line 56: `master-admin/projects/create-admins/`
  - Line 65: `admin/list/<int:project_id>/`
- **Models:** `/var/www/athens/app/backend/authentication/models.py`
  - `CustomUser` model
  - `Project` model
- **Serializers:** `/var/www/athens/app/backend/authentication/serializers.py`
  - `CustomUserSerializer`
  - `ProjectSerializer`

---

## 2. CREATE ADMIN FORM SPECIFICATION

### Form Fields (Exact Order & Structure)

The original Athens application creates admins **per project** with **three admin types**:

#### A. Project Selection (Required First)
| Field | Key | Type | Required | Validation | Source |
|-------|-----|------|----------|------------|--------|
| Select Project | `project_id` | Select (dropdown) | ✅ Yes | Must exist in Project table | `/authentication/project/list/` |

#### B. Client Admin Fields
| Field | Key | Type | Required | Validation | Notes |
|-------|-----|------|----------|------------|-------|
| Username | `client_username` | Text | ✅ Yes | Unique, no spaces | Used for login |
| Company Name | `client_company` | Text | ✅ Yes | Max 255 chars | Stored in `company_name` |
| Registered Official Address | `client_residentAddress` | TextArea | ✅ Yes | - | Stored in `registered_address` |

#### C. EPC Admin Fields
| Field | Key | Type | Required | Validation | Notes |
|-------|-----|------|----------|------------|-------|
| Username | `epc_username` | Text | ✅ Yes | Unique, no spaces | Used for login |
| Company Name | `epc_company` | Text | ✅ Yes | Max 255 chars | Stored in `company_name` |
| Registered Official Address | `epc_residentAddress` | TextArea | ✅ Yes | - | Stored in `registered_address` |

**Special Feature:** EPC admin fields can be **auto-filled** from `/authentication/companydetail/` endpoint if company details exist.

#### D. Contractor Admin Fields (Multiple)
| Field | Key | Type | Required | Validation | Notes |
|-------|-----|------|----------|------------|-------|
| Username | `contractor_username` | Text | ✅ Yes | Unique, no spaces | Used for login |
| Company Name | `contractor_company` | Text | ✅ Yes | Max 255 chars | Stored in `company_name` |
| Registered Official Address | `contractor_residentAddress` | TextArea | ✅ Yes | - | Stored in `registered_address` |

**Note:** Multiple contractor admins can be added dynamically (array of contractors).

### Fields NOT Present in Original
❌ **Name** - NOT collected during admin creation  
❌ **Email** - NOT collected during admin creation  
❌ **Phone Number** - NOT collected during admin creation  
❌ **Company Type Selection** - NOT a separate field (derived from admin_type: client/epc/contractor)  
❌ **Tenant Type** - NOT used (tenant is inherited from project's `athens_tenant_id`)

---

## 3. API SPECIFICATION

### A. Project List Endpoint

**Endpoint:** `GET /authentication/project/list/`  
**Authentication:** Required (JWT)  
**Permission:** Master Admin only

**Response Example:**
```json
[
  {
    "id": 1,
    "projectName": "Solar Power Plant - Phase 1",
    "projectCategory": "power_and_energy",
    "capacity": "100 MW",
    "location": "Gujarat, India",
    "commencementDate": "2024-01-15",
    "deadlineDate": "2025-12-31",
    "athens_tenant_id": "550e8400-e29b-41d4-a716-446655440000"
  }
]
```

### B. Create Admin Endpoint

**Endpoint:** `POST /authentication/master-admin/projects/create-admins/`  
**Authentication:** Required (JWT)  
**Permission:** Master Admin only

**Request Payload (Single Admin Type):**
```json
{
  "project_id": 1,
  "client_username": "client_admin_solar",
  "client_company": "Solar Energy Corp Ltd",
  "client_residentAddress": "123 Solar Street, Gujarat, India - 380001"
}
```

**Request Payload (Multiple Admin Types):**
```json
{
  "project_id": 1,
  "client_username": "client_admin_solar",
  "client_company": "Solar Energy Corp Ltd",
  "client_residentAddress": "123 Solar Street, Gujarat, India",
  "epc_username": "epc_admin_solar",
  "epc_company": "EPC Contractors Pvt Ltd",
  "epc_residentAddress": "456 EPC Avenue, Mumbai, India",
  "contractor_username": "contractor1_solar",
  "contractor_company": "Contractor One Ltd",
  "contractor_residentAddress": "789 Contractor Road, Delhi, India"
}
```

**Request Payload (Multiple Contractors - Array Format):**
```json
{
  "project_id": 1,
  "contractor_admins": [
    {
      "username": "contractor1_solar",
      "company_name": "Contractor One Ltd",
      "registered_address": "789 Contractor Road, Delhi, India"
    },
    {
      "username": "contractor2_solar",
      "company_name": "Contractor Two Ltd",
      "registered_address": "321 Builder Street, Bangalore, India"
    }
  ]
}
```

**Response (Success):**
```json
{
  "created_admins": [
    {
      "username": "client_admin_solar",
      "password": "aB3$xY9@mN2pQ5!z",
      "admin_type": "client"
    },
    {
      "username": "epc_admin_solar",
      "password": "kL7#wR4@tV8nM1!x",
      "admin_type": "epc"
    }
  ],
  "existing_admins": []
}
```

**Response (Partial - Some Already Exist):**
```json
{
  "created_admins": [
    {
      "username": "epc_admin_solar",
      "password": "kL7#wR4@tV8nM1!x",
      "admin_type": "epc"
    }
  ],
  "existing_admins": ["client_admin_solar"]
}
```

### C. Fetch Existing Admins for Project

**Endpoint:** `GET /authentication/admin/list/{project_id}/`  
**Authentication:** Required (JWT)  
**Permission:** Master Admin only

**Response Example:**
```json
{
  "clientAdmin": {
    "id": 123,
    "username": "client_admin_solar",
    "company_name": "Solar Energy Corp Ltd",
    "registered_address": "123 Solar Street, Gujarat, India",
    "admin_type": "client",
    "user_type": "projectadmin",
    "project": 1,
    "is_active": true
  },
  "epcAdmin": {
    "id": 124,
    "username": "epc_admin_solar",
    "company_name": "EPC Contractors Pvt Ltd",
    "registered_address": "456 EPC Avenue, Mumbai, India",
    "admin_type": "epc",
    "user_type": "projectadmin",
    "project": 1,
    "is_active": true
  },
  "contractorAdmins": [
    {
      "id": 125,
      "username": "contractor1_solar",
      "company_name": "Contractor One Ltd",
      "registered_address": "789 Contractor Road, Delhi, India",
      "admin_type": "contractor",
      "user_type": "projectadmin",
      "project": 1,
      "is_active": true
    }
  ]
}
```

### D. Auto-fill Company Details (EPC Only)

**Endpoint:** `GET /authentication/companydetail/`  
**Authentication:** Required (JWT)  
**Permission:** Master Admin only

**Response Example:**
```json
{
  "company_name": "EPC Contractors Pvt Ltd",
  "registered_office_address": "456 EPC Avenue, Mumbai, India - 400001",
  "pan": "ABCDE1234F",
  "gst": "27ABCDE1234F1Z5",
  "contact_phone": "+91-9876543210",
  "contact_email": "info@epccontractors.com"
}
```

---

## 4. BACKEND DATA MODEL

### CustomUser Model Fields (Relevant to Admin Creation)

```python
class CustomUser(AbstractBaseUser, PermissionsMixin):
    # Multi-tenant isolation
    athens_tenant_id = models.UUIDField(null=True)
    
    # Core authentication
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=False, null=True, blank=True)
    
    # User classification
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES)
    # For admins created by master: user_type = 'projectadmin'
    
    admin_type = models.CharField(max_length=20, choices=[...], null=True, blank=True)
    # Values: 'client', 'epc', 'contractor'
    
    # Project assignment
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True, blank=True)
    
    # Company details
    company_name = models.CharField(max_length=255, null=True, blank=True)
    registered_address = models.TextField(null=True, blank=True)
    
    # Password management
    is_autogenerated_password = models.BooleanField(default=True)
    is_password_reset_required = models.BooleanField(default=True)
    
    # Status
    is_active = models.BooleanField(default=True)
```

### Admin Creation Logic (Backend)

1. **Validate project_id** - Must exist and belong to master admin's tenant
2. **Check username uniqueness** - Skip creation if exists
3. **Generate secure password** - 16 chars: letters + digits + special chars (`!@#$%^&*`)
4. **Set user fields:**
   - `user_type` = `'projectadmin'`
   - `admin_type` = `'client'` | `'epc'` | `'contractor'`
   - `project` = selected project ID
   - `athens_tenant_id` = project's `athens_tenant_id` (inherited)
   - `company_name` = from request
   - `registered_address` = from request
   - `is_autogenerated_password` = `True`
   - `is_password_reset_required` = `True`
   - `is_active` = `True`
5. **Return password in response** - Only shown once
6. **Frontend downloads credentials** - As `.txt` file

---

## 5. BUSINESS RULES & WORKFLOW

### A. Project Selection
- Master admin MUST select a project first
- Only projects within master admin's `athens_tenant_id` are shown
- All created admins inherit the project's `athens_tenant_id`

### B. Admin Type Determination
- **NOT a user-selectable field**
- Determined by which form section is filled:
  - `client_username` → `admin_type = 'client'`
  - `epc_username` → `admin_type = 'epc'`
  - `contractor_username` → `admin_type = 'contractor'`

### C. Tenant Scoping
- **NO explicit tenant type selection**
- Tenant is **automatically inherited** from the selected project's `athens_tenant_id`
- This ensures all admins for a project belong to the same tenant

### D. Password Handling
- Backend generates a **16-character secure password**
- Password includes: uppercase, lowercase, digits, special chars (`!@#$%^&*`)
- Password is returned **only once** in the API response
- Frontend **immediately downloads** credentials as `.txt` file
- Format: `{adminType}_admin_credentials_{username}.txt`
- User must reset password on first login (`is_password_reset_required = True`)

### E. Duplicate Handling
- If username already exists, backend **skips creation**
- Returns username in `existing_admins` array
- Does NOT return error - allows partial creation

### F. Update Existing Admins
- If admin already exists (`created = true`), the "Create" button becomes "Sync Admin Details"
- Updates only `company_name` and `registered_address`
- Does NOT change password or username

### G. Delete Admin
- Master admin can delete any project admin
- Requires confirmation dialog
- Permanently deletes the user record

### H. Reset Password
- Master admin can reset any project admin's password
- Requires new password (min 8 characters)
- Sets `is_password_reset_required = True`

---

## 6. PARITY IMPLEMENTATION NOTES FOR ATHENS-2.0

### Current Athens-2.0 Implementation (Simplified)
```json
{
  "name": "John Doe",
  "username": "john.doe"
}
```

### Required Athens-2.0 Implementation (Full Parity)
```json
{
  "project_id": 1,
  "client_username": "john.doe",
  "client_company": "ABC Corp",
  "client_residentAddress": "123 Main St"
}
```

### Key Differences

| Aspect | Athens-2.0 Current | Original Athens | Action Required |
|--------|-------------------|-----------------|-----------------|
| **Project Selection** | ❌ Not required | ✅ Required first | Add project dropdown |
| **Name Field** | ✅ Collected | ❌ Not collected | Remove from creation form |
| **Company Name** | ❌ Not collected | ✅ Required | Add to form |
| **Registered Address** | ❌ Not collected | ✅ Required | Add to form |
| **Admin Type** | ❌ Not clear | ✅ client/epc/contractor | Add three separate sections |
| **Multiple Contractors** | ❌ Not supported | ✅ Supported | Add dynamic contractor array |
| **Tenant Assignment** | ❓ Unclear | ✅ From project | Inherit from project |
| **Password Generation** | ❓ Unclear | ✅ 16-char secure | Implement backend logic |
| **Credential Download** | ❌ Not implemented | ✅ Auto-download .txt | Add frontend download |
| **Auto-fill EPC** | ❌ Not implemented | ✅ From company details | Add auto-fill button |

---

## 7. MINIMAL CHANGES NEEDED IN ATHENS-2.0

### Backend Changes

#### A. Update MasterAdmin Model (if needed)
- Ensure `project` field exists (for project selection)
- Ensure `company_name` and `registered_address` fields exist

#### B. Update Create Admin Endpoint
**Current:** `POST /api/control-plane/masters/`  
**Required:** `POST /api/control-plane/masters/create-project-admins/`

**New Payload Structure:**
```json
{
  "project_id": 1,
  "admin_type": "client",
  "username": "client_admin",
  "company_name": "ABC Corp",
  "registered_address": "123 Main St"
}
```

**New Response Structure:**
```json
{
  "username": "client_admin",
  "password": "aB3$xY9@mN2pQ5!z",
  "admin_type": "client",
  "company_name": "ABC Corp",
  "registered_address": "123 Main St"
}
```

#### C. Add Project List Endpoint
**New:** `GET /api/control-plane/projects/`

**Response:**
```json
[
  {
    "id": 1,
    "name": "Solar Project",
    "tenant_id": "uuid-here"
  }
]
```

#### D. Add Fetch Admins by Project Endpoint
**New:** `GET /api/control-plane/projects/{project_id}/admins/`

**Response:**
```json
{
  "client": {...},
  "epc": {...},
  "contractors": [...]
}
```

### Frontend Changes

#### A. Update Create Admin Modal
**Current Fields:**
- Name
- Username

**Required Fields:**
- Project (dropdown) - **FIRST**
- Admin Type (client/epc/contractor) - **SECOND**
- Username
- Company Name
- Registered Address

#### B. Add Credential Download
After successful creation:
```typescript
const downloadCredentials = (username: string, password: string, adminType: string) => {
  const content = `Admin Type: ${adminType}\nUsername: ${username}\nPassword: ${password}\n`;
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${adminType}_admin_credentials_${username}.txt`;
  a.click();
};
```

#### C. Update Admin List Display
Group admins by project and admin type:
- Client Admin
- EPC Admin
- Contractor Admins (array)

---

## 8. EXACT PAYLOAD MAPPING (Old → New)

### Original Athens Payload
```json
{
  "project_id": 1,
  "client_username": "client_admin",
  "client_company": "ABC Corp",
  "client_residentAddress": "123 Main St"
}
```

### Athens-2.0 Equivalent
```json
{
  "project_id": 1,
  "admin_type": "client",
  "username": "client_admin",
  "company_name": "ABC Corp",
  "registered_address": "123 Main St"
}
```

### Field Mapping Table

| Original Athens | Athens-2.0 | Notes |
|----------------|-----------|-------|
| `project_id` | `project_id` | Direct mapping |
| `client_username` | `username` (when admin_type='client') | Simplified |
| `epc_username` | `username` (when admin_type='epc') | Simplified |
| `contractor_username` | `username` (when admin_type='contractor') | Simplified |
| `client_company` | `company_name` (when admin_type='client') | Simplified |
| `epc_company` | `company_name` (when admin_type='epc') | Simplified |
| `contractor_company` | `company_name` (when admin_type='contractor') | Simplified |
| `client_residentAddress` | `registered_address` (when admin_type='client') | Simplified |
| `epc_residentAddress` | `registered_address` (when admin_type='epc') | Simplified |
| `contractor_residentAddress` | `registered_address` (when admin_type='contractor') | Simplified |
| (derived from field prefix) | `admin_type` | New explicit field |

---

## 9. SECURITY & VALIDATION

### Password Generation Rules
```python
import random
import string

password = ''.join(random.choices(
    string.ascii_letters + string.digits + '!@#$%^&*',
    k=16
)).strip()
```

### Validation Rules
1. **Username:** Unique, no spaces, alphanumeric + underscore
2. **Company Name:** Max 255 characters, required
3. **Registered Address:** Required, no max length
4. **Project ID:** Must exist and belong to master admin's tenant

### Tenant Isolation
- All admins inherit `athens_tenant_id` from the selected project
- Master admin can only see projects within their tenant
- Master admin can only create admins for projects within their tenant

---

## 10. SUMMARY

### What Original Athens Does
1. Master admin selects a **project** (required)
2. Master admin fills **three separate forms** (client, epc, contractor)
3. Each form requires: **username**, **company name**, **registered address**
4. Backend generates **16-char secure password**
5. Backend returns **password in response** (only once)
6. Frontend **auto-downloads credentials** as `.txt` file
7. Admin type is **derived from form section** (not a separate field)
8. Tenant is **inherited from project** (not selected)

### What Athens-2.0 Currently Does
1. Collects **name** and **username** only
2. No project selection
3. No company details
4. No admin type distinction
5. No credential download

### Gap Analysis
- ❌ Missing: Project selection
- ❌ Missing: Company name field
- ❌ Missing: Registered address field
- ❌ Missing: Admin type (client/epc/contractor)
- ❌ Missing: Credential download
- ❌ Missing: Tenant inheritance from project
- ✅ Extra: Name field (not in original)

---

## CONCLUSION

The original Athens application has a **project-centric admin creation workflow** where:
- **Project selection is mandatory**
- **Admin type is implicit** (client/epc/contractor)
- **Company details are required** (name + address)
- **Tenant is inherited** from project
- **Credentials are auto-downloaded**

Athens-2.0 must implement this exact workflow to achieve parity.

**Next Step:** Implement the changes outlined in Section 7 (Minimal Changes Needed).
