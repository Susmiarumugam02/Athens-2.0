#!/bin/bash

cd /var/www/athens-2.0/frontend

# Fix unused imports in Dashboard
sed -i 's/import { controlPlaneService, type Tenant, type Subscription, type AuditLog }/import { controlPlaneService, type AuditLog }/' src/pages/superadmin/Dashboard.tsx

# Fix unused import in LoginPage
sed -i '/import { useNavigate } from/d' src/pages/auth/LoginPage.tsx

# Fix Select component usage - remove label prop and fix onChange
sed -i 's/<Select$/&/' src/pages/superadmin/Masters.tsx
sed -i 's/label="Tenant"//' src/pages/superadmin/Masters.tsx
sed -i 's/onChange={(e) => setFormData({ ...formData, tenant: e.target.value })}/onChange={(e) => setFormData({ ...formData, tenant: e })}/' src/pages/superadmin/Masters.tsx

sed -i 's/label="Tenant"//' src/pages/superadmin/Subscriptions.tsx
sed -i 's/label="Status"//' src/pages/superadmin/Subscriptions.tsx
sed -i 's/onChange={(e) => setFormData({ ...formData, tenant: e.target.value })}/onChange={(e) => setFormData({ ...formData, tenant: e })}/' src/pages/superadmin/Subscriptions.tsx
sed -i 's/onChange={(e) => setFormData({ ...formData, status: e.target.value })}/onChange={(e) => setFormData({ ...formData, status: e })}/' src/pages/superadmin/Subscriptions.tsx

# Fix process.env usage
sed -i 's/process\.env\.NODE_ENV/import.meta.env.MODE/g' src/components/forms/CreateCompanyModal.tsx
sed -i 's/process\.env\.NODE_ENV/import.meta.env.MODE/g' src/components/modals/CompanyEditModal.tsx
sed -i 's/process\.env\.NODE_ENV/import.meta.env.MODE/g' src/components/ui/ErrorBoundary.tsx

echo "Type fixes applied!"
