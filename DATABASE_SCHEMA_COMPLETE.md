# Athens 2.0 - Complete Database Schema (Updated)
# Athens 2.0 - Complete Database Schema (Updated)

## 📊 Database Overview

**Database Type:** PostgreSQL  
**Total Tables:** 77  
**Last Updated:** February 20, 2025

---

## 🗄️ Table Categories

### 1. Authentication & Users (7 tables)
- `users` - Main user accounts
- `users_groups` - User group memberships
- `users_user_permissions` - User-specific permissions
- `authentication_project` - Business projects ⚠️ **UPDATED** (removed JSON fields)
- `security_logs` - Security event logging
- `service_user_sessions` - Active user sessions
- `token_blacklist_blacklistedtoken` - Revoked JWT tokens
- `token_blacklist_outstandingtoken` - Active JWT tokens

### 2. Control Plane / SaaS Management (4 tables)
- `tenants` - Tenant companies
- `subscriptions` - Subscription plans
- `services` - Available services
- `tenant_services` - Enabled services per tenant

### 3. Contractor Compliance (3 tables) ⭐ **NEW**
- `contractor_master` - Contractor & EPC registry
- `contractor_compliance` - CLRA license tracking
- `contract_labour_deployment` - Worker deployments

### 4. Workforce Management (20 tables)
- `workforce_employee` - Employee master data
- `workforce_department` - Department master
- `workforce_designation` - Designation master
- `workforce_attendance` - Daily attendance
- `workforce_shift_schedule` - Shift definitions
- `workforce_holiday` - Holiday calendar
- `workforce_payroll_cycle` - Payroll periods
- `workforce_payroll_entry` - Salary calculations
- `workforce_payroll_settings` - Payroll configuration
- `workforce_bonus_record` - Bonus payments
- `workforce_fine` - Fine records
- `workforce_advance` - Advance payments
- `workforce_employee_profile` - Legacy employee profiles
- `workforce_leave_type` - Leave type master
- `workforce_leave_balance` - Leave balances
- `workforce_leave_request` - Leave applications
- `workforce_projects` - Workforce projects
- `workforce_project_members` - Project team members
- `workforce_tasks` - Task management
- `workforce_task_comments` - Task discussions
- `workforce_task_dependencies` - Task relationships

### 5. ERGON Module (9 tables)
- `ergon_project` - ERGON projects
- `ergon_task` - ERGON tasks
- `ergon_customer` - Customer master
- `ergon_invoice` - Invoice records
- `ergon_advance` - Advance tracking
- `ergon_expense` - Expense tracking
- `ergon_manpower` - Manpower allocation
- `ergon_machinery` - Machinery allocation
- `ergon_ledger` - Financial ledger

### 6. Projects Module (4 tables)
- `projects` - Project master
- `project_memberships` - Project members
- `project_modules` - Enabled modules per project
- `workforce_customers` - Customer records
- `workforce_invoices` - Invoice management
- `workforce_payments` - Payment tracking
- `workforce_quotations` - Quotation management
- `workforce_purchase_orders` - Purchase orders

### 7. Superadmin Module (17 tables)
- `superadmin_roles` - Role definitions
- `superadmin_permissions` - Permission definitions
- `superadmin_role_permissions` - Role-permission mapping
- `superadmin_user_roles` - User-role assignments
- `superadmin_audit_logs` - Audit trail
- `superadmin_system_settings` - System configuration
- `superadmin_2fa_settings` - 2FA configuration
- `superadmin_2fa_settings_enforce_for_roles` - 2FA enforcement
- `superadmin_session_settings` - Session management
- `superadmin_password_policy` - Password rules
- `superadmin_ip_restrictions` - IP whitelist/blacklist
- `superadmin_database_backups` - Backup records
- `superadmin_announcements` - System announcements
- `superadmin_announcements_target_roles` - Announcement targeting
- `superadmin_notification_deliveries` - Notification tracking

### 8. Athens Legacy (3 tables)
- `athens_tenant_links` - Tenant relationships
- `athens_module_subscriptions` - Module subscriptions
- `athens_audit_logs` - Legacy audit logs

### 9. Django System (6 tables)
- `django_migrations` - Migration history
- `django_session` - Session storage
- `django_content_type` - Content type registry
- `django_admin_log` - Admin action log
- `auth_group` - User groups
- `auth_group_permissions` - Group permissions
- `auth_permission` - Permission definitions

---

## 🆕 New Tables (Contractor Compliance)

### contractor_master
```sql
CREATE TABLE contractor_master (
    id BIGSERIAL PRIMARY KEY,
    athens_tenant_id INTEGER NOT NULL,
    company_type VARCHAR(20) DEFAULT 'contractor',  -- 'contractor' or 'epc'
    company_name VARCHAR(255) NOT NULL,
    company_address TEXT NOT NULL,
    contact_person VARCHAR(200) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    email VARCHAR(254) NOT NULL,
    pan_number VARCHAR(20),
    gst_number VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (athens_tenant_id, company_name)
);

CREATE INDEX contractor_m_athens__idx ON contractor_master(athens_tenant_id, status);
CREATE INDEX contractor_m_company_idx ON contractor_master(company_type);
CREATE INDEX contractor_m_email_idx ON contractor_master(email);
```

### contractor_compliance
```sql
CREATE TABLE contractor_compliance (
    id BIGSERIAL PRIMARY KEY,
    contractor_id BIGINT NOT NULL REFERENCES contractor_master(id) ON DELETE CASCADE,
    branch_id INTEGER NOT NULL,
    clra_license_number VARCHAR(100) NOT NULL,
    license_valid_from DATE NOT NULL,
    license_valid_to DATE NOT NULL,
    max_worker_limit INTEGER NOT NULL CHECK (max_worker_limit >= 1),
    pf_code VARCHAR(100),
    esi_code VARCHAR(100),
    labour_registration_number VARCHAR(100),
    last_return_filed DATE,
    is_compliant BOOLEAN DEFAULT TRUE,
    compliance_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (contractor_id, branch_id)
);

CREATE INDEX contractor_c_license_idx ON contractor_compliance(license_valid_to);
CREATE INDEX contractor_c_complia_idx ON contractor_compliance(is_compliant);
```

### contract_labour_deployment
```sql
CREATE TABLE contract_labour_deployment (
    id BIGSERIAL PRIMARY KEY,
    athens_tenant_id INTEGER NOT NULL,
    branch_id INTEGER NOT NULL,
    project_id BIGINT NOT NULL REFERENCES authentication_project(id) ON DELETE CASCADE,
    contractor_compliance_id BIGINT NOT NULL REFERENCES contractor_compliance(id) ON DELETE PROTECT,
    employee_id BIGINT NOT NULL REFERENCES workforce_employee(id) ON DELETE CASCADE,
    wage_rate DECIMAL(10,2) NOT NULL,
    deployment_start DATE NOT NULL,
    deployment_end DATE,
    status VARCHAR(20) DEFAULT 'active',
    work_order_number VARCHAR(100),
    work_order_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX contract_la_athens__idx ON contract_labour_deployment(athens_tenant_id, status);
CREATE INDEX contract_la_project_idx ON contract_labour_deployment(project_id, status);
CREATE INDEX contract_la_contrac_idx ON contract_labour_deployment(contractor_compliance_id);
CREATE INDEX contract_la_deploym_idx ON contract_labour_deployment(deployment_start, deployment_end);
```

---

## ⚠️ Updated Tables

### authentication_project
**Removed Fields:**
- ❌ `contractor_company_ids` (JSONB) - Migrated to `contractor_master`
- ❌ `epc_company_ids` (JSONB) - Migrated to `contractor_master` with `company_type='epc'`

**Remaining Fields:**
- `id` - Primary key
- `athens_tenant_id` - Tenant ID
- `subscriber_role` - 'client' or 'epc'
- `client_company_id` - Single client UUID
- `projectName` - Project name
- `projectCategory` - Industry category
- `capacity` - Project capacity
- `location` - Project location
- `latitude`, `longitude` - GPS coordinates
- `nearestPoliceStation`, `nearestPoliceStationContact`
- `nearestHospital`, `nearestHospitalContact`
- `commencementDate`, `deadlineDate`

---

## 🔗 Key Relationships

### Contractor Compliance Flow
```
Tenants
  └── ContractorMaster (contractors + EPC)
        └── ContractorCompliance (CLRA licenses)
              └── ContractLabourDeployment
                    ├── → Employee
                    └── → Project
```

### User & Authentication
```
Tenants
  └── Users
        ├── → SecurityLogs
        ├── → ServiceUserSessions
        └── → Projects (via membership)
```

### Workforce Management
```
Tenants
  └── Employees
        ├── → Attendance
        ├── → PayrollEntry
        ├── → LeaveRequest
        ├── → ContractLabourDeployment (if contract worker)
        └── → Department, Designation
```

---

## 📈 Database Statistics

| Category | Tables | Status |
|----------|--------|--------|
| Authentication | 7 | ✅ Active |
| Control Plane | 4 | ✅ Active |
| Contractor Compliance | 3 | ⭐ NEW |
| Workforce | 20 | ✅ Active |
| ERGON | 9 | ✅ Active |
| Projects | 9 | ✅ Active |
| Superadmin | 17 | ✅ Active |
| Athens Legacy | 3 | ⚠️ Legacy |
| Django System | 6 | ✅ System |
| **Total** | **77** | **✅ Complete** |

---

## 🎯 CLRA Compliance Enabled

With the new contractor compliance tables, the following statutory forms are now fully automated:

✅ Register of Contractors  
✅ Form XIII – Workmen by Contractor  
✅ Form XVI – Muster Roll (CLRA)  
✅ Form XVII – Wage Register (CLRA)  
✅ Form XIX – Wage Slip  
✅ Form XX – Register of Deductions  
✅ Form XXI – Register of Fines  
✅ Form XXII – Register of Advances  
✅ Form XXIII – Register of Overtime  
✅ Form XXIV – Half-Yearly Return  
✅ Form XXV – Annual Return  

---

## 🔍 Query Examples

### Get all contractors with expiring licenses (30 days)
```sql
SELECT cm.company_name, cc.clra_license_number, cc.license_valid_to,
       (cc.license_valid_to - CURRENT_DATE) as days_remaining
FROM contractor_master cm
JOIN contractor_compliance cc ON cm.id = cc.contractor_id
WHERE cc.license_valid_to BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
ORDER BY cc.license_valid_to;
```

### Get active contract workers per project
```sql
SELECT p.projectName, cm.company_name, COUNT(cld.id) as worker_count,
       cc.max_worker_limit
FROM authentication_project p
JOIN contract_labour_deployment cld ON p.id = cld.project_id
JOIN contractor_compliance cc ON cld.contractor_compliance_id = cc.id
JOIN contractor_master cm ON cc.contractor_id = cm.id
WHERE cld.status = 'active'
GROUP BY p.projectName, cm.company_name, cc.max_worker_limit;
```

### Get contractor compliance status
```sql
SELECT cm.company_name, cm.company_type,
       COUNT(cc.id) as branches,
       SUM(CASE WHEN cc.is_compliant THEN 1 ELSE 0 END) as compliant_branches
FROM contractor_master cm
LEFT JOIN contractor_compliance cc ON cm.id = cc.contractor_id
WHERE cm.status = 'active'
GROUP BY cm.company_name, cm.company_type;
```

---
**Last Updated:** February 20, 2025  
**Database Version:** PostgreSQL 14+  
**Total Tables:** 77 (3 new contractor compliance tables)
