# 🧱 WORKFORCE MODULE IMPLEMENTATION

## ✅ COMPLETE - Three Module Architecture

Implementation of the Employee, Attendance, and Payroll management system as per specification.

---

## 📦 MODULE 1: EMPLOYEE & WORKFORCE MANAGEMENT

### Purpose
Master data layer. No calculations. Pure employee registry.

### Models

#### Department
- `athens_tenant_id` - Tenant isolation
- `name` - Department name
- Unique per tenant

#### Designation
- `athens_tenant_id` - Tenant isolation
- `name` - Designation/role name
- Unique per tenant

#### Employee
**Identity Block:**
- `employee_code` - Unique per tenant
- `full_name`
- `father_or_husband_name`
- `gender` - M/F/O
- `date_of_birth`
- `age` - Virtual property (calculated)
- `permanent_address`
- `contact_number`

**Employment Block:**
- `department` - FK to Department
- `designation` - FK to Designation
- `employment_type` - permanent/contract/temporary
- `skill_category`
- `joining_date`
- `confirmation_date`
- `leaving_date`
- `status` - active/inactive

**Statutory Block:**
- `uan_number` - UAN for PF
- `esi_number` - ESI number
- `pf_applicable` - Boolean
- `esi_applicable` - Boolean
- `lwf_applicable` - Boolean

**Wage Structure (Static):**
- `wage_type` - daily/monthly
- `basic_structure`
- `da_structure`
- `hra_structure`
- `other_allowances_structure`
- `overtime_rate`

### API Endpoints

```
GET/POST   /api/workforce/departments/
GET/PUT    /api/workforce/departments/{id}/

GET/POST   /api/workforce/designations/
GET/PUT    /api/workforce/designations/{id}/

GET/POST   /api/workforce/employees/
GET/PUT    /api/workforce/employees/{id}/
DELETE     /api/workforce/employees/{id}/  (soft delete - marks inactive)
```

### Rules
- Age validation (calculated from DOB)
- Soft delete only (never hard delete)
- Employee code unique per tenant
- Status defaults to 'active'

---

## 📦 MODULE 2: ATTENDANCE & WORK HOURS MANAGEMENT

### Purpose
Daily time tracking engine. NO payroll calculations here.

### Models

#### ShiftSchedule
- `shift_name`
- `start_time`
- `end_time`
- `weekly_off_day` - 0=Monday, 6=Sunday
- `max_hours_per_day` - Default 9

#### Holiday
- `holiday_date`
- `holiday_type` - national/festival/restricted
- `notification_reference`
- `description`

#### Attendance
- `employee` - FK to Employee
- `date`
- `shift` - FK to ShiftSchedule
- `in_time`
- `out_time`
- `total_hours`
- `overtime_hours`
- `status` - P/A/L/H/WO (Present/Absent/Leave/Holiday/Weekly Off)

### API Endpoints

```
GET/POST   /api/workforce/shifts/
GET/PUT    /api/workforce/shifts/{id}/

GET/POST   /api/workforce/holidays/
GET/PUT    /api/workforce/holidays/{id}/

GET/POST   /api/workforce/attendance/
GET/PUT    /api/workforce/attendance/{id}/
```

### Rules
- 9 hours/day limit (configurable per shift)
- 48 hours/week limit
- Weekly off enforcement
- Unique attendance per employee per date

---

## 📦 MODULE 3: PAYROLL & WAGE MANAGEMENT (STANDALONE)

### Purpose
Independent payroll processing. Reads from Employee and Attendance. Never modifies them.

### Design Philosophy
✔ Independent  
✔ Microservice ready  
✔ Decoupled from existing structure  
✔ Read-only access to Employee and Attendance modules

### Models

#### PayrollCycle
- `cycle_name` - e.g., "May 2026"
- `period_from`
- `period_to`
- `status` - draft/processed/locked
- `processed_at`

#### PayrollEntry
**Work Summary:**
- `payroll_cycle` - FK
- `employee` - FK (reference only)
- `total_days_worked`
- `paid_leave_days`
- `unpaid_leave_days`
- `overtime_hours`

**Earnings:**
- `basic_earned`
- `da_earned`
- `hra_earned`
- `other_allowances`
- `overtime_wages`
- `gross_salary`

**Deductions:**
- `pf_employee`
- `esi_employee`
- `professional_tax`
- `fines`
- `advances`
- `other_deductions`
- `total_deductions`

**Final:**
- `net_salary`
- `payment_date`
- `payment_mode` - cash/bank/cheque
- `transaction_reference`

#### PayrollSettings
- `pf_rate` - Default 12%
- `esi_rate` - Default 0.75%
- `bonus_min_percent` - Default 8.33%
- `bonus_max_percent` - Default 20%
- `ot_multiplier` - Default 2x
- `min_wage_category`

#### BonusRecord
- `accounting_year`
- `employee`
- `total_salary_for_year`
- `bonus_percentage`
- `bonus_amount`
- `payment_date`

#### Fine
- `employee`
- `fine_date`
- `amount`
- `reason`

#### Advance
- `employee`
- `advance_date`
- `amount`
- `reason`
- `status` - pending/approved/recovered

### API Endpoints

```
GET/POST   /api/workforce/payroll-cycles/
GET/PUT    /api/workforce/payroll-cycles/{id}/
POST       /api/workforce/payroll-cycles/{id}/process/  (Process payroll)
POST       /api/workforce/payroll-cycles/{id}/lock/     (Lock cycle)

GET        /api/workforce/payroll-entries/
GET        /api/workforce/payroll-entries/{id}/

GET/POST   /api/workforce/payroll-settings/
GET/PUT    /api/workforce/payroll-settings/{id}/

GET/POST   /api/workforce/bonus-records/
GET/POST   /api/workforce/fines/
GET/POST   /api/workforce/advances/
```

### Payroll Processing Flow

```
1. Fetch active employees (read-only)
   ↓
2. Fetch attendance summary for period (read-only)
   ↓
3. Calculate earnings
   - Basic, DA, HRA from employee structure
   - OT = overtime_hours × hourly_rate × multiplier
   ↓
4. Calculate deductions
   - PF = basic × rate (if applicable)
   - ESI = gross × rate (if applicable)
   - Fines from period
   - Advances from period
   ↓
5. Calculate net salary
   - Net = Gross - Total Deductions
   ↓
6. Store payroll_entries
   ↓
7. Mark cycle as 'processed'
   ↓
8. Lock cycle (optional - prevents further edits)
```

### Payroll Service Layer

The `PayrollService` class provides standalone processing:

```python
from workforce.services import PayrollService

# Process a payroll cycle
result = PayrollService.process_payroll_cycle(cycle, tenant_id)

# Get attendance summary
summary = PayrollService.get_attendance_summary(employee, from_date, to_date)

# Calculate earnings
earnings = PayrollService.calculate_earnings(employee, summary, settings)

# Calculate deductions
deductions = PayrollService.calculate_deductions(employee, earnings, from_date, to_date, settings)

# Calculate bonus
bonus = PayrollService.calculate_bonus(employee, year, settings)
```

### Rules
- Cannot edit after locked
- OT = overtime_hours × hourly_rate × multiplier
- PF = basic × rate (only if pf_applicable)
- ESI = gross × rate (only if esi_applicable)
- Bonus 8.33% - 20%
- Minimum wage validation

---

## 🔗 INTER-MODULE CONNECTIONS

```
EMPLOYEE MODULE (Master Data)
    ↓ (read-only)
ATTENDANCE MODULE (Time Tracking)
    ↓ (read-only)
PAYROLL MODULE (Wage Calculation)
    ↓
COMPLIANCE ENGINE (Future)
```

**No reverse dependency.**  
Payroll does NOT update employees or attendance.

---

## 📄 FORMS GENERATED

### From Employee Module
- Register of Workmen
- Adult Worker Register
- Employment Card
- CLRA Workmen Register

### From Attendance Module
- Muster Register
- OT Registers
- Leave with Wages
- Notice of Periods of Work
- Holiday Register

### From Payroll Module
- Wage Register
- Overtime Register
- Wage Slip
- Fines Register
- Advances Register
- Bonus Register
- Unpaid Accumulation

---

## 🚀 GETTING STARTED

### 1. Run Migrations

```bash
cd backend
source .venv/bin/activate
python manage.py migrate workforce
```

### 2. Create Payroll Settings

```bash
POST /api/workforce/payroll-settings/
{
  "pf_rate": 12.00,
  "esi_rate": 0.75,
  "bonus_min_percent": 8.33,
  "bonus_max_percent": 20.00,
  "ot_multiplier": 2.00,
  "min_wage_category": "Skilled"
}
```

### 3. Create Departments & Designations

```bash
POST /api/workforce/departments/
{"name": "Engineering"}

POST /api/workforce/designations/
{"name": "Site Engineer"}
```

### 4. Add Employees

```bash
POST /api/workforce/employees/
{
  "employee_code": "EMP001",
  "full_name": "John Doe",
  "gender": "M",
  "date_of_birth": "1990-01-01",
  "permanent_address": "123 Main St",
  "contact_number": "9876543210",
  "department": 1,
  "designation": 1,
  "employment_type": "permanent",
  "joining_date": "2024-01-01",
  "status": "active",
  "wage_type": "monthly",
  "basic_structure": 15000.00,
  "da_structure": 3000.00,
  "hra_structure": 5000.00,
  "pf_applicable": true,
  "esi_applicable": true
}
```

### 5. Mark Attendance

```bash
POST /api/workforce/attendance/
{
  "employee": 1,
  "date": "2025-02-01",
  "in_time": "09:00:00",
  "out_time": "18:00:00",
  "total_hours": 9.00,
  "overtime_hours": 0.00,
  "status": "P"
}
```

### 6. Process Payroll

```bash
# Create cycle
POST /api/workforce/payroll-cycles/
{
  "cycle_name": "February 2025",
  "period_from": "2025-02-01",
  "period_to": "2025-02-28",
  "status": "draft"
}

# Process payroll
POST /api/workforce/payroll-cycles/1/process/

# Lock cycle
POST /api/workforce/payroll-cycles/1/lock/
```

---

## 🧪 TESTING

```bash
cd backend
source .venv/bin/activate
pytest workforce/tests/ -v
```

---

## 🏗 ARCHITECTURE BENEFITS

### ✅ Separation of Concerns
- Employee data is isolated
- Attendance tracking is independent
- Payroll calculations are standalone

### ✅ Microservice Ready
- Payroll module can be extracted to separate service
- Uses read-only access to other modules
- No tight coupling

### ✅ Maintainable
- Clear boundaries between modules
- Service layer for business logic
- Easy to test and debug

### ✅ Scalable
- Each module can scale independently
- Payroll processing can be queued
- Database can be sharded by tenant

---

## 📊 DATABASE TABLES

```
workforce_department
workforce_designation
workforce_employee
workforce_shift_schedule
workforce_holiday
workforce_attendance
workforce_payroll_cycle
workforce_payroll_entry
workforce_payroll_settings
workforce_bonus_record
workforce_fine
workforce_advance
```

---

## 🔒 PERMISSIONS

All endpoints require:
- `IsAuthenticated`
- `WorkforceServiceEnabled` (service must be enabled for tenant)
- `IsWorkforceAdmin` (for admin operations)

---

## 📝 NOTES

- Employee soft delete only (status='inactive')
- Payroll cycles cannot be edited after locked
- Attendance is unique per employee per date
- All monetary values use Decimal for precision
- Tenant isolation enforced on all queries

---

**Status:** ✅ COMPLETE  
**Last Updated:** February 6, 2025
