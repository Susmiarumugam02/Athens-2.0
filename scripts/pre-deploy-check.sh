#!/bin/bash
# Athens 2.0 - Pre-Deployment Validation Script

set -e

echo "=== Athens 2.0 Pre-Deployment Validation ==="
echo ""

cd /var/www/athens-2.0/backend

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "❌ Virtual environment not found at .venv"
    exit 1
fi

source .venv/bin/activate

# 1. Check Python syntax
echo "1. Checking Python syntax..."
SYNTAX_ERRORS=0
while IFS= read -r file; do
    if ! python -m py_compile "$file" 2>/dev/null; then
        echo "   ❌ Syntax error in: $file"
        SYNTAX_ERRORS=$((SYNTAX_ERRORS + 1))
    fi
done < <(find . -name "*.py" -not -path "./.venv/*" -not -path "*/migrations/*")

if [ $SYNTAX_ERRORS -eq 0 ]; then
    echo "   ✅ No syntax errors found"
else
    echo "   ❌ Found $SYNTAX_ERRORS syntax errors"
    exit 1
fi

# 2. Check Django configuration
echo ""
echo "2. Checking Django configuration..."
if python manage.py check --deploy 2>&1 | grep -q "System check identified no issues"; then
    echo "   ✅ Django configuration is valid"
else
    echo "   ❌ Django configuration has issues"
    python manage.py check --deploy
    exit 1
fi

# 3. Check for pending migrations
echo ""
echo "3. Checking migrations..."
if python manage.py migrate --check >/dev/null 2>&1; then
    echo "   ✅ No pending migrations"
else
    echo "   ⚠️  Pending migrations detected"
    python manage.py showmigrations --plan | grep "\[ \]" || true
fi

# 4. Run tests (optional - comment out if too slow)
echo ""
echo "4. Running tests..."
if pytest -v --tb=short -x 2>&1 | tail -5; then
    echo "   ✅ Tests passed"
else
    echo "   ❌ Tests failed"
    exit 1
fi

# 5. Check port configuration
echo ""
echo "5. Checking port configuration..."
bash /var/www/athens-2.0/scripts/verify-ports.sh

echo ""
echo "=== ✅ All Pre-Deployment Checks Passed ==="
echo ""
echo "Ready to deploy. Run:"
echo "  sudo systemctl restart athens2-backend"
echo "  sudo systemctl status athens2-backend"
