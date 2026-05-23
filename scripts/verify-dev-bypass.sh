#!/bin/bash

# Development Bypass Verification Script

echo "════════════════════════════════════════════════════════════"
echo "Development Bypass - Verification"
echo "════════════════════════════════════════════════════════════"
echo ""

FRONTEND_DIR="/home/athenas/Downloads/Athens-2.0-main/frontend"

# Check 1: .env.local exists
echo "✓ Check 1: .env.local file"
if [ -f "$FRONTEND_DIR/.env.local" ]; then
    echo "  ✅ PASS: .env.local exists"
    echo "  Content:"
    cat "$FRONTEND_DIR/.env.local" | grep VITE_BYPASS_INDUCTION || echo "    (bypass flag not set)"
else
    echo "  ⚠️  WARNING: .env.local not found"
    echo "  Create it with: echo 'VITE_BYPASS_INDUCTION=true' > frontend/.env.local"
fi

# Check 2: .env.example exists with safe default
echo ""
echo "✓ Check 2: .env.example has safe default"
if [ -f "$FRONTEND_DIR/.env.example" ]; then
    if grep -q "VITE_BYPASS_INDUCTION=false" "$FRONTEND_DIR/.env.example"; then
        echo "  ✅ PASS: .env.example has bypass=false"
    else
        echo "  ❌ FAIL: .env.example should have VITE_BYPASS_INDUCTION=false"
        exit 1
    fi
else
    echo "  ❌ FAIL: .env.example not found"
    exit 1
fi

# Check 3: .gitignore includes .env.local
echo ""
echo "✓ Check 3: .gitignore includes .env.local"
if grep -q "\.env\.local" "$FRONTEND_DIR/.gitignore"; then
    echo "  ✅ PASS: .env.local in .gitignore"
else
    echo "  ❌ FAIL: .env.local not in .gitignore"
    exit 1
fi

# Check 4: DevelopmentBanner component exists
echo ""
echo "✓ Check 4: DevelopmentBanner component"
if [ -f "$FRONTEND_DIR/src/components/DevelopmentBanner.tsx" ]; then
    echo "  ✅ PASS: DevelopmentBanner.tsx exists"
else
    echo "  ❌ FAIL: DevelopmentBanner.tsx not found"
    exit 1
fi

# Check 5: UserGuard has bypass logic
echo ""
echo "✓ Check 5: UserGuard bypass logic"
if grep -q "bypassInduction" "$FRONTEND_DIR/src/lib/router.tsx"; then
    echo "  ✅ PASS: UserGuard has bypass logic"
else
    echo "  ❌ FAIL: UserGuard missing bypass logic"
    exit 1
fi

# Check 6: main.tsx imports DevelopmentBanner
echo ""
echo "✓ Check 6: main.tsx imports DevelopmentBanner"
if grep -q "DevelopmentBanner" "$FRONTEND_DIR/src/main.tsx"; then
    echo "  ✅ PASS: DevelopmentBanner imported in main.tsx"
else
    echo "  ❌ FAIL: DevelopmentBanner not imported"
    exit 1
fi

# Check 7: Bypass flag check in UserGuard
echo ""
echo "✓ Check 7: Bypass flag check"
if grep -q "import.meta.env.VITE_BYPASS_INDUCTION" "$FRONTEND_DIR/src/lib/router.tsx"; then
    echo "  ✅ PASS: Bypass flag checked in UserGuard"
else
    echo "  ❌ FAIL: Bypass flag check missing"
    exit 1
fi

# Check 8: Warning logs in console
echo ""
echo "✓ Check 8: Warning console logs"
if grep -q "DEVELOPMENT MODE: Bypassing induction" "$FRONTEND_DIR/src/lib/router.tsx"; then
    echo "  ✅ PASS: Warning logs present"
else
    echo "  ❌ FAIL: Warning logs missing"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ ALL CHECKS PASSED"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Development bypass implementation verified!"
echo ""
echo "To enable bypass:"
echo "  1. Ensure .env.local has VITE_BYPASS_INDUCTION=true"
echo "  2. Restart dev server: cd frontend && npm run dev"
echo "  3. Look for yellow warning banner"
echo ""
echo "To disable bypass:"
echo "  1. Set VITE_BYPASS_INDUCTION=false in .env.local"
echo "  2. OR delete .env.local"
echo "  3. Restart dev server"
echo ""
echo "⚠️  NEVER enable bypass in production!"
echo ""
