# Complete Fix Guide for Admin Login Issue

## Root Cause

The error `The column (not available) does not exist` is caused by **TWO potential issues**:

1. **Pending Database Migrations** - The database schema doesn't match your Prisma schema
2. **Out-of-Sync Prisma Client** - The generated Prisma client doesn't match your schema

## Complete Fix (Run on Production Server)

### Step 1: Check and Apply Migrations

```bash
cd /var/www/pp/ppBackend

# Option A: Use the automated script (recommended)
node check-migrations.js

# Option B: Manual check
npx prisma migrate status

# If migrations are pending, apply them:
npx prisma migrate deploy
```

### Step 2: Regenerate Prisma Client

```bash
# This is CRITICAL - must be done after migrations
npx prisma generate
```

### Step 3: Restart Application

```bash
pm2 restart pp-backe
```

### Step 4: Verify

```bash
# Check logs
pm2 logs pp-backe --lines 50

# Try admin login:
# Mobile: +249123456789
# Password: admin123
```

## Quick One-Liner Fix

If you're confident and want to do it all at once:

```bash
cd /var/www/pp/ppBackend && \
npx prisma migrate deploy && \
npx prisma generate && \
pm2 restart pp-backe
```

## What Each Command Does

- `npx prisma migrate status` - Checks if database schema matches migrations
- `npx prisma migrate deploy` - Applies pending migrations to production database
- `npx prisma generate` - Regenerates Prisma client from schema.prisma
- `pm2 restart pp-backe` - Restarts your application with new client

## Troubleshooting

### If migrations fail:

1. **Check database connection:**
   ```bash
   # Test connection
   npx prisma db pull
   ```

2. **Check for migration conflicts:**
   ```bash
   # See what migrations exist
   ls -la prisma/migrations/
   
   # Check migration history in database
   npx prisma migrate status
   ```

3. **If you need to reset (DANGEROUS - backup first!):**
   ```bash
   # Backup database first!
   pg_dump your_database > backup.sql
   
   # Then reset (only if absolutely necessary)
   npx prisma migrate reset
   ```

### If Prisma generate fails:

1. **Check Node.js version:**
   ```bash
   node --version  # Should be 18+ for Prisma 7.x
   ```

2. **Clear and reinstall:**
   ```bash
   rm -rf node_modules/.prisma
   npm install
   npx prisma generate
   ```

## Prevention

Add this to your deployment script:

```bash
#!/bin/bash
cd /var/www/pp/ppBackend

# Pull latest code
git pull

# Install dependencies
npm install

# Apply migrations
npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate

# Restart application
pm2 restart pp-backe
```

## Emergency Fallback

I've added a raw SQL fallback in the code that should allow login to work even with a broken Prisma client. However, this is temporary - you MUST fix the migrations and regenerate the client for full functionality.

