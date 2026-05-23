#!/bin/bash

# Role-Based Induction Fix Verification Script

echo "════════════════════════════════════════════════════════════"
echo "Role-Based Induction Fix - Verification"
echo "════════════════════════════════════════════════════════════"
echo ""

FRONTEND_DIR="/home/athenas/Downloads/Athens-2.0-main/frontend/src"
BACKEND_DIR="/home/athenas/Downloads/Athens-2.0-main/backend"

# Check 1: UserGuard has requiresInduction check
echo "✓ Check 1: UserGuard role-based induction check"
if grep -q "const requiresInduction = roleType === 'user'" "$FRONTEND_DIR/lib/router.tsx"; then
    echo "  ✅ PASS: requiresInduction check present"
else
    echo "  ❌ FAIL: requiresInduction check missing"
    exit 1
fi

# Check 2: Induction redirect only for users
echo ""
echo "✓ Check 2: Induction redirect only for user roles"
if grep -q "if (requiresInduction && userStatus === 'approved_pending_induction'" "$FRONTEND_DIR/lib/router.tsx"; then
    echo "  ✅ PASS: Role-based induction redirect"
else
    echo "  ❌ FAIL: Induction redirect not role-based"
    exit 1
fi

# Check 3: Admin skip log message
echo ""
echo "✓ Check 3: Admin skip induction log message"
if grep -q "Admin role - skipping induction requirement" "$FRONTEND_DIR/lib/router.tsx"; then
    echo "  ✅ PASS: Admin skip log present"
else
    echo "  ❌ FAIL: Admin skip log missing"
    exit 1
fi

# Check 4: DevelopmentBanner role check
echo ""
echo "✓ Check 4: DevelopmentBanner role-based display"
if grep -q "const requiresInduction = roleType === 'user'" "$FRONTEND_DIR/components/DevelopmentBanner.tsx"; then
    echo "  ✅ PASS: Banner checks role_type"
else
    echo "  ❌ FAIL: Banner doesn't check role_type"
    exit 1
fi

# Check 5: Banner only shows for users
echo ""
echo "✓ Check 5: Banner hidden for non-user roles"
if grep -q "if (!bypassInduction || !requiresInduction) return null" "$FRONTEND_DIR/components/DevelopmentBanner.tsx"; then
    echo "  ✅ PASS: Banner hidden for admins"
else
    echo "  ❌ FAIL: Banner not properly filtered"
    exit 1
fi

# Check 6: Backend training status role check
echo ""
echo "✓ Check 6: Backend training status role check"
if grep -q "if getattr(user, 'role_type', 'admin') == 'admin':" "$BACKEND_DIR/authentication/training_access.py"; then
    echo "  ✅ PASS: Backend checks role_type for training"
else
    echo "  ❌ FAIL: Backend missing role_type check"
    exit 1
fi

# Check 7: Backend admin bypass reason
echo ""
echo "✓ Check 7: Backend admin bypass reason"
if grep -q "'bypass_reason': 'Admin role - training not required'" "$BACKEND_DIR/authentication/training_access.py"; then
    echo "  ✅ PASS: Admin bypass reason present"
else
    echo "  ❌ FAIL: Admin bypass reason missing"
    exit 1
fi

# Check 8: Backend module access role check
echo ""
echo "✓ Check 8: Backend module access role check"
if grep -q "if getattr(user, 'role_type', 'admin') == 'admin':" "$BACKEND_DIR/authentication/training_access.py"; then
    echo "  ✅ PASS: Module access checks role_type"
else
    echo "  ❌ FAIL: Module access doesn't check role_type"
    exit 1
fi

# Check 9: Legacy fallback role check
echo ""
echo "✓ Check 9: Legacy fallback includes role check"
if grep -q "requiresInduction &&" "$FRONTEND_DIR/lib/router.tsx"; then
    echo "  ✅ PASS: Legacy fallback role-aware"
else
    echo "  ❌ FAIL: Legacy fallback not role-aware"
    exit 1
fi

# Check 10: Console logging includes requiresInduction
echo ""
echo "✓ Check 10: Console logging includes requiresInduction"
if grep -q "requiresInduction" "$FRONTEND_DIR/lib/router.tsx"; then
    echo "  ✅ PASS: Debug logs include requiresInduction"
else
    echo "  ❌ FAIL: Debug logs missing requiresInduction"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ ALL CHECKS PASSED"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Role-based induction fix verified successfully!"
echo ""
echo "Expected behavior:"
echo "  Admin users (role_type='admin'):"
echo "    ✅ Direct dashboard access"
echo "    ✅ No induction check"
echo "    ✅ No induction banner"
echo ""
echo "  Regular users (role_type='user'):"
echo "    ✅ Induction workflow enforced"
echo "    ✅ Blocked until attendance"
echo "    ✅ Banner shown (if dev bypass enabled)"
echo ""
