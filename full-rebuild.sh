#!/bin/bash

# Complete rebuild script to fix Prisma issues
# This clears all caches and rebuilds everything

echo "🔧 Complete Rebuild Script"
echo "=========================="
echo ""

cd /var/www/pp/ppBackend || exit 1

echo "Step 1: Stopping application..."
pm2 stop pp-backend 2>/dev/null || true
pm2 delete pp-backend 2>/dev/null || true
echo "✅ Application stopped"
echo ""

echo "Step 2: Clearing build artifacts..."
rm -rf dist/
echo "✅ Build directory cleared"
echo ""

echo "Step 3: Clearing Prisma cache..."
rm -rf node_modules/.prisma
# Don't delete @prisma/client - we need it for generation
# Just clear the generated client cache
echo "✅ Prisma cache cleared"
echo ""

echo "Step 4: Regenerating Prisma client..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "⚠️  Prisma generate failed, trying to reinstall dependencies..."
    npm install @prisma/client @prisma/adapter-pg prisma
    npx prisma generate
    if [ $? -ne 0 ]; then
        echo "❌ Failed to generate Prisma client"
        exit 1
    fi
fi
echo "✅ Prisma client regenerated"
echo ""

echo "Step 5: Checking migrations..."
npx prisma migrate status
echo ""

echo "Step 6: Rebuilding TypeScript..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi
echo "✅ TypeScript compiled"
echo ""

echo "Step 7: Starting application..."
pm2 start ecosystem.config.js
echo "✅ Application started"
echo ""

echo "Step 8: Checking status..."
sleep 2
pm2 status
echo ""

echo "=========================="
echo "✅ Rebuild completed!"
echo ""
echo "Next steps:"
echo "  1. Check logs: pm2 logs pp-backend --lines 50"
echo "  2. Test admin login"
echo ""

