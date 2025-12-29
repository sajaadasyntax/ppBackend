# ⚠️ URGENT: Fix Admin Login Issue

## Immediate Action Required

The Prisma client on your production server is **out of sync** with the database schema. This is causing admin login to fail.

## Quick Fix (Run These Commands NOW)

SSH into your production server and run:

```bash
cd /var/www/pp/ppBackend

# 1. Regenerate Prisma client (CRITICAL!)
npx prisma generate

# 2. Restart the application
pm2 restart pp-backe

# 3. Check if it's working
pm2 logs pp-backe --lines 20
```

## What's Happening

The error `The column (not available) does not exist` means:
- Your Prisma schema (`prisma/schema.prisma`) has been updated
- But the Prisma client (`node_modules/@prisma/client`) hasn't been regenerated
- So Prisma is trying to query columns that don't exist in the generated client

## Verification

After running the commands above, try logging in again:
- Mobile: `+249123456789` or `+249123456790`  
- Password: `admin123`

If you still see errors, check the logs:
```bash
tail -f /var/www/pp/ppBackend/logs/err.log
```

## Why This Happened

This typically happens when:
1. Code was deployed without running `npx prisma generate`
2. The Prisma schema was modified but migrations weren't applied
3. The `node_modules` folder was restored from a backup that had an old Prisma client

## Prevention

Add this to your deployment script:
```bash
# Always regenerate Prisma client after pulling code
cd /var/www/pp/ppBackend
npx prisma generate
pm2 restart pp-backe
```

## Temporary Workaround

I've added fallback code that will try simpler queries if the main query fails. This should allow login to work even with an out-of-sync client, but **you still need to regenerate the Prisma client** for full functionality.

