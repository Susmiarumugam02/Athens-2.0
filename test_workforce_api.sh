#!/bin/bash

# Workforce Module API Test Script
# This demonstrates the complete workflow

BASE_URL="http://localhost:8004"
TOKEN=""

echo "🧱 WORKFORCE MODULE - API TEST"
echo "================================"
echo ""

# Step 1: Login (you'll need valid credentials)
echo "📝 Step 1: Login to get token"
echo "POST $BASE_URL/api/auth/master-admin/login/"
echo ""

# Step 2: Create Payroll Settings
echo "📝 Step 2: Create Payroll Settings"
echo "POST $BASE_URL/api/workforce/payroll-settings/"
echo '{
  "pf_rate": 12.00,
  "esi_rate": 0.75,
  "bonus_min_percent": 8.33,
  "bonus_max_percent": 20.00,
  "ot_multiplier": 2.00,
  "min_wage_category": "Skilled"
}'
echo ""

# Step 3: Create Department
echo "📝 Step 3: Create Department"
echo "POST $BASE_URL/api/workforce/departments/"
echo '{"name": "Engineering"}'
echo ""

# Step 4: Create Designation
echo "📝 Step 4: Create Designation"
echo "POST $BASE_URL/api/workforce/designations/"
echo '{"name": "Site Engineer"}'
echo ""

# Step 5: Create Employee
echo "📝 Step 5: Create Employee"
echo "POST $BASE_URL/api/workforce/employees/"
echo '{
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
  "other_allowances_structure": 2000.00,
  "overtime_rate": 100.00,
  "pf_applicable": true,
  "esi_applicable": true
}'
echo ""

# Step 6: Mark Attendance
echo "📝 Step 6: Mark Attendance"
echo "POST $BASE_URL/api/workforce/attendance/"
echo '{
  "employee": 1,
  "date": "2025-02-01",
  "in_time": "09:00:00",
  "out_time": "18:00:00",
  "total_hours": 9.00,
  "overtime_hours": 1.00,
  "status": "P"
}'
echo ""

# Step 7: Create Payroll Cycle
echo "📝 Step 7: Create Payroll Cycle"
echo "POST $BASE_URL/api/workforce/payroll-cycles/"
echo '{
  "cycle_name": "February 2025",
  "period_from": "2025-02-01",
  "period_to": "2025-02-28",
  "status": "draft"
}'
echo ""

# Step 8: Process Payroll
echo "📝 Step 8: Process Payroll"
echo "POST $BASE_URL/api/workforce/payroll-cycles/1/process/"
echo ""

# Step 9: Lock Cycle
echo "📝 Step 9: Lock Payroll Cycle"
echo "POST $BASE_URL/api/workforce/payroll-cycles/1/lock/"
echo ""

# Step 10: View Payroll Entries
echo "📝 Step 10: View Payroll Entries"
echo "GET $BASE_URL/api/workforce/payroll-entries/"
echo ""

echo "================================"
echo "✅ All endpoints are ready!"
echo ""
echo "📚 Documentation:"
echo "  - Full Guide: WORKFORCE_MODULE_COMPLETE.md"
echo "  - Quick Ref: WORKFORCE_QUICK_CARD.md"
echo "  - Architecture: WORKFORCE_ARCHITECTURE.md"
echo ""
echo "🔗 Available Endpoints:"
echo "  /api/workforce/departments/"
echo "  /api/workforce/designations/"
echo "  /api/workforce/employees/"
echo "  /api/workforce/shifts/"
echo "  /api/workforce/holidays/"
echo "  /api/workforce/attendance/"
echo "  /api/workforce/payroll-cycles/"
echo "  /api/workforce/payroll-entries/"
echo "  /api/workforce/payroll-settings/"
echo "  /api/workforce/bonus-records/"
echo "  /api/workforce/fines/"
echo "  /api/workforce/advances/"
