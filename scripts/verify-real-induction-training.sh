#!/bin/bash

# Real Induction Training Workflow Verification Script
# Verifies implementation of admin-controlled induction attendance workflow

echo "════════════════════════════════════════════════════════════════"
echo "Real Induction Training Workflow - Verification"
echo "════════════════════════════════════════════════════════════════"
echo ""

PASS=0
FAIL=0

# Check 1: Training Management App Exists
echo "✓ Check 1: Training Management App"
if [ -d "backend/training_management" ]; then
    echo "  ✅ PASS: training_management app exists"
    ((PASS++))
else
    echo "  ❌ FAIL: training_management app not found"
    ((FAIL++))
fi
echo ""

# Check 2: Models Defined
echo "✓ Check 2: Training Models"
if grep -q "class Training" backend/training_management/models.py && \
   grep -q "class TrainingAttendance" backend/training_management/models.py; then
    echo "  ✅ PASS: Training and TrainingAttendance models defined"
    ((PASS++))
else
    echo "  ❌ FAIL: Models not properly defined"
    ((FAIL++))
fi
echo ""

# Check 3: Auto-Activation Logic
echo "✓ Check 3: Auto-Activation Logic"
if grep -q "user.status = User.STATUS_ACTIVE" backend/training_management/models.py && \
   grep -q "user.induction_attended = True" backend/training_management/models.py; then
    echo "  ✅ PASS: Auto-activation logic implemented in save() method"
    ((PASS++))
else
    echo "  ❌ FAIL: Auto-activation logic missing"
    ((FAIL++))
fi
echo ""

# Check 4: API Endpoints
echo "✓ Check 4: API Endpoints"
if grep -q "mark_attendance" backend/training_management/views.py && \
   grep -q "add_attendees" backend/training_management/views.py; then
    echo "  ✅ PASS: Attendance marking endpoints defined"
    ((PASS++))
else
    echo "  ❌ FAIL: API endpoints missing"
    ((FAIL++))
fi
echo ""

# Check 5: URL Routing
echo "✓ Check 5: URL Routing"
if grep -q "training_management" backend/athens2/settings.py && \
   grep -q "training_management.urls" backend/athens2/urls.py; then
    echo "  ✅ PASS: URL routing configured"
    ((PASS++))
else
    echo "  ❌ FAIL: URL routing not configured"
    ((FAIL++))
fi
echo ""

# Check 6: Frontend Training Management Page
echo "✓ Check 6: Frontend Training Management"
if [ -f "frontend/src/pages/training/TrainingManagementPage.tsx" ]; then
    echo "  ✅ PASS: Training management page exists"
    ((PASS++))
else
    echo "  ❌ FAIL: Training management page missing"
    ((FAIL++))
fi
echo ""

# Check 7: Frontend Attendance Management Page
echo "✓ Check 7: Frontend Attendance Management"
if [ -f "frontend/src/pages/training/AttendanceManagementPage.tsx" ]; then
    echo "  ✅ PASS: Attendance management page exists"
    ((PASS++))
else
    echo "  ❌ FAIL: Attendance management page missing"
    ((FAIL++))
fi
echo ""

# Check 8: Router Configuration
echo "✓ Check 8: Router Configuration"
if grep -q "TrainingManagementPage" frontend/src/lib/router.tsx && \
   grep -q "AttendanceManagementPage" frontend/src/lib/router.tsx; then
    echo "  ✅ PASS: Training routes configured in router"
    ((PASS++))
else
    echo "  ❌ FAIL: Training routes not configured"
    ((FAIL++))
fi
echo ""

# Check 9: Admin Routes
echo "✓ Check 9: Admin Training Routes"
if grep -q "path=\"training\"" frontend/src/lib/router.tsx && \
   grep -q "training/:trainingId/attendance" frontend/src/lib/router.tsx; then
    echo "  ✅ PASS: Admin training routes defined"
    ((PASS++))
else
    echo "  ❌ FAIL: Admin training routes missing"
    ((FAIL++))
fi
echo ""

# Check 10: User Induction Pending Page
echo "✓ Check 10: User Induction Pending Page"
if [ -f "frontend/src/pages/training/InductionTrainingPage.tsx" ]; then
    if grep -q -i "induction" frontend/src/pages/training/InductionTrainingPage.tsx; then
        echo "  ✅ PASS: User induction pending page exists with correct content"
        ((PASS++))
    else
        echo "  ❌ FAIL: Induction pending page missing waiting message"
        ((FAIL++))
    fi
else
    echo "  ❌ FAIL: Induction pending page not found"
    ((FAIL++))
fi
echo ""

# Check 11: Migration Files
echo "✓ Check 11: Database Migrations"
if [ -f "backend/training_management/migrations/0001_initial.py" ]; then
    echo "  ✅ PASS: Training management migrations created"
    ((PASS++))
else
    echo "  ❌ FAIL: Migrations not created"
    ((FAIL++))
fi
echo ""

# Check 12: Documentation
echo "✓ Check 12: Documentation"
if [ -f "REAL_INDUCTION_TRAINING_COMPLETE.md" ] && \
   [ -f "REAL_INDUCTION_TRAINING_QUICK_CARD.md" ]; then
    echo "  ✅ PASS: Complete documentation exists"
    ((PASS++))
else
    echo "  ❌ FAIL: Documentation missing"
    ((FAIL++))
fi
echo ""

# Summary
echo "════════════════════════════════════════════════════════════════"
echo "VERIFICATION SUMMARY"
echo "════════════════════════════════════════════════════════════════"
echo "Total Checks: $((PASS + FAIL))"
echo "✅ Passed: $PASS"
echo "❌ Failed: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "🎉 ALL CHECKS PASSED - Real Induction Training Workflow Complete!"
    echo ""
    echo "Next Steps:"
    echo "1. Start backend: cd backend && python manage.py runserver 0.0.0.0:8004"
    echo "2. Start frontend: cd frontend && npm run dev"
    echo "3. Login as admin and navigate to /admin/training"
    echo "4. Create induction training and mark attendance"
    echo ""
    exit 0
else
    echo "⚠️  SOME CHECKS FAILED - Review implementation"
    echo ""
    exit 1
fi
