# Fix Right Now - Step by Step

The script deleted `@prisma/client` which is needed for generation. Run these commands:

```bash
cd /var/www/pp/ppBackend

# Step 1: Reinstall Prisma dependencies
npm install @prisma/client @prisma/adapter-pg prisma

# Step 2: Generate Prisma client
npx prisma generate

# Step 3: Rebuild TypeScript
npm run build

# Step 4: Start the application
pm2 start ecosystem.config.js

# Step 5: Check logs
pm2 logs pp-backend --lines 50
```

## What Happened:

The script deleted `node_modules/@prisma/client` but Prisma needs that package to exist before it can generate the client. We need to reinstall it first.

## Quick One-Liner:

```bash
cd /var/www/pp/ppBackend && npm install @prisma/client @prisma/adapter-pg prisma && npx prisma generate && npm run build && pm2 start ecosystem.config.js && pm2 logs pp-backend --lines 50
```

After this, admin login should work!

