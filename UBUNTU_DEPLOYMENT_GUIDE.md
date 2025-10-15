# Ubuntu Deployment Guide - Backend Changes

## Overview

This guide covers deploying the following backend changes to Ubuntu:
- Mobile number E.164 normalization and uniqueness
- Chat system with Socket.IO
- Hierarchy CRUD endpoints (verification)

**Estimated Time:** 20-30 minutes  
**Downtime Required:** 2-5 minutes

---

## Prerequisites

### 1. Server Access
```bash
# SSH into your Ubuntu server
ssh username@your-server-ip

# Switch to application user if needed
sudo su - appuser
```

### 2. Check Current Status
```bash
# Navigate to backend directory
cd /path/to/ppBackend

# Check current branch and status
git status
git branch

# Check if server is running
pm2 list
# OR
systemctl status ppbackend
```

### 3. Verify Node.js and npm versions
```bash
node --version   # Should be >= 16.x
npm --version    # Should be >= 8.x
```

---

## Step 1: Backup Database

### Create Database Backup

```bash
# For PostgreSQL
pg_dump -U postgres -d your_database_name > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup was created
ls -lh backup_*.sql

# Move to safe location
mkdir -p ~/backups
mv backup_*.sql ~/backups/
```

**Important:** Keep this backup until deployment is verified successful!

---

## Step 2: Pull Latest Code

### Option A: Git Pull (Recommended)

```bash
cd /path/to/ppBackend

# Stash any local changes
git stash

# Pull latest changes
git pull origin main
# OR
git pull origin master

# If you stashed changes, review them
git stash list
```

### Option B: Upload Files Manually

```bash
# On your local machine, create a deployment package
cd /path/to/ppBackend
tar -czf backend-deployment.tar.gz \
  src/ \
  prisma/ \
  package.json \
  normalize-mobile-numbers.js \
  .env.example

# Upload to server
scp backend-deployment.tar.gz username@server:/tmp/

# On server, extract
cd /path/to/ppBackend
tar -xzf /tmp/backend-deployment.tar.gz
```

---

## Step 3: Install Dependencies

```bash
cd /path/to/ppBackend

# Install new dependencies (socket.io)
npm install

# Verify socket.io was installed
npm list socket.io
```

**Expected Output:**
```
└── socket.io@4.7.2
```

---

## Step 4: Update Environment Variables

```bash
# Edit .env file
nano .env

# Ensure these variables are set:
# DATABASE_URL=postgresql://user:password@localhost:5432/dbname
# JWT_SECRET=your-secret-key
# JWT_REFRESH_SECRET=your-refresh-secret
# PORT=5000

# Save and exit (Ctrl+X, Y, Enter)
```

---

## Step 5: Run Mobile Number Normalization

### DRY RUN First (Recommended)

```bash
cd /path/to/ppBackend

# Run in dry-run mode (no changes made)
node normalize-mobile-numbers.js
```

**Review the output carefully:**
- Check for duplicate mobile numbers
- Verify all numbers can be normalized
- Note any errors

### Apply Normalization (LIVE)

```bash
# Only run this after reviewing dry-run output
node normalize-mobile-numbers.js --live
```

**Expected Output:**
```
Starting mobile number normalization...
Mode: LIVE
-------------------------------------------
Found X users to process

📝 UPDATES NEEDED: Y
==================================
+249123456789 → +249123456789 (User: user@example.com)

⚠️  DUPLICATE MOBILE NUMBERS DETECTED:
=====================================
Mobile: +249900000001 (2 users)
  - ID: abc123, Email: user1@example.com, Role: USER, Status: active
  - ID: def456, Email: user2@example.com, Role: USER, Status: disabled
  → Keeping user: abc123
  → Disabling user: def456

-------------------------------------------
Summary:
  Total users: X
  Updates needed: Y
  Errors: 0
  Duplicate groups: Z

✅ Migration completed successfully
```

**Action Required:** If duplicates were found and handled, verify the correct users were kept.

---

## Step 6: Generate Prisma Client

```bash
cd /path/to/ppBackend

# Generate Prisma client with new models
npx prisma generate
```

**Expected Output:**
```
✔ Generated Prisma Client to ./node_modules/@prisma/client
```

---

## Step 7: Run Database Migrations

### Create and Apply Migration

```bash
# Create migration
npx prisma migrate dev --name add-chat-and-normalize-mobile

# Follow prompts if any
```

**Expected Output:**
```
Applying migration `20240114000000_add_chat_and_normalize_mobile`
Database now in sync with schema

✔ Generated Prisma Client
```

### Verify Migration

```bash
# Check migration status
npx prisma migrate status

# Should show: Database schema is up to date!
```

---

## Step 8: Test Before Restarting Server

### Run Quick Tests

```bash
# Test Prisma connection
npx prisma studio &
# Open in browser at http://localhost:5555
# Verify ChatRoom, ChatMembership, ChatMessage tables exist
# Close with Ctrl+C

# Test mobile normalization utility
node -e "
const { normalizeMobileNumber } = require('./src/utils/mobileNormalization');
console.log(normalizeMobileNumber('900000001'));
console.log(normalizeMobileNumber('+249900000001'));
console.log(normalizeMobileNumber('0900000001'));
"
```

**Expected Output:**
```
+249900000001
+249900000001
+249900000001
```

---

## Step 9: Restart Server

### Option A: Using PM2 (Recommended)

```bash
# Restart the application
pm2 restart ppbackend

# Check status
pm2 status

# View logs in real-time
pm2 logs ppbackend --lines 50
```

### Option B: Using systemd

```bash
# Restart service
sudo systemctl restart ppbackend

# Check status
sudo systemctl status ppbackend

# View logs
sudo journalctl -u ppbackend -f -n 50
```

### Option C: Manual restart

```bash
# Stop existing process
pkill -f "node.*app.js"

# Start server in background
nohup node src/app.js > logs/app.log 2>&1 &

# Check it's running
ps aux | grep node
tail -f logs/app.log
```

---

## Step 10: Verify Deployment

### Check Server Logs

```bash
# PM2
pm2 logs ppbackend --lines 100

# systemd
sudo journalctl -u ppbackend -n 100

# Look for:
# - "Server running on port 5000"
# - "Socket.IO enabled on port 5000"
# - No error messages
```

### Test Endpoints

```bash
# Health check
curl http://localhost:5000/health

# Expected: {"status":"ok"}

# Database status
curl http://localhost:5000/api/status

# Expected: {"status":"ok","database":"connected","timestamp":"..."}

# Test chat endpoints (requires auth token)
TOKEN="your-jwt-token"
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/chat/chatrooms

# Expected: [] or list of chat rooms
```

### Test from External

```bash
# From your local machine
curl https://your-domain.com/health
curl https://your-domain.com/api/status
```

---

## Step 11: Test Mobile Number Uniqueness

### Create Test Script

```bash
cat > test-mobile-unique.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function test() {
  try {
    // Create first user
    const hash = await bcrypt.hash('test123', 10);
    const user1 = await prisma.user.create({
      data: {
        email: 'test1@example.com',
        mobileNumber: '+249900000099',
        password: hash,
        role: 'USER',
        adminLevel: 'USER'
      }
    });
    console.log('✓ Created user 1:', user1.email);

    // Try to create duplicate
    try {
      const user2 = await prisma.user.create({
        data: {
          email: 'test2@example.com',
          mobileNumber: '+249900000099', // Same number
          password: hash,
          role: 'USER',
          adminLevel: 'USER'
        }
      });
      console.log('✗ FAILED: Duplicate was allowed!');
    } catch (err) {
      if (err.code === 'P2002') {
        console.log('✓ SUCCESS: Duplicate rejected correctly');
      } else {
        throw err;
      }
    }

    // Cleanup
    await prisma.user.delete({ where: { id: user1.id } });
    console.log('✓ Cleanup complete');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
EOF

# Run test
node test-mobile-unique.js

# Cleanup
rm test-mobile-unique.js
```

**Expected Output:**
```
✓ Created user 1: test1@example.com
✓ SUCCESS: Duplicate rejected correctly
✓ Cleanup complete
```

---

## Step 12: Test Socket.IO Connection

### Create Socket.IO Test Script

```bash
cat > test-socket.js << 'EOF'
const io = require('socket.io-client');

const socket = io('http://localhost:5000', {
  auth: {
    token: 'PUT_VALID_JWT_TOKEN_HERE'
  },
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('✓ Socket.IO connected');
  socket.disconnect();
  process.exit(0);
});

socket.on('connect_error', (error) => {
  console.log('✗ Connection error:', error.message);
  process.exit(1);
});

setTimeout(() => {
  console.log('✗ Connection timeout');
  process.exit(1);
}, 5000);
EOF

# Get a valid token first
# Login via API to get token, then replace in script above

# Run test
node test-socket.js

# Cleanup
rm test-socket.js
```

---

## Step 13: Monitor for Issues

### Set Up Monitoring

```bash
# Watch logs for next 5 minutes
pm2 logs ppbackend --lines 200

# In another terminal, monitor resources
htop

# Check for memory leaks
watch -n 5 'pm2 info ppbackend | grep -A 5 "Memory usage"'
```

### Check Error Logs

```bash
# Look for errors in the last hour
pm2 logs ppbackend --err --lines 500 | grep -i error

# Or for systemd
sudo journalctl -u ppbackend --since "1 hour ago" | grep -i error
```

---

## Rollback Procedure (If Needed)

### Step 1: Stop Current Server

```bash
pm2 stop ppbackend
# OR
sudo systemctl stop ppbackend
```

### Step 2: Restore Database

```bash
# List backups
ls -lh ~/backups/

# Restore database
psql -U postgres -d your_database_name < ~/backups/backup_YYYYMMDD_HHMMSS.sql
```

### Step 3: Revert Code

```bash
cd /path/to/ppBackend

# Find previous commit
git log --oneline -5

# Reset to previous commit
git reset --hard COMMIT_HASH

# Reinstall old dependencies
npm install

# Regenerate Prisma client
npx prisma generate
```

### Step 4: Restart Server

```bash
pm2 restart ppbackend
# OR
sudo systemctl restart ppbackend
```

---

## Post-Deployment Checklist

- [ ] Server is running without errors
- [ ] Health endpoint returns 200 OK
- [ ] Database status shows connected
- [ ] Socket.IO connection test passes
- [ ] Mobile duplicate test works correctly
- [ ] Admin panel can access backend APIs
- [ ] Mobile app can access backend APIs
- [ ] Chat endpoints respond correctly
- [ ] No unusual memory/CPU usage
- [ ] Logs show no errors for 10+ minutes
- [ ] Backup is safely stored

---

## Troubleshooting

### Issue: Migration Fails

**Error:** `Migration failed: unique constraint violation`

**Solution:**
```bash
# Run normalization script again
node normalize-mobile-numbers.js --live

# Then retry migration
npx prisma migrate dev
```

---

### Issue: Socket.IO Not Working

**Check:**
```bash
# Verify Socket.IO is installed
npm list socket.io

# Check firewall
sudo ufw status
sudo ufw allow 5000/tcp

# Check if port is listening
netstat -tulpn | grep 5000
```

**Test locally:**
```bash
curl http://localhost:5000/socket.io/
# Should return Socket.IO client library code
```

---

### Issue: Server Won't Start

**Check logs:**
```bash
pm2 logs ppbackend --err --lines 100
```

**Common causes:**
1. Port already in use
   ```bash
   lsof -i :5000
   kill -9 PID
   ```

2. Environment variables missing
   ```bash
   cat .env
   # Verify all required vars exist
   ```

3. Database connection failed
   ```bash
   npx prisma studio
   # If this fails, check DATABASE_URL
   ```

---

### Issue: High Memory Usage

**Check:**
```bash
pm2 monit
# Look for memory leaks

# Restart if needed
pm2 restart ppbackend
```

**Investigate:**
```bash
# Enable Node.js memory profiling
node --inspect src/app.js
```

---

## Performance Optimization (Optional)

### 1. Enable Process Clustering with PM2

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'ppbackend',
    script: 'src/app.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
EOF

# Restart with cluster mode
pm2 delete ppbackend
pm2 start ecosystem.config.js
pm2 save
```

### 2. Configure Nginx for Socket.IO

```nginx
# /etc/nginx/sites-available/ppbackend
upstream backend {
    ip_hash;  # Important for Socket.IO
    server 127.0.0.1:5000;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Socket.IO timeout settings
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

```bash
# Enable and restart Nginx
sudo ln -s /etc/nginx/sites-available/ppbackend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Maintenance Commands

### View All PM2 Processes
```bash
pm2 list
pm2 info ppbackend
pm2 monit
```

### Restart Server
```bash
pm2 restart ppbackend
```

### View Logs
```bash
pm2 logs ppbackend
pm2 logs ppbackend --lines 1000
pm2 logs ppbackend --err
```

### Clear Logs
```bash
pm2 flush ppbackend
```

### Database Maintenance
```bash
# Vacuum database (PostgreSQL)
psql -U postgres -d your_database_name -c "VACUUM ANALYZE;"

# Check database size
psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('your_database_name'));"
```

---

## Support & Resources

- **Prisma Documentation:** https://www.prisma.io/docs
- **Socket.IO Documentation:** https://socket.io/docs/v4/
- **PM2 Documentation:** https://pm2.keymetrics.io/docs/

For issues, check:
1. Server logs (`pm2 logs`)
2. Database logs (`/var/log/postgresql/`)
3. Nginx logs (`/var/log/nginx/`)
4. Application logs (`ppBackend/logs/`)

---

## Summary

You have successfully deployed:
- ✅ Mobile number normalization and uniqueness
- ✅ Chat system with Socket.IO
- ✅ Updated Prisma schema and migrations
- ✅ New API endpoints for chat

**Next Steps:**
1. Deploy admin panel updates
2. Deploy mobile app updates
3. Monitor for 24 hours
4. Update documentation

**Deployment Date:** _________________  
**Deployed By:** _________________  
**Version/Commit:** _________________

