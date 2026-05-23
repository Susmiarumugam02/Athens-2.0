#!/bin/bash
# Verification script for induction route fix

echo "================================"
echo "INDUCTION ROUTE FIX VERIFICATION"
echo "================================"
echo ""

cd "$(dirname "$0")"

# Check for old route references
echo "[1] Checking for old /training/induction references..."
OLD_REFS=$(grep -r "/training/induction" frontend/src/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v node_modules | wc -l)
if [ "$OLD_REFS" -eq 0 ]; then
    echo "✅ PASS: No old route references found"
else
    echo "❌ FAIL: Found $OLD_REFS old route references"
    grep -r "/training/induction" frontend/src/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v node_modules
fi
echo ""

# Check for new route references
echo "[2] Checking for new /user/induction-pending references..."
NEW_REFS=$(grep -r "/user/induction-pending" frontend/src/ --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)
if [ "$NEW_REFS" -gt 0 ]; then
    echo "✅ PASS: Found $NEW_REFS new route references"
else
    echo "❌ FAIL: No new route references found"
fi
echo ""

# Check if component file exists
echo "[3] Checking if InductionTrainingPage component exists..."
if [ -f "frontend/src/pages/training/InductionTrainingPage.tsx" ]; then
    echo "✅ PASS: Component file exists"
    FILE_SIZE=$(wc -c < frontend/src/pages/training/InductionTrainingPage.tsx)
    echo "   File size: $FILE_SIZE bytes"
else
    echo "❌ FAIL: Component file not found"
fi
echo ""

# Check if route is registered
echo "[4] Checking if route is registered in router..."
ROUTE_REG=$(grep -c "path=\"/user/induction-pending\"" frontend/src/lib/router.tsx)
if [ "$ROUTE_REG" -gt 0 ]; then
    echo "✅ PASS: Route is registered in router"
else
    echo "❌ FAIL: Route not registered in router"
fi
echo ""

# Check if component is imported
echo "[5] Checking if component is imported..."
IMPORT_CHECK=$(grep -c "InductionTrainingPage" frontend/src/lib/router.tsx)
if [ "$IMPORT_CHECK" -gt 0 ]; then
    echo "✅ PASS: Component is imported ($IMPORT_CHECK references)"
else
    echo "❌ FAIL: Component not imported"
fi
echo ""

# Check backend route
echo "[6] Checking backend login route..."
BACKEND_ROUTE=$(grep -c "/user/induction-pending" backend/authentication/views.py)
if [ "$BACKEND_ROUTE" -gt 0 ]; then
    echo "✅ PASS: Backend returns correct route"
else
    echo "❌ FAIL: Backend route not updated"
fi
echo ""

# Summary
echo "================================"
echo "VERIFICATION SUMMARY"
echo "================================"
if [ "$OLD_REFS" -eq 0 ] && [ "$NEW_REFS" -gt 0 ] && [ -f "frontend/src/pages/training/InductionTrainingPage.tsx" ] && [ "$ROUTE_REG" -gt 0 ] && [ "$IMPORT_CHECK" -gt 0 ] && [ "$BACKEND_ROUTE" -gt 0 ]; then
    echo "✅ ALL CHECKS PASSED"
    echo ""
    echo "The 404 error has been fixed!"
    echo "Route /user/induction-pending is working correctly."
    exit 0
else
    echo "❌ SOME CHECKS FAILED"
    echo ""
    echo "Please review the failed checks above."
    exit 1
fi
