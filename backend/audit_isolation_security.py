#!/usr/bin/env python3
"""
Security Audit: Check for Cross-Project Data Leakage Vulnerabilities
Scans all modules for similar isolation issues found in Employee Management.
"""

import os
import re
from pathlib import Path

print("=" * 80)
print("MULTI-MODULE SECURITY AUDIT: Cross-Project Isolation")
print("=" * 80)

backend_dir = Path(__file__).parent
modules_to_check = [
    'attendance',
    'workforce',
    'ptw',
    'safetyobservation',
    'incidentmanagement',
    'quality',
    'inspection',
    'manpower',
    'ergon',
    'ergon_manpower',
    'tbt',
    'inductiontraining',
    'jobtraining',
]

# Patterns that indicate potential isolation issues
vulnerable_patterns = [
    (r'Q\(organization_type=', 'organization_type filter without project check'),
    (r'Q\(company_type=admin_type\)', 'company_type filter without project check'),
    (r'\.filter\(admin_type=', 'admin_type filter without project check'),
    (r'\.filter\(organization_type=', 'organization_type filter without project check'),
]

findings = []

print("\n[1] SCANNING MODULES FOR VULNERABLE PATTERNS")
print("-" * 80)

for module in modules_to_check:
    module_path = backend_dir / module
    if not module_path.exists():
        continue
    
    views_file = module_path / 'views.py'
    if not views_file.exists():
        continue
    
    print(f"\nChecking: {module}/views.py")
    
    with open(views_file, 'r') as f:
        content = f.read()
        lines = content.split('\n')
    
    for pattern, description in vulnerable_patterns:
        matches = re.finditer(pattern, content)
        for match in matches:
            # Find line number
            line_num = content[:match.start()].count('\n') + 1
            line_content = lines[line_num - 1].strip()
            
            # Check if it's in a comment
            if line_content.startswith('#'):
                continue
            
            findings.append({
                'module': module,
                'file': 'views.py',
                'line': line_num,
                'pattern': pattern,
                'description': description,
                'code': line_content,
            })
            print(f"  ⚠️  Line {line_num}: {description}")
            print(f"      {line_content[:80]}")

print("\n" + "=" * 80)
print(f"AUDIT SUMMARY: Found {len(findings)} potential issues")
print("=" * 80)

if findings:
    print("\n[2] DETAILED FINDINGS")
    print("-" * 80)
    for i, finding in enumerate(findings, 1):
        print(f"\n{i}. {finding['module']}/{finding['file']}:{finding['line']}")
        print(f"   Issue: {finding['description']}")
        print(f"   Code: {finding['code']}")
        print(f"   Pattern: {finding['pattern']}")
else:
    print("\n✅ No vulnerable patterns found!")

print("\n[3] RECOMMENDATIONS")
print("-" * 80)
if findings:
    print("For each finding:")
    print("  1. Review the isolation logic")
    print("  2. Ensure project-level filtering is applied")
    print("  3. Remove broad organization_type/company_type filters")
    print("  4. Add project check: Q(admin_type=X, created_by__project=project)")
    print("  5. Test with multiple admins in different projects")
else:
    print("  1. Continue monitoring for new code")
    print("  2. Add automated tests for isolation logic")
    print("  3. Document isolation rules for all modules")

print("\n[4] ISOLATION BEST PRACTICES")
print("-" * 80)
print("✅ DO:")
print("  - Filter by created_by_admin=user")
print("  - Filter by admin_type + project together")
print("  - Use tenant_id for MasterAdmin scope")
print("  - Test with multiple admins in different projects")
print("\n❌ DON'T:")
print("  - Use organization_type without project check")
print("  - Use company_type without project check")
print("  - Assume same admin_type = same project")
print("  - Skip isolation for 'admin' users")

print("\n" + "=" * 80)
print("AUDIT COMPLETE")
print("=" * 80)
