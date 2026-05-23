#!/bin/bash

# Automated API Tests for Create Admin Parity
# Requires: jq, curl, valid auth tokens

echo "=============================================="
echo "Create Admin Parity - Automated API Tests"
echo "=============================================="
echo ""

# Configuration
API_BASE="http://localhost:8004"
MASTER_TOKEN="${MASTER_ADMIN_TOKEN:-}"
COMPANY_TOKEN="${COMPANY_USER_TOKEN:-}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ -z "$MASTER_TOKEN" ]; then
    echo -e "${YELLOW}Warning: MASTER_ADMIN_TOKEN not set${NC}"
    echo "Set it with: export MASTER_ADMIN_TOKEN='your_token'"
    echo ""
fi

# Test 1: Permission Check - CompanyUser should get 403
echo "Test 1: Permission Enforcement"
echo "------------------------------"
if [ -n "$COMPANY_TOKEN" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST \
        "$API_BASE/api/auth/masteradmin/admin-users/create-project-admin/" \
        -H "Authorization: Bearer $COMPANY_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"project_id":1,"admin_type":"client","username":"test","company_name":"Test","registered_address":"Test"}')
    
    status_code=$(echo "$response" | tail -n1)
    
    if [ "$status_code" == "403" ]; then
        echo -e "${GREEN}✓ PASS${NC} - CompanyUser blocked (403)"
    else
        echo -e "${RED}✗ FAIL${NC} - CompanyUser got status: $status_code (expected 403)"
    fi
else
    echo -e "${YELLOW}⊘ SKIP${NC} - COMPANY_USER_TOKEN not set"
fi
echo ""

# Test 2: Validation - Missing fields
echo "Test 2: Missing Fields Validation"
echo "---------------------------------"
if [ -n "$MASTER_TOKEN" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST \
        "$API_BASE/api/auth/masteradmin/admin-users/create-project-admin/" \
        -H "Authorization: Bearer $MASTER_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"project_id":1}')
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$status_code" == "400" ]; then
        echo -e "${GREEN}✓ PASS${NC} - Missing fields rejected (400)"
    else
        echo -e "${RED}✗ FAIL${NC} - Got status: $status_code (expected 400)"
    fi
else
    echo -e "${YELLOW}⊘ SKIP${NC} - MASTER_ADMIN_TOKEN not set"
fi
echo ""

# Test 3: Validation - Username with space
echo "Test 3: Username with Space"
echo "---------------------------"
if [ -n "$MASTER_TOKEN" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST \
        "$API_BASE/api/auth/masteradmin/admin-users/create-project-admin/" \
        -H "Authorization: Bearer $MASTER_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"project_id":1,"admin_type":"client","username":"john doe","company_name":"Test","registered_address":"Test"}')
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$status_code" == "400" ] && echo "$body" | grep -q "space"; then
        echo -e "${GREEN}✓ PASS${NC} - Username with space rejected"
    else
        echo -e "${RED}✗ FAIL${NC} - Username with space not properly rejected"
    fi
else
    echo -e "${YELLOW}⊘ SKIP${NC} - MASTER_ADMIN_TOKEN not set"
fi
echo ""

# Test 4: Get projects endpoint
echo "Test 4: Get Projects (Tenant Scoped)"
echo "------------------------------------"
if [ -n "$MASTER_TOKEN" ]; then
    response=$(curl -s -w "\n%{http_code}" -X GET \
        "$API_BASE/api/auth/masteradmin/projects/" \
        -H "Authorization: Bearer $MASTER_TOKEN")
    
    status_code=$(echo "$response" | tail -n1)
    
    if [ "$status_code" == "200" ]; then
        echo -e "${GREEN}✓ PASS${NC} - Projects endpoint accessible"
    else
        echo -e "${RED}✗ FAIL${NC} - Got status: $status_code (expected 200)"
    fi
else
    echo -e "${YELLOW}⊘ SKIP${NC} - MASTER_ADMIN_TOKEN not set"
fi
echo ""

echo "=============================================="
echo "Test Summary"
echo "=============================================="
echo ""
echo "To run full tests, set environment variables:"
echo "  export MASTER_ADMIN_TOKEN='your_master_token'"
echo "  export COMPANY_USER_TOKEN='your_company_token'"
echo ""
echo "Then run: ./automated_api_tests.sh"
echo ""
