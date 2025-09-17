#!/bin/bash

# Database Setup Script for Ubuntu Server
# This script sets up PostgreSQL database for the PP application

echo "🚀 Setting up PostgreSQL database for PP application..."

# Update package list
echo "📦 Updating package list..."
sudo apt update

# Install PostgreSQL
echo "🐘 Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL service
echo "🔄 Starting PostgreSQL service..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
echo "🗄️ Creating database and user..."
sudo -u postgres psql << EOF
-- Create database
CREATE DATABASE pp_database;

-- Create user
CREATE USER pp_user WITH PASSWORD 'pp_password_2024';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE pp_database TO pp_user;

-- Connect to the database and grant schema privileges
\c pp_database;
GRANT ALL ON SCHEMA public TO pp_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pp_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO pp_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO pp_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO pp_user;

\q
EOF

# Configure PostgreSQL for remote connections (optional)
echo "🔧 Configuring PostgreSQL..."
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/*/main/postgresql.conf

# Update pg_hba.conf to allow local connections
echo "host    all             all             127.0.0.1/32            md5" | sudo tee -a /etc/postgresql/*/main/pg_hba.conf

# Restart PostgreSQL
echo "🔄 Restarting PostgreSQL..."
sudo systemctl restart postgresql

# Test connection
echo "🧪 Testing database connection..."
PGPASSWORD=pp_password_2024 psql -h localhost -U pp_user -d pp_database -c "SELECT version();"

echo "✅ Database setup completed successfully!"
echo ""
echo "📋 Database Information:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: pp_database"
echo "   Username: pp_user"
echo "   Password: pp_password_2024"
echo ""
echo "🔗 Connection String:"
echo "   postgresql://pp_user:pp_password_2024@localhost:5432/pp_database?schema=public"
echo ""
echo "📝 Next steps:"
echo "   1. Copy .env.example to .env and update DATABASE_URL"
echo "   2. Run: npm install"
echo "   3. Run: npx prisma migrate dev"
echo "   4. Run: npm run seed"
