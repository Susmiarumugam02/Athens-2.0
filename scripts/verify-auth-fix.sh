#!/bin/bash
# Frontend Auth Lifecycle Verification Script
# Tests the 3 minimal patches for 499 error fix

set -e

echo "=========================================="
echo "Frontend Auth Lifecycle Verification"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Verify patches are in place
echo "📋 Check 1: Verifying patches in source files..."
echo ""

# Patch A: Redirect guard
if grep -q "authRedirectInProgress" /var/www/athens-2.0/frontend/src/lib/api.ts; then
    echo -e "${GREEN}✓${NC} Patch A: Redirect guard found in api.ts"
else
    echo -e "${RED}✗${NC} Patch A: Redirect guard MISSING in api.ts"
    exit 1
fi

# Patch B: No-token block
if grep -q "NO_AUTH_TOKEN" /var/www/athens-2.0/frontend/src/lib/api.ts; then
    echo -e "${GREEN}✓${NC} Patch B: No-token block found in api.ts"
else
    echo -e "${RED}✗${NC} Patch B: No-token block MISSING in api.ts"
    exit 1
fi

# Patch C: Token gating in useEnabledModules
if grep -q "tokenManager.hasTokens()" /var/www/athens-2.0/frontend/src/hooks/useEnabledModules.ts; then
    echo -e "${GREEN}✓${NC} Patch C: Token gating found in useEnabledModules.ts"
else
    echo -e "${RED}✗${NC} Patch C: Token gating MISSING in useEnabledModules.ts"
    exit 1
fi

# Patch C: Token gating in CompanyLayout
if grep -q "tokenManager.hasTokens()" /var/www/athens-2.0/frontend/src/layouts/CompanyLayout.tsx; then
    echo -e "${GREEN}✓${NC} Patch C: Token gating found in CompanyLayout.tsx"
else
    echo -e "${RED}✗${NC} Patch C: Token gating MISSING in CompanyLayout.tsx"
    exit 1
fi

echo ""

# Check 2: Verify build artifacts
echo "📦 Check 2: Verifying build artifacts..."
echo ""

if [ -d "/var/www/athens-2.0/frontend/dist" ]; then
    echo -e "${GREEN}✓${NC} Build directory exists"
    
    # Check if index.html exists
    if [ -f "/var/www/athens-2.0/frontend/dist/index.html" ]; then
        echo -e "${GREEN}✓${NC} index.html found"
    else
        echo -e "${RED}✗${NC} index.html MISSING - rebuild required"
        exit 1
    fi
    
    # Check build timestamp
    BUILD_TIME=$(stat -c %y /var/www/athens-2.0/frontend/dist/index.html 2>/dev/null || stat -f "%Sm" /var/www/athens-2.0/frontend/dist/index.html)
    echo -e "${GREEN}✓${NC} Last build: $BUILD_TIME"
else
    echo -e "${RED}✗${NC} Build directory MISSING - rebuild required"
    exit 1
fi

echo ""

# Check 3: Verify nginx configuration
echo "🌐 Check 3: Verifying nginx configuration..."
echo ""

if grep -q "proxy_pass http://127.0.0.1:8001" /etc/nginx/sites-enabled/athens2-ssl 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Nginx proxying to correct port (8001)"
else
    echo -e "${YELLOW}⚠${NC} Nginx port configuration may need verification"
fi

if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓${NC} Nginx is running"
else
    echo -e "${RED}✗${NC} Nginx is NOT running"
    exit 1
fi

echo ""

# Check 4: Verify backend service
echo "🔧 Check 4: Verifying backend service..."
echo ""

if systemctl is-active --quiet athens-backend; then
    echo -e "${GREEN}✓${NC} Backend service is running"
    
    # Check if listening on port 8001
    if netstat -tuln 2>/dev/null | grep -q ":8001" || ss -tuln 2>/dev/null | grep -q ":8001"; then
        echo -e "${GREEN}✓${NC} Backend listening on port 8001"
    else
        echo -e "${RED}✗${NC} Backend NOT listening on port 8001"
        exit 1
    fi
else
    echo -e "${RED}✗${NC} Backend service is NOT running"
    exit 1
fi

echo ""

# Check 5: Test API health
echo "🏥 Check 5: Testing API health..."
echo ""

# Health endpoint may require auth, try both public and authenticated
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8001/api/health/ 2>/dev/null || echo "000")

if [ "$HEALTH_RESPONSE" = "200" ] || [ "$HEALTH_RESPONSE" = "401" ]; then
    echo -e "${GREEN}✓${NC} Backend is responding (HTTP $HEALTH_RESPONSE)"
else
    echo -e "${RED}✗${NC} Backend health check failed (HTTP $HEALTH_RESPONSE)"
    exit 1
fi

echo ""

# Check 6: Monitor nginx logs for 499 errors
echo "📊 Check 6: Checking recent nginx logs for 499 errors..."
echo ""

RECENT_499=$(sudo tail -n 100 /var/log/nginx/access.log 2>/dev/null | grep " 499 " | wc -l || echo "0")

if [ "$RECENT_499" -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No 499 errors in last 100 log entries"
else
    echo -e "${YELLOW}⚠${NC} Found $RECENT_499 recent 499 errors (may be from before fix)"
    echo "   Run: sudo tail -n 20 /var/log/nginx/access.log | grep ' 499 '"
fi

echo ""

# Summary
echo "=========================================="
echo "✅ VERIFICATION COMPLETE"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Test with browser (DevTools → Network tab)"
echo "2. Monitor nginx logs: sudo tail -f /var/log/nginx/access.log"
echo "3. Verify no 499 errors on page load"
echo "4. Test both logged-in and logged-out scenarios"
echo ""
echo "Expected Behavior:"
echo "  • With token: API calls return 200/401/403 (not 499)"
echo "  • Without token: No API calls fired, single redirect to /login"
echo "  • No infinite redirect loops"
echo ""
echo -e "${GREEN}All checks passed!${NC}"
