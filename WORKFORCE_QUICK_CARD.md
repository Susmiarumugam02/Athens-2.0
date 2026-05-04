# 🧱 WORKFORCE MODULE - QUICK REFERENCE

## 🎯 Three Independent Modules

```
┌─────────────────────────────┐
│  MODULE 1: EMPLOYEE         │  Master data registry
│  - Departments              │  No calculations
│  - Designations             │  Pure employee info
│  - Employees                │
└──────────┬──────────────────┘
           │ (read-only)
┌──────────▼──────────────────┐
│  MODULE 2: ATTENDANCE       │  Time tracking
│  - Shifts                   │  No payroll logic
│  - Holidays                 │  Daily records
│  - Attendance               │
└──────────┬──────────────────┘
           │ (read-only)
┌──────────▼──────────────────┐
│  MODULE 3: PAYROLL          │  Standalone
│  - Cycles                   │  Microservice ready
│  - Entries                  │  Wage calculation
│  - Settings                 │
│  - Bonus/Fines/Advances     │
└─────────────────────────────┘
```

## 📦 API Endpoints

### Employee Management
```
/api/workforce/departments/
/api/workforce/designations/
/api/workforce/employees/
```

### Attendance Tracking
```
/api/workforce/shifts/
/api/workforce/holidays/
/api/workforce/attendance/
```

### Payroll Processing
```
/api/workforce/payroll-cycles/
/api/workforce/payroll-cycles/{id}/process/  ← Process
/api/workforce/payroll-cycles/{id}/lock/     ← Lock
/api/workforce/payroll-entries/
/api/workforce/payroll-settings/
/api/workforce/bonus-records/
/api/workforce/fines/
/api/workforce/advances/
```

## 💰 Payroll Calculation Logic

```python
# Earnings
Basic + DA + HRA + Other Allowances + OT Wages = Gross

# OT Wages
OT = overtime_hours × overtime_rate × multiplier (default 2x)

# Deductions
PF = basic × 12% (if applicable)
ESI = gross × 0.75% (if applicable)
+ Fines + Advances = Total Deductions

# Net Salary
Net = Gross - Total Deductions
```

## 🔄 Payroll Workflow

```bash
# 1. Create cycle
POST /api/workforce/payroll-cycles/
{
  "cycle_name": "Feb 2025",
  "period_from": "2025-02-01",
  "period_to": "2025-02-28",
  "status": "draft"
}

# 2. Process (auto-calculates for all active employees)
POST /api/workforce/payroll-cycles/1/process/

# 3. Lock (prevents edits)
POST /api/workforce/payroll-cycles/1/lock/
```

## 🚦 Status Flow

```
Employee:  active → inactive (soft delete)
Attendance: P/A/L/H/WO
Payroll:   draft → processed → locked
Advance:   pending → approved → recovered
```

## 📊 Key Models

### Employee
- Identity: code, name, DOB, gender, address
- Employment: dept, designation, type, dates
- Statutory: UAN, ESI, PF flags
- Wage: basic, DA, HRA, allowances, OT rate

### Attendance
- employee, date, shift
- in_time, out_time
- total_hours, overtime_hours
- status (P/A/L/H/WO)

### PayrollEntry
- Work: days_worked, leave_days, OT_hours
- Earnings: basic, DA, HRA, allowances, OT, gross
- Deductions: PF, ESI, PT, fines, advances
- Final: net_salary, payment details

## 🛡️ Rules

- ✅ Soft delete employees only
- ✅ 9 hours/day, 48 hours/week limits
- ✅ Cannot edit locked payroll
- ✅ PF on basic, ESI on gross
- ✅ Bonus 8.33% - 20%
- ✅ Tenant isolation on all queries

## 🔧 Service Layer

```python
from workforce.services import PayrollService

# Process payroll
PayrollService.process_payroll_cycle(cycle, tenant_id)

# Get attendance summary
PayrollService.get_attendance_summary(employee, from, to)

# Calculate earnings
PayrollService.calculate_earnings(employee, summary, settings)

# Calculate deductions
PayrollService.calculate_deductions(employee, earnings, from, to, settings)
```

## 📁 Files

```
backend/workforce/
├── models.py          ← 3 modules + legacy
├── serializers.py     ← All serializers
├── views.py           ← ViewSets
├── services.py        ← Payroll logic ⭐
├── urls.py            ← API routes
└── migrations/
    └── 0002_*.py      ← New tables
```

## 🎯 Design Principles

1. **Separation**: Each module is independent
2. **Read-Only**: Payroll reads, never writes to Employee/Attendance
3. **Standalone**: Payroll can be extracted as microservice
4. **No Reverse Dependency**: Clean one-way data flow

---

**Quick Start:** See `WORKFORCE_MODULE_COMPLETE.md` for full documentation
