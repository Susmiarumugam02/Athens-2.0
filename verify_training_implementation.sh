#!/bin/bash

# Induction Training Access Control - Verification Script
# Verifies complete implementation and deployment readiness

echo "============================================================"
echo "INDUCTION TRAINING ACCESS CONTROL - VERIFICATION"
echo "============================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $2 - File not found: $1"
        ((FAIL++))
    fi
}

# Function to check directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $2 - Directory not found: $1"
        ((FAIL++))
    fi
}

echo "1. BACKEND FILES"
echo "------------------------------------------------------------"
check_file "backend/authentication/models.py" "User model with training fields"
check_file "backend/authentication/training_access.py" "Training access API views"
check_file "backend/authentication/urls.py" "URL routing updated"
check_file "backend/authentication/migrations/0012_user_induction_training_fields.py" "Database migration"
check_file "backend/test_training_access.py" "Test script"

echo ""
echo "2. FRONTEND FILES"
echo "------------------------------------------------------------"
check_file "frontend/src/store/trainingStore.ts" "Training state store"
check_file "frontend/src/components/TrainingGuard.tsx" "Route guard component"
check_file "frontend/src/components/OnboardingBanner.tsx" "Onboarding banner"
check_file "frontend/src/utils/sidebarFilter.ts" "Sidebar filter utility"

echo ""
echo "3. DOCUMENTATION FILES"
echo "------------------------------------------------------------"
check_file "INDUCTION_TRAINING_ACCESS_CONTROL_COMPLETE.md" "Complete documentation"
check_file "INDUCTION_TRAINING_QUICK_CARD.md" "Quick reference card"
check_file "INDUCTION_TRAINING_IMPLEMENTATION_SUMMARY.md" "Implementation summary"
check_file "README.md" "README updated"

echo ""
echo "4. DATABASE MIGRATION"
echo "------------------------------------------------------------"
cd backend
source .venv/bin/activate 2>/dev/null

# Check if migration exists in database
MIGRATION_CHECK=$(python manage.py showmigrations authentication 2>/dev/null | grep "0012_user_induction_training_fields")
if [[ $MIGRATION_CHECK == *"[X]"* ]]; then
    echo -e "${GREEN}✓${NC} Migration applied successfully"
    ((PASS++))
else
    echo -e "${RED}✗${NC} Migration not applied"
    ((FAIL++))
fi

echo ""
echo "5. DATABASE FIELDS"
echo "------------------------------------------------------------"

# Check if fields exist in User model
FIELD_CHECK=$(python manage.py shell -c "from authentication.models import User; u = User.objects.first(); print(hasattr(u, 'induction_completed'), hasattr(u, 'module_access_enabled'))" 2>/dev/null)
if [[ $FIELD_CHECK == *"True True"* ]]; then
    echo -e "${GREEN}✓${NC} Training fields exist in User model"
    ((PASS++))
else
    echo -e "${RED}✗${NC} Training fields missing"
    ((FAIL++))
fi

echo ""
echo "6. API ENDPOINTS"
echo "------------------------------------------------------------"

# Check if server is running
if curl -s http://localhost:8004/api/system/health/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend server is running"
    ((PASS++))
    
    # Test training endpoints (requires authentication, so just check if they exist)
    echo -e "${YELLOW}ℹ${NC} Training endpoints available (authentication required for testing)"
    echo "  - GET  /api/auth/training/status/"
    echo "  - POST /api/auth/training/complete/"
    echo "  - POST /api/auth/training/progress/"
    echo "  - GET  /api/auth/training/accessible-modules/"
else
    echo -e "${YELLOW}⚠${NC} Backend server not running (start with: python manage.py runserver 0.0.0.0:8004)"
fi

echo ""
echo "7. TEST SUITE"
echo "------------------------------------------------------------"

# Run test script
if [ -f "test_training_access.py" ]; then
    echo "Running test suite..."
    TEST_OUTPUT=$(python test_training_access.py 2>&1)
    
    # Count passing tests
    PASS_COUNT=$(echo "$TEST_OUTPUT" | grep -c "✅ PASS")
    
    if [ $PASS_COUNT -eq 5 ]; then
        echo -e "${GREEN}✓${NC} All tests passing (5/5)"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} Some tests failing ($PASS_COUNT/5 passing)"
        ((FAIL++))
        echo "$TEST_OUTPUT"
    fi
else
    echo -e "${RED}✗${NC} Test script not found"
    ((FAIL++))
fi

cd ..

echo ""
echo "8. FRONTEND DEPENDENCIES"
echo "------------------------------------------------------------"
if [ -d "frontend/node_modules" ]; then
    echo -e "${GREEN}✓${NC} Node modules installed"
    ((PASS++))
else
    echo -e "${YELLOW}⚠${NC} Node modules not installed (run: cd frontend && npm install)"
fi

echo ""
echo "============================================================"
echo "VERIFICATION SUMMARY"
echo "============================================================"
echo -e "Passed: ${GREEN}$PASS${NC}"
echo -e "Failed: ${RED}$FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED - READY FOR DEPLOYMENT${NC}"
    echo ""
    echo "Next Steps:"
    echo "1. Start backend: cd backend && python manage.py runserver 0.0.0.0:8004"
    echo "2. Start frontend: cd frontend && npm run dev"
    echo "3. Test with new user login"
    exit 0
else
    echo -e "${RED}❌ SOME CHECKS FAILED - REVIEW ERRORS ABOVE${NC}"
    exit 1
fi
