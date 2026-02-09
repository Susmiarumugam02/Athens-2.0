# PostgreSQL Setup for Athens 2.0

## 📋 Connection Details

```
HOST:     localhost
PORT:     5432
DATABASE: athens2_db
USER:     athens2_user
PASSWORD: Athens2.0@2026
```

## 🚀 Quick Setup

### Step 1: Setup PostgreSQL Database
```bash
/var/www/athens-2.0/setup-postgres.sh
```

This will:
- Create database `athens2_db`
- Create user `athens2_user` with password
- Grant all privileges

### Step 2: Migrate Data from SQLite
```bash
/var/www/athens-2.0/migrate-to-postgres.sh
```

This will:
- Backup SQLite data
- Run migrations on PostgreSQL
- Load existing data into PostgreSQL

### Step 3: Restart Django
```bash
pkill -f 'python manage.py runserver'
cd /var/www/athens-2.0/backend
source .venv/bin/activate
python manage.py runserver 0.0.0.0:8004
```

## ✅ Verify Connection

```bash
cd /var/www/athens-2.0/backend
source .venv/bin/activate
python manage.py dbshell
```

Should connect to PostgreSQL. Type `\q` to exit.

## 🔧 Manual Setup (if scripts fail)

### Create Database & User
```bash
sudo -u postgres psql
```

```sql
CREATE USER athens2_user WITH PASSWORD 'Athens2.0@2026';
CREATE DATABASE athens2_db OWNER athens2_user;
GRANT ALL PRIVILEGES ON DATABASE athens2_db TO athens2_user;
\c athens2_db
GRANT ALL ON SCHEMA public TO athens2_user;
\q
```

### Run Migrations
```bash
cd /var/www/athens-2.0/backend
source .venv/bin/activate
python manage.py migrate
```

### Create Superadmin
```bash
python manage.py shell
```

```python
from authentication.models import User, UserType
User.objects.create_user(
    email='superadmin@athens.com',
    password='Admin@123',
    user_type=UserType.SUPERADMIN
)
```

## 📁 Configuration Files

### `.env` File
Location: `/var/www/athens-2.0/backend/.env`

```bash
DB_ENGINE=django.db.backends.postgresql
DB_NAME=athens2_db
DB_USER=athens2_user
DB_PASSWORD=Athens2.0@2026
DB_HOST=localhost
DB_PORT=5432

SECRET_KEY=django-insecure-=s98cb05e1ab3sj#_#*w8siv6@=%@^55(iq_jyy-8=&du8ygt7
DEBUG=False
ALLOWED_HOSTS=ai-athens.cloud,www.ai-athens.cloud,localhost,127.0.0.1
```

### `settings.py` Updates
- ✅ Loads `.env` file
- ✅ Uses environment variables for database
- ✅ Falls back to SQLite if PostgreSQL not configured

## 🔍 Troubleshooting

### Connection Refused
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql
```

### Authentication Failed
```bash
# Reset password
sudo -u postgres psql
ALTER USER athens2_user WITH PASSWORD 'Athens2.0@2026';
```

### Permission Denied
```bash
sudo -u postgres psql athens2_db
GRANT ALL ON SCHEMA public TO athens2_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO athens2_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO athens2_user;
```

## 📊 Database Management

### Backup Database
```bash
pg_dump -U athens2_user -h localhost athens2_db > backup.sql
```

### Restore Database
```bash
psql -U athens2_user -h localhost athens2_db < backup.sql
```

### Connect to Database
```bash
psql -U athens2_user -h localhost -d athens2_db
```

## 🔐 Security Notes

- ✅ Password is strong (Athens2.0@2026)
- ✅ User has limited privileges (only athens2_db)
- ⚠️ Change password in production
- ⚠️ Use SSL for remote connections
- ⚠️ Keep `.env` file secure (chmod 600)

## 📝 Next Steps

After PostgreSQL setup:
1. ✅ Database configured
2. ✅ Data migrated
3. ✅ Django restarted
4. 🔄 Test login at https://ai-athens.cloud
5. 🔄 Verify all features work

---

**Status:** Ready for PostgreSQL migration
**Last Updated:** 2026-02-06
