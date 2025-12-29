#!/bin/bash

# Script to check and apply Prisma migrations on production
# Run this on the production server

echo "🔍 Checking Prisma Migration Status..."
echo "========================================"

# Navigate to backend directory
cd /var/www/pp/ppBackend || exit 1

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    exit 1
fi

echo ""
echo "Step 1: Checking migration status..."
npx prisma migrate status

MIGRATION_STATUS=$?

if [ $MIGRATION_STATUS -eq 0 ]; then
    echo ""
    echo "✅ All migrations are applied!"
else
    echo ""
    echo "⚠️  Migrations are pending or database is out of sync"
    echo ""
    read -p "Do you want to apply pending migrations? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "Step 2: Applying migrations..."
        echo "⚠️  WARNING: This will modify your database schema!"
        echo ""
        read -p "Are you sure? Type 'yes' to continue: " confirm
        if [ "$confirm" = "yes" ]; then
            npx prisma migrate deploy
            if [ $? -eq 0 ]; then
                echo ""
                echo "✅ Migrations applied successfully!"
            else
                echo ""
                echo "❌ Migration failed! Check the error above."
                exit 1
            fi
        else
            echo "Migration cancelled."
            exit 0
        fi
    else
        echo "Migration cancelled."
        exit 0
    fi
fi

echo ""
echo "Step 3: Regenerating Prisma client..."
npx prisma generate

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to generate Prisma client"
    exit 1
fi

echo "✅ Prisma client regenerated"

echo ""
echo "Step 4: Verifying database connection..."
npx prisma db pull --print > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Database connection verified"
else
    echo "⚠️  Warning: Could not verify database connection (this might be OK)"
fi

echo ""
echo "========================================"
echo "✅ Migration check completed!"
echo ""
echo "Next steps:"
echo "1. Restart your application: pm2 restart pp-backe"
echo "2. Test admin login"
echo "3. Check logs: pm2 logs pp-backe --lines 50"
echo ""

