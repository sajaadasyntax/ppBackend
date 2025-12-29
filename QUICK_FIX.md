# Quick Fix - Run This Now!

The error persists because the compiled JavaScript code in `dist/` has cached old Prisma types. 

## Run This Command:

```bash
cd /var/www/pp/ppBackend

# Option 1: Use the full rebuild script (recommended)
chmod +x full-rebuild.sh
./full-rebuild.sh

# Option 2: Manual steps
pm2 stop pp-backend
rm -rf dist/ node_modules/.prisma node_modules/@prisma/client
npx prisma generate
npm run build
pm2 start ecosystem.config.js
pm2 logs pp-backend --lines 50
```

## What This Does:

1. **Stops the app** - Prevents it from using old code
2. **Clears dist/** - Removes old compiled JavaScript
3. **Clears Prisma cache** - Removes stale Prisma client files
4. **Regenerates Prisma client** - Creates fresh client from schema
5. **Rebuilds TypeScript** - Compiles fresh code with new Prisma types
6. **Restarts app** - Starts with fresh code

## Why This Is Needed:

The error `The column (not available) does not exist` happens because:
- Your compiled JavaScript in `dist/` was built with old Prisma types
- Even though we regenerated the Prisma client, the compiled code still references old schema
- We need to rebuild TypeScript to pick up the new Prisma types

## After Running:

1. Check logs: `pm2 logs pp-backend --lines 50`
2. Try admin login again
3. The error should be gone!

