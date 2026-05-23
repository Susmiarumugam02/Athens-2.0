#!/bin/bash
# Setup PostgreSQL for Athens 2.0

set -e

echo "🐘 Setting up PostgreSQL for Athens 2.0..."

# Create database and user
sudo -u postgres psql << EOF
-- Create user
CREATE USER athens2_user WITH PASSWORD 'Athens2.0@2026';

-- Create database
CREATE DATABASE athens2_db OWNER athens2_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE athens2_db TO athens2_user;

-- Connect to database and grant schema privileges
\c athens2_db
GRANT ALL ON SCHEMA public TO athens2_user;

\q
EOF

echo "✅ PostgreSQL setup complete!"
echo ""
echo "Database: athens2_db"
echo "User: athens2_user"
echo "Password: Athens2.0@2026"
