#!/bin/bash
# Migrate Athens 2.0 from SQLite to PostgreSQL

set -e

echo "📦 Migrating Athens 2.0 to PostgreSQL..."

cd /var/www/athens-2.0/backend
source .venv/bin/activate

# Backup SQLite data
echo "1️⃣ Backing up SQLite data..."
python manage.py dumpdata --natural-foreign --natural-primary \
  --exclude contenttypes --exclude auth.permission \
  --exclude admin.logentry --exclude sessions.session \
  > data_backup.json

echo "✅ Data backed up to data_backup.json"

# Run migrations on PostgreSQL
echo "2️⃣ Running migrations on PostgreSQL..."
python manage.py migrate

# Load data into PostgreSQL
echo "3️⃣ Loading data into PostgreSQL..."
python manage.py loaddata data_backup.json

echo "✅ Migration complete!"
echo ""
echo "🔄 Restart Django server:"
echo "   pkill -f 'python manage.py runserver'"
echo "   python manage.py runserver 0.0.0.0:8004"
