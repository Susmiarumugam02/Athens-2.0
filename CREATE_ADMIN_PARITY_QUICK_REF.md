# Create Admin Parity - Quick Reference

## TL;DR - What's Different?

### Original Athens (What We Need)
```
1. Select Project (dropdown) ← REQUIRED FIRST
2. Fill Client Admin: username, company name, address
3. Fill EPC Admin: username, company name, address
4. Fill Contractor(s): username, company name, address
5. Click "Create" → Backend generates password
6. Frontend auto-downloads credentials.txt
```

### Athens-2.0 Current (What We Have)
```
1. Enter Name
2. Enter Username
3. Click "Create"
```

---

## Critical Missing Fields

| Field | Original Athens | Athens-2.0 | Priority |
|-------|----------------|-----------|----------|
| **Project Selection** | ✅ Required | ❌ Missing | 🔴 Critical |
| **Company Name** | ✅ Required | ❌ Missing | 🔴 Critical |
| **Registered Address** | ✅ Required | ❌ Missing | 🔴 Critical |
| **Admin Type** | ✅ client/epc/contractor | ❌ Missing | 🔴 Critical |
| **Credential Download** | ✅ Auto .txt | ❌ Missing | 🔴 Critical |
| Name | ❌ Not used | ✅ Has | 🟡 Remove |

---

## API Endpoints Needed

### 1. Project List
```
GET /api/control-plane/projects/
Response: [{ id, name, tenant_id }]
```

### 2. Create Admin (Updated)
```
POST /api/control-plane/masters/create-project-admins/
Payload: {
  project_id: 1,
  admin_type: "client",
  username: "client_admin",
  company_name: "ABC Corp",
  registered_address: "123 Main St"
}
Response: {
  username: "client_admin",
  password: "aB3$xY9@mN2pQ5!z",  ← ONLY SHOWN ONCE
  admin_type: "client"
}
```

### 3. Fetch Admins by Project
```
GET /api/control-plane/projects/{project_id}/admins/
Response: {
  client: {...},
  epc: {...},
  contractors: [...]
}
```

---

## Form Structure (Original Athens)

```tsx
<Form>
  {/* STEP 1: Project Selection */}
  <Select name="project_id" required>
    <Option value={1}>Solar Project</Option>
  </Select>

  {/* STEP 2: Client Admin */}
  <Card title="Client Admin">
    <Input name="client_username" required />
    <Input name="client_company" required />
    <TextArea name="client_residentAddress" required />
    <Button>Create Client Admin</Button>
  </Card>

  {/* STEP 3: EPC Admin */}
  <Card title="EPC Admin">
    <Input name="epc_username" required />
    <Input name="epc_company" required />
    <TextArea name="epc_residentAddress" required />
    <Button>Create EPC Admin</Button>
  </Card>

  {/* STEP 4: Contractor Admin(s) */}
  <Card title="Contractor Admin 1">
    <Input name="contractor_username" required />
    <Input name="contractor_company" required />
    <TextArea name="contractor_residentAddress" required />
    <Button>Create Contractor Admin</Button>
  </Card>
  
  <Button>+ Add Another Contractor</Button>
</Form>
```

---

## Password Generation (Backend)

```python
import random
import string

# 16 characters: letters + digits + special chars
password = ''.join(random.choices(
    string.ascii_letters + string.digits + '!@#$%^&*',
    k=16
)).strip()

# Example: "aB3$xY9@mN2pQ5!z"
```

---

## Credential Download (Frontend)

```typescript
const downloadCredentials = (data: {
  username: string;
  password: string;
  admin_type: string;
  company_name: string;
  registered_address: string;
}) => {
  const content = `Admin Type: ${data.admin_type.toUpperCase()}
Username: ${data.username}
Password: ${data.password}
Company Name: ${data.company_name}
Registered Address: ${data.registered_address}
`;

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.admin_type}_admin_credentials_${data.username}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
```

---

## Key Business Rules

1. **Project is mandatory** - Must select before creating any admin
2. **Admin type is implicit** - Determined by which form section is filled
3. **Tenant is inherited** - From project's `athens_tenant_id`
4. **Password shown once** - Backend returns it, frontend downloads it
5. **Three admin types** - Client, EPC, Contractor (multiple contractors allowed)
6. **Company details required** - Name + Address for all admin types

---

## Implementation Checklist

### Backend
- [ ] Add `project_id` field to MasterAdmin model
- [ ] Add `company_name` field to MasterAdmin model
- [ ] Add `registered_address` field to MasterAdmin model
- [ ] Add `admin_type` field (client/epc/contractor)
- [ ] Create `GET /api/control-plane/projects/` endpoint
- [ ] Update `POST /api/control-plane/masters/` to accept new fields
- [ ] Implement 16-char password generation
- [ ] Return password in response (only once)
- [ ] Add `GET /api/control-plane/projects/{id}/admins/` endpoint

### Frontend
- [ ] Add project selection dropdown (first field)
- [ ] Remove "Name" field from create form
- [ ] Add "Company Name" field
- [ ] Add "Registered Address" field
- [ ] Add "Admin Type" selection (client/epc/contractor)
- [ ] Implement credential download on success
- [ ] Update form validation
- [ ] Update admin list to group by project + type

---

## File Locations (Original Athens)

**Frontend:**
- `/var/www/athens/app/frontend/src/features/admin/components/AdminCreation.tsx`

**Backend:**
- `/var/www/athens/app/backend/authentication/views.py` (MasterAdminCreateProjectAdminsView)
- `/var/www/athens/app/backend/authentication/models.py` (CustomUser, Project)

---

## Example Flow

```
1. Master Admin logs in
2. Navigates to "Admin Users" → "Create Admin"
3. Selects "Solar Project" from dropdown
4. Fills Client Admin form:
   - Username: client_solar
   - Company: Solar Corp
   - Address: 123 Solar St
5. Clicks "Create Client Admin"
6. Backend generates: password = "aB3$xY9@mN2pQ5!z"
7. Frontend downloads: client_admin_credentials_client_solar.txt
8. File contains:
   Admin Type: CLIENT
   Username: client_solar
   Password: aB3$xY9@mN2pQ5!z
   Company Name: Solar Corp
   Registered Address: 123 Solar St
9. Master Admin shares credentials with client
10. Client logs in and is forced to reset password
```

---

## Next Steps

1. Read full spec: `ORIGINAL_ATHENS_CREATE_ADMIN_SPEC.md`
2. Update backend models and endpoints
3. Update frontend form and services
4. Test end-to-end flow
5. Verify credential download works
6. Verify tenant isolation works

---

**Status:** ✅ Analysis Complete | 📋 Spec Ready | ⏳ Implementation Pending
