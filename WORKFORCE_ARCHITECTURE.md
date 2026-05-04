# 🏗 WORKFORCE MODULE ARCHITECTURE

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ATHENS 2.0                               │
│                    WORKFORCE MANAGEMENT                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  MODULE 1: EMPLOYEE & WORKFORCE MANAGEMENT                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Department   │  │ Designation  │  │ Employee             │  │
│  │              │  │              │  │ • Identity           │  │
│  │ • name       │  │ • name       │  │ • Employment         │  │
│  │              │  │              │  │ • Statutory          │  │
│  │              │  │              │  │ • Wage Structure     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
│  Purpose: Master data registry (NO calculations)                │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             │ READ-ONLY ACCESS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  MODULE 2: ATTENDANCE & WORK HOURS MANAGEMENT                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ ShiftSchedule│  │ Holiday      │  │ Attendance           │  │
│  │              │  │              │  │ • employee           │  │
│  │ • shift_name │  │ • date       │  │ • date               │  │
│  │ • start_time │  │ • type       │  │ • in_time/out_time   │  │
│  │ • end_time   │  │ • reference  │  │ • total_hours        │  │
│  │ • weekly_off │  │              │  │ • overtime_hours     │  │
│  │              │  │              │  │ • status (P/A/L/H/WO)│  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
│  Purpose: Daily time tracking (NO payroll calculations)         │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             │ READ-ONLY ACCESS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  MODULE 3: PAYROLL & WAGE MANAGEMENT (STANDALONE)               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ PayrollService (Business Logic Layer)                    │   │
│  │ • get_attendance_summary()                               │   │
│  │ • calculate_earnings()                                   │   │
│  │ • calculate_deductions()                                 │   │
│  │ • process_payroll_cycle()                                │   │
│  │ • calculate_bonus()                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ PayrollCycle │  │ PayrollEntry │  │ PayrollSettings      │  │
│  │              │  │              │  │                      │  │
│  │ • cycle_name │  │ • Work       │  │ • pf_rate (12%)      │  │
│  │ • period     │  │ • Earnings   │  │ • esi_rate (0.75%)   │  │
│  │ • status     │  │ • Deductions │  │ • ot_multiplier (2x) │  │
│  │   draft      │  │ • Net Salary │  │ • bonus_percent      │  │
│  │   processed  │  │              │  │                      │  │
│  │   locked     │  │              │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ BonusRecord  │  │ Fine         │  │ Advance              │  │
│  │              │  │              │  │                      │  │
│  │ • year       │  │ • date       │  │ • date               │  │
│  │ • percentage │  │ • amount     │  │ • amount             │  │
│  │ • amount     │  │ • reason     │  │ • status             │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
│  Purpose: Wage calculation (Independent & Microservice Ready)   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     PAYROLL PROCESSING FLOW                     │
└─────────────────────────────────────────────────────────────────┘

1. CREATE CYCLE
   POST /api/workforce/payroll-cycles/
   ↓
   Status: draft

2. PROCESS PAYROLL
   POST /api/workforce/payroll-cycles/{id}/process/
   ↓
   ┌─────────────────────────────────────────────────────────────┐
   │ For each active employee:                                   │
   │                                                             │
   │ Step 1: Fetch Employee Data (READ-ONLY)                    │
   │   • Basic structure, DA, HRA, allowances                   │
   │   • PF/ESI applicability                                   │
   │   • Overtime rate                                          │
   │                                                             │
   │ Step 2: Fetch Attendance Summary (READ-ONLY)               │
   │   • Total days worked (status='P')                         │
   │   • Paid leave days (status='L')                           │
   │   • Unpaid leave days (status='A')                         │
   │   • Total overtime hours                                   │
   │                                                             │
   │ Step 3: Calculate Earnings                                 │
   │   Basic + DA + HRA + Allowances                            │
   │   + (OT hours × OT rate × multiplier)                      │
   │   = Gross Salary                                           │
   │                                                             │
   │ Step 4: Calculate Deductions                               │
   │   PF (basic × 12%)                                         │
   │   + ESI (gross × 0.75%)                                    │
   │   + Fines (from period)                                    │
   │   + Advances (approved, from period)                       │
   │   = Total Deductions                                       │
   │                                                             │
   │ Step 5: Calculate Net                                      │
   │   Net = Gross - Total Deductions                           │
   │                                                             │
   │ Step 6: Create PayrollEntry                                │
   │   Store all calculated values                              │
   └─────────────────────────────────────────────────────────────┘
   ↓
   Status: processed

3. LOCK CYCLE
   POST /api/workforce/payroll-cycles/{id}/lock/
   ↓
   Status: locked (no further edits allowed)

4. GENERATE REPORTS
   • Wage Register
   • Wage Slips
   • Compliance Forms
```

## API Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                               │
└─────────────────────────────────────────────────────────────────┘

/api/workforce/
├── departments/              ← Module 1: Employee Management
├── designations/
├── employees/
│   └── {id}/
│       ├── GET    (retrieve)
│       ├── PUT    (update)
│       └── DELETE (soft delete → status='inactive')
│
├── shifts/                   ← Module 2: Attendance Tracking
├── holidays/
├── attendance/
│
├── payroll-cycles/           ← Module 3: Payroll Processing
│   └── {id}/
│       ├── GET    (retrieve)
│       ├── PUT    (update if draft)
│       ├── process/  POST (calculate payroll)
│       └── lock/     POST (lock cycle)
│
├── payroll-entries/          (read-only)
├── payroll-settings/
├── bonus-records/
├── fines/
└── advances/

All endpoints require:
• IsAuthenticated
• WorkforceServiceEnabled
• IsWorkforceAdmin (for write operations)
```

## Service Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PayrollService (services.py)                 │
└─────────────────────────────────────────────────────────────────┘

class PayrollService:
    
    @staticmethod
    def get_attendance_summary(employee, from, to)
        → Returns: {days_worked, leave_days, ot_hours}
    
    @staticmethod
    def calculate_earnings(employee, summary, settings)
        → Returns: {basic, da, hra, allowances, ot, gross}
    
    @staticmethod
    def calculate_deductions(employee, earnings, from, to, settings)
        → Returns: {pf, esi, pt, fines, advances, total}
    
    @staticmethod
    def process_payroll_cycle(cycle, tenant_id)
        → Creates PayrollEntry for each active employee
        → Updates cycle status to 'processed'
        → Returns: {success, entries_created, message}
    
    @staticmethod
    def calculate_bonus(employee, year, settings)
        → Returns: {total_salary, percentage, amount}

Benefits:
✓ Testable in isolation
✓ No direct DB writes to Employee/Attendance
✓ Can be extracted to microservice
✓ Reusable across different interfaces
```

## Database Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE TABLES                            │
└─────────────────────────────────────────────────────────────────┘

workforce_department
├── id (PK)
├── athens_tenant_id (indexed)
├── name
└── created_at

workforce_designation
├── id (PK)
├── athens_tenant_id (indexed)
├── name
└── created_at

workforce_employee
├── id (PK)
├── athens_tenant_id (indexed)
├── employee_code (unique per tenant)
├── full_name
├── date_of_birth
├── department_id (FK)
├── designation_id (FK)
├── employment_type
├── status (active/inactive)
├── wage_type (daily/monthly)
├── basic_structure
├── da_structure
├── hra_structure
├── pf_applicable
├── esi_applicable
└── ... (20+ fields)

workforce_shift_schedule
├── id (PK)
├── athens_tenant_id (indexed)
├── shift_name
├── start_time
├── end_time
└── weekly_off_day

workforce_holiday
├── id (PK)
├── athens_tenant_id (indexed)
├── holiday_date
├── holiday_type
└── description

workforce_attendance
├── id (PK)
├── athens_tenant_id (indexed)
├── employee_id (FK → workforce_employee)
├── date
├── shift_id (FK)
├── in_time
├── out_time
├── total_hours
├── overtime_hours
└── status (P/A/L/H/WO)
    UNIQUE(employee_id, date)

workforce_payroll_cycle
├── id (PK)
├── athens_tenant_id (indexed)
├── cycle_name
├── period_from
├── period_to
├── status (draft/processed/locked)
└── processed_at

workforce_payroll_entry
├── id (PK)
├── athens_tenant_id (indexed)
├── payroll_cycle_id (FK)
├── employee_id (FK → workforce_employee)
├── total_days_worked
├── overtime_hours
├── basic_earned
├── gross_salary
├── total_deductions
├── net_salary
└── ... (20+ fields)
    UNIQUE(payroll_cycle_id, employee_id)

workforce_payroll_settings
├── id (PK)
├── athens_tenant_id (unique)
├── pf_rate (default 12.00)
├── esi_rate (default 0.75)
├── ot_multiplier (default 2.00)
└── bonus_min_percent (default 8.33)

workforce_bonus_record
workforce_fine
workforce_advance
```

## Tenant Isolation

```
┌─────────────────────────────────────────────────────────────────┐
│                    MULTI-TENANT ARCHITECTURE                    │
└─────────────────────────────────────────────────────────────────┘

Every model includes:
• athens_tenant_id (indexed)

Every query filters by:
• athens_tenant_id = current_user.tenant.id

Example:
Employee.objects.filter(athens_tenant_id=tenant.id, status='active')

Benefits:
✓ Complete data isolation
✓ No cross-tenant data leaks
✓ Scalable to thousands of tenants
✓ Sharding-ready architecture
```

---

**Architecture Status:** ✅ COMPLETE  
**Design Pattern:** Three-Layer Separation with Service Layer  
**Microservice Ready:** ✅ Yes  
**Tenant Isolated:** ✅ Yes  
**Production Ready:** ✅ Yes
