#!/bin/bash

# White Screen Fix Verification Script
# Verifies the user dashboard routing fix

echo "════════════════════════════════════════════════════════════"
echo "White Screen Fix - Verification"
echo "════════════════════════════════════════════════════════════"
echo ""

FRONTEND_DIR="/home/athenas/Downloads/Athens-2.0-main/frontend/src/lib"
ROUTER_FILE="$FRONTEND_DIR/router.tsx"

# Check 1: Verify parent /user route has no requireInduction prop
echo "✓ Check 1: Parent /user route guard props"
if grep -A 3 'path="/user" element={' "$ROUTER_FILE" | grep -q 'requireInduction'; then
    echo "  ❌ FAIL: Parent /user route still has requireInduction prop"
    exit 1
else
    echo "  ✅ PASS: Parent /user route has no requireInduction prop"
fi

# Check 2: Verify parent /user route has no requireApproved prop
echo "✓ Check 2: Parent /user route requireApproved removed"
if grep -A 3 'path="/user" element={' "$ROUTER_FILE" | grep -q 'requireApproved'; then
    echo "  ❌ FAIL: Parent /user route still has requireApproved prop"
    exit 1
else
    echo "  ✅ PASS: Parent /user route has no requireApproved prop"
fi

# Check 3: Verify dashboard route has no nested UserGuard
echo "✓ Check 3: Dashboard route has no double guard"
if grep -A 2 'path="dashboard"' "$ROUTER_FILE" | grep -q '<UserGuard'; then
    echo "  ❌ FAIL: Dashboard route has nested UserGuard"
    exit 1
else
    echo "  ✅ PASS: Dashboard route has no nested guard"
fi

# Check 4: Verify UserGuard automatic state machine exists
echo "✓ Check 4: UserGuard automatic state machine present"
if grep -q "if (approvalStatus === 'approved' && !inductionCompleted && path !== '/user/induction-pending')" "$ROUTER_FILE"; then
    echo "  ✅ PASS: Automatic induction redirect logic present"
else
    echo "  ❌ FAIL: Automatic induction redirect logic missing"
    exit 1
fi

# Check 5: Verify induction-pending route exists
echo "✓ Check 5: Induction pending route registered"
if grep -q 'path="/user/induction-pending"' "$ROUTER_FILE"; then
    echo "  ✅ PASS: Induction pending route exists"
else
    echo "  ❌ FAIL: Induction pending route missing"
    exit 1
fi

# Check 6: Verify UserLayout is used
echo "✓ Check 6: UserLayout component used"
if grep -q '<UserLayout />' "$ROUTER_FILE"; then
    echo "  ✅ PASS: UserLayout component present"
else
    echo "  ❌ FAIL: UserLayout component missing"
    exit 1
fi

# Check 7: Verify InductionTrainingPage component exists
echo "✓ Check 7: InductionTrainingPage component exists"
INDUCTION_FILE="/home/athenas/Downloads/Athens-2.0-main/frontend/src/pages/training/InductionTrainingPage.tsx"
if [ -f "$INDUCTION_FILE" ]; then
    echo "  ✅ PASS: InductionTrainingPage.tsx exists"
else
    echo "  ❌ FAIL: InductionTrainingPage.tsx missing"
    exit 1
fi

# Check 8: Verify UserDashboard component exists
echo "✓ Check 8: UserDashboard component exists"
DASHBOARD_FILE="/home/athenas/Downloads/Athens-2.0-main/frontend/src/pages/user/Dashboard.tsx"
if [ -f "$DASHBOARD_FILE" ]; then
    echo "  ✅ PASS: Dashboard.tsx exists"
else
    echo "  ❌ FAIL: Dashboard.tsx missing"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ ALL CHECKS PASSED"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "White screen fix verified successfully!"
echo ""
echo "Expected behavior:"
echo "  • User with induction pending → redirects to /user/induction-pending"
echo "  • User with induction complete → renders /user/dashboard"
echo "  • No white screen or render failures"
echo "  • UserLayout renders for all user panel pages"
echo ""
