# Fix Admin Login Issue

## Problem
Admin login fails with error:
```
Invalid `prisma.user.findUnique()` invocation:
The column `(not available)` does not exist in the current database.
```

## Root Causes
1. **Prisma Client Out of Sync**: The Prisma client hasn't been regenerated after schema changes
2. **Incorrect RefreshToken Usage**: Code was trying to save `refreshToken` directly on User model instead of using the RefreshToken table

## Solution

### Step 1: Fix Code Issues (Already Fixed)
The code has been updated to:
- Use `RefreshToken` table instead of trying to save refreshToken on User model
- Properly handle refresh token creation, updates, and deletion

### Step 2: Regenerate Prisma Client on Production Server

SSH into your production server and run:

```bash
cd /var/www/pp/ppBackend

# Regenerate Prisma client
npx prisma generate

# Verify migrations are up to date
npx prisma migrate status

# If migrations are pending, apply them (BE CAREFUL - backup first!)
# npx prisma migrate deploy
```

### Step 3: Restart Application

```bash
# If using PM2
pm2 restart pp-backe

# Or if using systemd
sudo systemctl restart ppbackend

# Check logs
pm2 logs pp-backe --lines 50
# or
sudo journalctl -u ppbackend -f -n 50
```

### Step 4: Test Admin Login

Try logging in as admin again with:
- Mobile: `+249123456789` or `+249123456790`
- Password: `admin123`

## Quick Fix Script

You can also use the provided script:

```bash
cd /var/www/pp/ppBackend
chmod +x fix-prisma-sync.sh
./fix-prisma-sync.sh
```

Then restart your application.

## Verification

After applying the fix, check the logs:
```bash
tail -f /var/www/pp/ppBackend/logs/out.log
tail -f /var/www/pp/ppBackend/logs/err.log
```

You should no longer see the "column (not available)" error.

## Additional Notes

- The Prisma client must be regenerated whenever the schema changes
- Always run `npx prisma generate` after pulling code changes that modify `schema.prisma`
- Consider adding `npx prisma generate` to your deployment script

