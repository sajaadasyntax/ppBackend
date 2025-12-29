#!/bin/bash

# Script to fix Prisma client sync issues
# Run this on the production server to regenerate Prisma client

echo "🔧 Fixing Prisma Client Sync Issues..."
echo "========================================"

# Navigate to backend directory
cd /var/www/pp/ppBackend || exit 1

echo ""
echo "Step 1: Checking Prisma schema..."
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Error: prisma/schema.prisma not found!"
    exit 1
fi

echo "✅ Schema file found"

echo ""
echo "Step 2: Regenerating Prisma Client..."
npx prisma generate

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to generate Prisma client"
    exit 1
fi

echo "✅ Prisma client regenerated"

echo ""
echo "Step 3: Checking database connection..."
npx prisma db pull --print

if [ $? -ne 0 ]; then
    echo "⚠️  Warning: Could not pull database schema (this is OK if database is already in sync)"
else
    echo "✅ Database connection verified"
fi

echo ""
echo "Step 4: Verifying migrations..."
npx prisma migrate status

echo ""
echo "========================================"
echo "✅ Prisma sync fix completed!"
echo ""
echo "Next steps:"
echo "1. Restart your application server"
echo "2. Test admin login again"
echo ""

