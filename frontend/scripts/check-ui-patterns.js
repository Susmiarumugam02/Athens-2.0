#!/usr/bin/env node

/**
 * SAP Takeover SOP: UI Pattern Checker
 * Prevents reintroduction of Athens legacy UI patterns
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const errors = [];

// Check 1: No direct imports from ui-legacy (except in shims)
console.log('Checking for legacy UI imports...');
try {
  const result = execSync(
    'grep -r "@/components/ui-legacy" src --include="*.tsx" --include="*.ts" --exclude-dir=ui-legacy | grep -v "src/components/ui/index.ts" || true',
    { encoding: 'utf-8' }
  );
  if (result.trim()) {
    errors.push('❌ Found direct imports from @/components/ui-legacy:');
    errors.push(result);
    errors.push('   Use @/components/ui/* or @/ui/sap/* instead. See UI_SOP.md');
  }
} catch (e) {
  // grep returns non-zero if no matches, which is what we want
}

// Check 2: No imports of legacy global CSS
console.log('Checking for legacy CSS imports...');
try {
  const result = execSync(
    'grep -r "import.*index\\.css" src --include="*.tsx" --include="*.ts" | grep -v "sap" | grep -v "node_modules" || true',
    { encoding: 'utf-8' }
  );
  if (result.trim()) {
    const lines = result.trim().split('\n');
    // Filter out the gated import in main.tsx
    const violations = lines.filter(line => 
      !line.includes('main.tsx') && 
      !line.includes('VITE_USE_ATHENS_STYLES')
    );
    if (violations.length > 0) {
      errors.push('❌ Found legacy CSS imports:');
      errors.push(violations.join('\n'));
      errors.push('   Use SAP CSS only. See UI_SOP.md');
    }
  }
} catch (e) {
  // grep returns non-zero if no matches
}

// Check 3: Warn about page-level container wrappers (informational)
console.log('Checking for page-level containers...');
try {
  const result = execSync(
    'grep -r "className=.*container.*mx-auto" src/pages --include="*.tsx" || true',
    { encoding: 'utf-8' }
  );
  if (result.trim()) {
    console.log('⚠️  Found page-level containers (informational):');
    console.log(result);
    console.log('   Consider using layout-level containers. See UI_SOP.md');
  }
} catch (e) {
  // grep returns non-zero if no matches
}

// Report results
console.log('\n' + '='.repeat(60));
if (errors.length > 0) {
  console.log('❌ UI Pattern Check FAILED\n');
  errors.forEach(err => console.log(err));
  console.log('\n' + '='.repeat(60));
  process.exit(1);
} else {
  console.log('✅ UI Pattern Check PASSED');
  console.log('   No legacy UI patterns detected');
  console.log('='.repeat(60));
  process.exit(0);
}
