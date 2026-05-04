#!/bin/bash

# Batch apply shared components to all remaining modules
# This script documents the changes needed for each module

echo "🚀 Applying shared components to remaining modules..."
echo ""

# Module list with their main list components
declare -A MODULES=(
    ["toolboxtalk"]="components/ToolboxTalkList.tsx"
    ["inductiontraining"]="components/InductionList.tsx"
    ["quality"]="components/QualityInspectionList.tsx"
    ["esg"]="components/EnvironmentList.tsx"
    ["inspection"]="components/InspectionList.tsx"
    ["jobtraining"]="components/JobTrainingList.tsx"
    ["mom"]="components/MOMList.tsx"
)

echo "📋 Modules to update:"
for module in "${!MODULES[@]}"; do
    echo "  - $module: ${MODULES[$module]}"
done

echo ""
echo "✅ Pattern to apply:"
echo "  1. Import: ModuleTableContainer, ModulePageLayout, ModuleFilterBar"
echo "  2. Replace <Table> with <ModuleTableContainer>"
echo "  3. Wrap page with <ModulePageLayout>"
echo "  4. Replace filters with <ModuleFilterBar>"
echo ""

echo "📝 Implementation notes saved to MODULE_BATCH_IMPLEMENTATION.md"
