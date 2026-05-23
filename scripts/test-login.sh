#!/bin/bash

echo "Testing login endpoint..."
echo ""

# Test with superadmin credentials
echo "Attempting login with superadmin@athens.com..."

response=$(curl -s -X POST http://localhost:8004/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@athens.com","password":"admin123"}')

if echo "$response" | grep -q "access"; then
    echo "✅ Login successful!"
    echo ""
    echo "Response includes:"
    echo "$response" | grep -o '"status":"[^"]*"' || echo "  - No status field (check response)"
    echo "$response" | grep -o '"induction_attended":[^,}]*' || echo "  - No induction_attended field"
    echo "$response" | grep -o '"next_route":"[^"]*"' || echo "  - No next_route field"
else
    echo "❌ Login failed!"
    echo ""
    echo "Response:"
    echo "$response"
fi
