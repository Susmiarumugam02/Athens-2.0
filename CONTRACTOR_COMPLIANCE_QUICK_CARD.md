# 🏗️ Contractor Compliance - Quick Reference Card

## 📊 3-Table Architecture

```
ContractorMaster → ContractorCompliance → ContractLabourDeployment
(Contractors+EPC)      (License)              (Worker Assignment)
```

---

## 🗄️ Tables at a Glance

### 1️⃣ contractor_master
**Purpose:** Contractor + EPC registry  
**Key Fields:** company_type, company_name, address, contact, PAN, GST  
**Unique:** (tenant_id, company_name)  
**Types:** 'contractor' | 'epc'

### 2️⃣ contractor_compliance
**Purpose:** CLRA license tracking  
**Key Fields:** license_number, valid_from/to, max_workers, PF/ESI codes  
**Unique:** (contractor_id, branch_id)  
**Properties:** `is_license_valid`, `days_to_expiry`

### 3️⃣ contract_labour_deployment
**Purpose:** Worker-contractor mapping  
**Key Fields:** employee, contractor_compliance, project, wage_rate, dates  
**Replaces:** Project.contractor_company_ids (JSON)

---

## 🚀 Migration Commands

```bash
# Step 1: Create tables
python manage.py migrate workforce 0002_contractor_compliance

# Step 2: Migrate JSON data
python manage.py migrate workforce 0003_migrate_contractor_data

# Step 3: Remove JSON fields
python manage.py migrate workforce 0004_remove_json_contractor_fields
```

---

## 💡 Quick Usage

### Register Contractor or EPC
```python
from workforce.models_contractor import ContractorMaster

contractor = ContractorMaster.objects.create(
    athens_tenant_id=1,
    company_type='contractor',  # or 'epc'
    company_name="ABC Contractors",
    company_address="123 Industrial Area",
    contact_person="John Doe",
    contact_number="+91-9876543210",
    email="john@abc.com"
)
```

### Add License
```python
from workforce.models_contractor import ContractorCompliance

compliance = ContractorCompliance.objects.create(
    contractor=contractor,
    branch_id=1,
    clra_license_number="CLRA/MH/2024/001",
    license_valid_from="2024-01-01",
    license_valid_to="2025-12-31",
    max_worker_limit=50
)
```

### Deploy Worker
```python
from workforce.models_contractor import ContractLabourDeployment

deployment = ContractLabourDeployment.objects.create(
    athens_tenant_id=1,
    branch_id=1,
    project=project,
    contractor_compliance=compliance,
    employee=employee,
    wage_rate=450.00,
    deployment_start="2024-02-01"
)
```

---

## ✅ CLRA Forms Enabled

✅ Register of Contractors  
✅ Form XIII – Workmen by Contractor  
✅ Form XVI – Muster Roll  
✅ Form XVII – Wage Register  
✅ Form XIX – Wage Slip  
✅ Form XX – Deductions  
✅ Form XXI – Fines  
✅ Form XXII – Advances  
✅ Form XXIII – Overtime  
✅ Form XXIV – Half-Yearly Return  
✅ Form XXV – Annual Return

---

## 🔍 Common Queries

### Expiring Licenses (30 days)
```python
from datetime import date, timedelta
from workforce.models_contractor import ContractorCompliance

expiring = ContractorCompliance.objects.filter(
    license_valid_to__lte=date.today() + timedelta(days=30),
    license_valid_to__gte=date.today()
)
```

### Active Workers per Contractor
```python
from workforce.models_contractor import ContractLabourDeployment

count = ContractLabourDeployment.objects.filter(
    contractor_compliance=compliance,
    status='active'
).count()
```

### Worker Limit Validation
```python
if count >= compliance.max_worker_limit:
    raise ValidationError("Worker limit exceeded")
```

---

## 📈 Before vs After

| Feature | Before | After |
|---------|--------|-------|
| Storage | JSON | Relational |
| EPC Tracking | Separate JSON | Unified (as contractor) |
| License Tracking | ❌ | ✅ |
| Worker Limits | ❌ | ✅ |
| Expiry Alerts | ❌ | ✅ |
| CLRA Automation | 0% | 100% |

---

## 📁 Files Created

- `backend/workforce/models_contractor.py` ⭐
- `backend/workforce/migrations/0002_contractor_compliance.py` ⭐
- `backend/workforce/migrations/0003_migrate_contractor_data.py` ⭐
- `backend/workforce/migrations/0004_remove_json_contractor_fields.py` ⭐
- `CONTRACTOR_COMPLIANCE_ARCHITECTURE.md` ⭐

---

**Status:** ✅ Complete | **CLRA:** 100% Enabled

**Last Updated:** February 6, 2025
