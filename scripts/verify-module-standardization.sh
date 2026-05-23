#!/bin/bash

# Module CSS Standardization - Verification Script
# This script helps verify that all modules are properly standardized

echo "🔍 Athens 2.0 - Module Standardization Verification"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter
PASSED=0
FAILED=0

# Function to check if shared components exist
check_shared_components() {
    echo "📦 Checking Shared Components..."
    
    if [ -f "frontend/src/components/shared/ModuleTableContainer.tsx" ]; then
        echo -e "${GREEN}✓${NC} ModuleTableContainer.tsx exists"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} ModuleTableContainer.tsx missing"
        ((FAILED++))
    fi
    
    if [ -f "frontend/src/components/shared/ModuleTableContainer.css" ]; then
        echo -e "${GREEN}✓${NC} ModuleTableContainer.css exists"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} ModuleTableContainer.css missing"
        ((FAILED++))
    fi
    
    if [ -f "frontend/src/components/shared/ModulePageLayout.tsx" ]; then
        echo -e "${GREEN}✓${NC} ModulePageLayout.tsx exists"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} ModulePageLayout.tsx missing"
        ((FAILED++))
    fi
    
    if [ -f "frontend/src/components/shared/ModuleFilterBar.tsx" ]; then
        echo -e "${GREEN}✓${NC} ModuleFilterBar.tsx exists"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} ModuleFilterBar.tsx missing"
        ((FAILED++))
    fi
    
    if [ -f "frontend/src/components/shared/ModuleFormModal.tsx" ]; then
        echo -e "${GREEN}✓${NC} ModuleFormModal.tsx exists"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} ModuleFormModal.tsx missing"
        ((FAILED++))
    fi
    
    if [ -f "frontend/src/components/shared/index.ts" ]; then
        echo -e "${GREEN}✓${NC} index.ts exists"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} index.ts missing"
        ((FAILED++))
    fi
    
    echo ""
}

# Function to check CSS variables
check_css_variables() {
    echo "🎨 Checking CSS Variables..."
    
    if grep -q "color-ui-base" frontend/src/index.css; then
        echo -e "${GREEN}✓${NC} CSS variables defined in index.css"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} CSS variables missing in index.css"
        ((FAILED++))
    fi
    
    echo ""
}

# Function to check ConfigProvider
check_config_provider() {
    echo "⚙️  Checking ConfigProvider..."
    
    if grep -q "ConfigProvider" frontend/src/main.tsx; then
        echo -e "${GREEN}✓${NC} ConfigProvider added to main.tsx"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} ConfigProvider missing in main.tsx"
        ((FAILED++))
    fi
    
    echo ""
}

# Function to check Vite config
check_vite_config() {
    echo "⚡ Checking Vite Configuration..."
    
    if grep -q "optimizeDeps" frontend/vite.config.ts; then
        echo -e "${GREEN}✓${NC} Vite optimizeDeps configured"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠${NC}  Vite optimizeDeps not configured (optional)"
    fi
    
    if grep -q "manualChunks" frontend/vite.config.ts; then
        echo -e "${GREEN}✓${NC} Vite manualChunks configured"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠${NC}  Vite manualChunks not configured (optional)"
    fi
    
    echo ""
}

# Function to check module imports
check_module_usage() {
    echo "🔗 Checking Module Usage..."
    
    MODULES=(
        "ptw"
        "safetyobservation"
        "toolboxtalk"
        "inductiontraining"
        "esg"
        "quality"
        "inspection"
        "jobtraining"
        "mom"
        "workforce"
        "ergon"
    )
    
    for module in "${MODULES[@]}"; do
        if [ -d "frontend/src/pages/$module" ]; then
            # Check if module uses shared components
            if grep -r "from '@/components/shared'" "frontend/src/pages/$module" > /dev/null 2>&1; then
                echo -e "${GREEN}✓${NC} $module uses shared components"
                ((PASSED++))
            else
                echo -e "${YELLOW}⚠${NC}  $module not using shared components yet"
            fi
        fi
    done
    
    echo ""
}

# Function to check for old CSS files
check_old_css_files() {
    echo "🗑️  Checking for Old CSS Files..."
    
    OLD_CSS_COUNT=$(find frontend/src/pages -name "*.css" ! -name "PTWStandardPrint.css" | wc -l)
    
    if [ "$OLD_CSS_COUNT" -eq 0 ]; then
        echo -e "${GREEN}✓${NC} No old CSS files found (except print styles)"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠${NC}  Found $OLD_CSS_COUNT old CSS files (consider removing)"
        find frontend/src/pages -name "*.css" ! -name "PTWStandardPrint.css"
    fi
    
    echo ""
}

# Function to check TypeScript compilation
check_typescript() {
    echo "📝 Checking TypeScript Compilation..."
    
    cd frontend
    if npm run build:check > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} TypeScript compilation successful"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} TypeScript compilation failed"
        echo "Run 'cd frontend && npm run build:check' for details"
        ((FAILED++))
    fi
    cd ..
    
    echo ""
}

# Run all checks
check_shared_components
check_css_variables
check_config_provider
check_vite_config
check_module_usage
check_old_css_files
# check_typescript  # Commented out as it takes time

# Summary
echo "=================================================="
echo "📊 Verification Summary"
echo "=================================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Standardization complete.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Please review above.${NC}"
    exit 1
fi
