# Fresh Deployment Guide - Ubuntu Server (From Scratch)

## Overview

This guide walks you through deploying the backend from scratch with a clean database, including all new features:
- Mobile number E.164 normalization and uniqueness
- Chat system with Socket.IO
- Hierarchy management system

**⚠️ WARNING:** This guide includes steps to **clear all existing data**. Use only for:
- New deployments
- Development/testing environments
- When you want to start fresh (after backing up important data)

**Estimated Time:** 45-60 minutes  
**Prerequisites:** Ubuntu 20.04+ server with sudo access

---

## Part 1: System Preparation

### Step 1: Update System

```bash
# Update package lists
sudo apt update
sudo apt upgrade -y

# Install essential build tools
sudo apt install -y build-essential curl git wget
```

### Step 2: Install Node.js (v18 LTS)

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js and npm
sudo apt install -y nodejs

# Verify installation
node --version    # Should show v18.x.x
npm --version     # Should show v9.x.x or higher
```

### Step 3: Install PostgreSQL

```bash
# Install PostgreSQL 14
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
sudo systemctl status postgresql
```

### Step 4: Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version

# Set up PM2 to start on boot
pm2 startup
# Follow the command it outputs (usually: sudo env PATH=$PATH:...)
```

### Step 5: Create Application User (Optional but Recommended)

```bash
# Create dedicated user for the application
sudo adduser ppbackend --disabled-password --gecos ""

# Add to sudoers if needed
sudo usermod -aG sudo ppbackend

# Switch to app user
sudo su - ppbackend
```

---

## Part 2: Database Setup

### Step 1: Create PostgreSQL User and Database

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt, run:
CREATE USER ppbackend WITH PASSWORD 'your_secure_password_here';
CREATE DATABASE ppsudan OWNER ppbackend;
GRANT ALL PRIVILEGES ON DATABASE ppsudan TO ppbackend;

# Exit PostgreSQL
\q
```

### Step 2: Test Database Connection

```bash
# Test connection
psql -U ppbackend -d ppsudan -h localhost

# You should see PostgreSQL prompt
# Type \q to exit
```

### Step 3: Configure PostgreSQL for Remote Access (If Needed)

```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/14/main/postgresql.conf

# Find and uncomment/modify:
listen_addresses = 'localhost'  # Or '*' for all interfaces

# Save and exit (Ctrl+X, Y, Enter)

# Edit pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add this line:
host    ppsudan    ppbackend    127.0.0.1/32    md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## Part 3: Application Setup

### Step 1: Clone Repository

```bash
# Navigate to application directory
cd /opt  # or /home/ppbackend or wherever you want

# Clone the repository
git clone https://github.com/yourusername/pp.git
cd pp/ppBackend

# Or if already cloned, navigate to it
cd /path/to/ppBackend
```

### Step 2: Install Dependencies

```bash
# Install all npm packages
npm install

# Verify critical packages
npm list prisma
npm list @prisma/client
npm list socket.io
npm list express
npm list bcrypt
```

### Step 3: Create Environment File

```bash
# Create .env file
nano .env
```

**Add the following content:**

```env
# Database
DATABASE_URL="postgresql://ppbackend:your_secure_password_here@localhost:5432/ppsudan?schema=public"

# JWT Secrets (Generate strong random strings)
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-min-32-chars"

# Server
PORT=5000
NODE_ENV=production

# Frontend URLs (for CORS)
FRONTEND_URL=https://yourdomain.com
```

**Generate secure secrets:**
```bash
# Generate random secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Use output for JWT_SECRET

node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Use output for JWT_REFRESH_SECRET
```

Save and exit (Ctrl+X, Y, Enter)

### Step 4: Set Proper Permissions

```bash
# Set ownership (if using app user)
sudo chown -R ppbackend:ppbackend /path/to/ppBackend

# Protect .env file
chmod 600 .env

# Make scripts executable
chmod +x *.js
```

---

## Part 4: Database Initialization

### Step 1: Clear Existing Database (If Any)

```bash
# ⚠️ WARNING: This will delete ALL existing data!

# Option A: Drop and recreate database
sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS ppsudan;
CREATE DATABASE ppsudan OWNER ppbackend;
GRANT ALL PRIVILEGES ON DATABASE ppsudan TO ppbackend;
EOF

# Option B: Reset Prisma migrations (if database exists)
npx prisma migrate reset --force
```

### Step 2: Generate Prisma Client

```bash
# Generate Prisma client
npx prisma generate

# You should see:
# ✔ Generated Prisma Client to ./node_modules/@prisma/client
```

### Step 3: Run Database Migrations

```bash
# Run all migrations (creates all tables)
npx prisma migrate deploy

# Or for development:
npx prisma migrate dev --name initial-setup

# Verify tables were created
npx prisma studio
# Open browser at http://localhost:5555
# You should see all tables: User, Region, Locality, ChatRoom, etc.
# Press Ctrl+C to close
```

### Step 4: Seed Initial Data (Optional)

```bash
# Check if seed script exists
ls prisma/seed.js

# Run seed script (if available)
npx prisma db seed

# Or manually create initial data
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seed() {
  // Create admin user
  const hash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@ppsudan.org',
      mobileNumber: '+249900000001',
      password: hash,
      role: 'ADMIN',
      adminLevel: 'GENERAL_SECRETARIAT',
      profile: {
        create: {
          firstName: 'Admin',
          lastName: 'User',
          status: 'active'
        }
      }
    }
  });
  console.log('✓ Created admin user:', admin.email);
  
  // Create sample region
  const region = await prisma.region.create({
    data: {
      name: 'ولاية الخرطوم',
      code: 'KH',
      description: 'ولاية الخرطوم',
      active: true
    }
  });
  console.log('✓ Created region:', region.name);
  
  await prisma.\$disconnect();
}

seed();
"
```

---

## Part 5: Mobile Number Normalization Setup

### Step 1: Test Normalization Utility

```bash
# Test the normalization function
node -e "
const { normalizeMobileNumber } = require('./src/utils/mobileNormalization');

console.log('Testing mobile number normalization:');
console.log('900000001 →', normalizeMobileNumber('900000001'));
console.log('0900000001 →', normalizeMobileNumber('0900000001'));
console.log('249900000001 →', normalizeMobileNumber('249900000001'));
console.log('+249900000001 →', normalizeMobileNumber('+249900000001'));
console.log('✓ All formats normalize correctly');
"
```

**Expected Output:**
```
Testing mobile number normalization:
900000001 → +249900000001
0900000001 → +249900000001
249900000001 → +249900000001
+249900000001 → +249900000001
✓ All formats normalize correctly
```

### Step 2: Run Mobile Normalization (For Existing Data)

```bash
# If you have existing users, normalize their mobile numbers
# This is safe to run even on empty database

# DRY RUN first
node normalize-mobile-numbers.js

# Review output, then run LIVE
node normalize-mobile-numbers.js --live
```

---

## Part 6: Application Startup

### Step 1: Test Server Manually

```bash
# Start server in foreground for testing
node src/app.js

# You should see:
# Server running on port 5000
# Socket.IO enabled on port 5000

# Test in another terminal:
curl http://localhost:5000/health
# Expected: {"status":"ok"}

curl http://localhost:5000/api/status
# Expected: {"status":"ok","database":"connected","timestamp":"..."}

# Stop server (Ctrl+C)
```

### Step 2: Set Up PM2

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'ppbackend',
    script: 'src/app.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs ppbackend --lines 50
```

### Step 3: Save PM2 Configuration

```bash
# Save current PM2 processes
pm2 save

# Set up PM2 to start on system boot (if not done already)
pm2 startup
# Run the command it outputs

# Test auto-start
sudo reboot
# After reboot, SSH back in and check:
pm2 list
# Your app should be running
```

---

## Part 7: Firewall and Security

### Step 1: Configure UFW Firewall

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (important!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS (if using Nginx)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow backend port (only if direct access needed)
# Usually you'd proxy through Nginx instead
sudo ufw allow 5000/tcp

# Check firewall status
sudo ufw status
```

### Step 2: Install and Configure Nginx (Reverse Proxy)

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/ppbackend
```

**Add this configuration:**

```nginx
upstream ppbackend {
    # Use IP hash for Socket.IO sticky sessions
    ip_hash;
    server 127.0.0.1:5000;
}

server {
    listen 80;
    server_name api.yourdomain.com;  # Change to your domain

    # Increase buffer sizes for large requests
    client_max_body_size 50M;
    client_body_buffer_size 128k;

    # Logging
    access_log /var/log/nginx/ppbackend-access.log;
    error_log /var/log/nginx/ppbackend-error.log;

    location / {
        proxy_pass http://ppbackend;
        proxy_http_version 1.1;
        
        # WebSocket support (for Socket.IO)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for Socket.IO
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_connect_timeout 60s;
        
        # Disable buffering for real-time features
        proxy_buffering off;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://ppbackend/health;
        access_log off;
    }
}
```

**Enable the site:**

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/ppbackend /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
```

### Step 3: Set Up SSL with Let's Encrypt (Optional but Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Follow prompts to:
# 1. Enter email
# 2. Agree to terms
# 3. Choose redirect HTTP to HTTPS (recommended)

# Test auto-renewal
sudo certbot renew --dry-run

# Certificate will auto-renew
```

---

## Part 8: Testing and Verification

### Step 1: Test Health Endpoints

```bash
# Local test
curl http://localhost:5000/health
curl http://localhost:5000/api/status

# Through Nginx (replace with your domain)
curl http://api.yourdomain.com/health
curl http://api.yourdomain.com/api/status
```

### Step 2: Test Authentication

```bash
# Register a test user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "test123",
    "phone": "+249900000002"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "mobileNumber": "+249900000002",
    "password": "test123"
  }'

# Save the token from response
```

### Step 3: Test Mobile Uniqueness

```bash
# Try to create duplicate mobile
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Another User",
    "email": "another@example.com",
    "password": "test123",
    "phone": "+249900000002"
  }'

# Should return 409 Conflict error
```

### Step 4: Test Chat Endpoints

```bash
# Get auth token first (from login response)
TOKEN="your-jwt-token-here"

# Test chat rooms endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/chat/chatrooms

# Should return empty array [] for new user
```

### Step 5: Test Socket.IO Connection

```bash
# Create test script
cat > test-socket.js << 'EOF'
const io = require('socket.io-client');

const socket = io('http://localhost:5000', {
  auth: {
    token: 'PUT_YOUR_JWT_TOKEN_HERE'
  },
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('✓ Socket.IO connected successfully');
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

# Update token in script
nano test-socket.js

# Run test
node test-socket.js

# Clean up
rm test-socket.js
```

---

## Part 9: Monitoring Setup

### Step 1: Set Up Log Rotation

```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/ppbackend
```

**Add:**

```
/path/to/ppBackend/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 ppbackend ppbackend
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Step 2: Set Up Monitoring with PM2 Plus (Optional)

```bash
# Link to PM2 Plus (free for 1 server)
pm2 link <secret_key> <public_key>

# Or use pm2 monitoring
pm2 monit
```

### Step 3: Create Health Check Script

```bash
cat > healthcheck.sh << 'EOF'
#!/bin/bash

# Health check script
HEALTH_URL="http://localhost:5000/health"
STATUS_URL="http://localhost:5000/api/status"

# Check health endpoint
HEALTH=$(curl -s $HEALTH_URL)
if [[ $HEALTH == *"ok"* ]]; then
    echo "✓ Health check passed"
else
    echo "✗ Health check failed"
    pm2 restart ppbackend
fi

# Check database connection
STATUS=$(curl -s $STATUS_URL)
if [[ $STATUS == *"connected"* ]]; then
    echo "✓ Database connected"
else
    echo "✗ Database connection failed"
    pm2 restart ppbackend
fi
EOF

chmod +x healthcheck.sh

# Add to crontab (run every 5 minutes)
crontab -e
# Add: */5 * * * * /path/to/ppBackend/healthcheck.sh >> /path/to/ppBackend/logs/healthcheck.log 2>&1
```

---

## Part 10: Database Backup Setup

### Step 1: Create Backup Script

```bash
cat > backup-db.sh << 'EOF'
#!/bin/bash

# Database backup script
BACKUP_DIR="/home/ppbackend/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="ppsudan"
DB_USER="ppbackend"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
pg_dump -U $DB_USER -d $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "✓ Backup created: backup_$DATE.sql.gz"
EOF

chmod +x backup-db.sh
```

### Step 2: Schedule Daily Backups

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
# 0 2 * * * /path/to/ppBackend/backup-db.sh >> /path/to/ppBackend/logs/backup.log 2>&1

# Test backup script
./backup-db.sh
ls -lh ~/backups/
```

---

## Part 11: Performance Tuning

### Step 1: PostgreSQL Optimization

```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/14/main/postgresql.conf
```

**Recommended settings for 2GB RAM server:**

```conf
# Memory
shared_buffers = 512MB
effective_cache_size = 1536MB
maintenance_work_mem = 128MB
work_mem = 4MB

# Connections
max_connections = 100

# Checkpoint
checkpoint_completion_target = 0.9
wal_buffers = 16MB

# Query Planner
random_page_cost = 1.1
effective_io_concurrency = 200
```

**Restart PostgreSQL:**

```bash
sudo systemctl restart postgresql
```

### Step 2: Node.js Performance

```bash
# Update PM2 config for production
nano ecosystem.config.js
```

**Optimize settings:**

```javascript
module.exports = {
  apps: [{
    name: 'ppbackend',
    script: 'src/app.js',
    instances: 2,  // Use 2 instances for better performance
    exec_mode: 'cluster',  // Cluster mode
    autorestart: true,
    watch: false,
    max_memory_restart: '800M',
    env: {
      NODE_ENV: 'production',
      UV_THREADPOOL_SIZE: 4
    }
  }]
};
```

**Restart PM2:**

```bash
pm2 delete ppbackend
pm2 start ecosystem.config.js
pm2 save
```

---

## Part 12: Final Verification Checklist

### System Checks

```bash
# [ ] Server running
pm2 status
# Should show: ppbackend | online

# [ ] Database accessible
psql -U ppbackend -d ppsudan -c "SELECT COUNT(*) FROM \"User\";"

# [ ] Logs clean
pm2 logs ppbackend --lines 100 --nostream
# Should show no errors

# [ ] Health endpoints working
curl http://localhost:5000/health
curl http://localhost:5000/api/status

# [ ] Nginx proxying correctly
curl http://api.yourdomain.com/health

# [ ] SSL working (if configured)
curl https://api.yourdomain.com/health

# [ ] Firewall configured
sudo ufw status

# [ ] PM2 auto-start enabled
pm2 startup
pm2 save

# [ ] Backups scheduled
crontab -l | grep backup

# [ ] Log rotation configured
ls /etc/logrotate.d/ppbackend
```

### Application Checks

```bash
# [ ] Can create user
# (Use curl commands from Step 8.2)

# [ ] Mobile uniqueness enforced
# (Use curl commands from Step 8.3)

# [ ] Chat endpoints accessible
# (Use curl commands from Step 8.4)

# [ ] Socket.IO connecting
# (Use test script from Step 8.5)

# [ ] Admin user exists
psql -U ppbackend -d ppsudan -c "SELECT email, role FROM \"User\" WHERE role='ADMIN';"
```

---

## Part 13: Post-Deployment Steps

### Step 1: Update Frontend URLs

Update these in your admin panel and mobile app:

**Admin Panel (.env.local):**
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

**Mobile App (services/api.ts):**
```typescript
export const API_BASE_URL = 'https://api.yourdomain.com/api';
```

### Step 2: Create Admin Accounts

```bash
# Create additional admin accounts via SQL
sudo -u postgres psql ppsudan << 'EOF'
-- Create admin user (update with real data)
INSERT INTO "User" (id, email, "mobileNumber", password, role, "adminLevel", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin2@ppsudan.org',
  '+249900000003',
  '$2b$10$...',  -- Generate with: node -e "require('bcrypt').hash('password', 10).then(console.log)"
  'ADMIN',
  'GENERAL_SECRETARIAT',
  NOW(),
  NOW()
);
EOF
```

### Step 3: Test from Client Applications

1. **Admin Panel:** Try logging in and creating hierarchy levels
2. **Mobile App:** Try signup, login, and accessing chat rooms
3. **Verify:** All features working as expected

---

## Maintenance Commands Reference

### Daily Operations

```bash
# Check status
pm2 status

# View logs
pm2 logs ppbackend

# Restart app
pm2 restart ppbackend

# Check database size
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('ppsudan'));"

# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top
```

### Troubleshooting

```bash
# Server won't start
pm2 logs ppbackend --err
journalctl -xe

# Database connection issues
sudo systemctl status postgresql
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Nginx issues
sudo nginx -t
sudo tail -f /var/log/nginx/error.log

# Permission issues
sudo chown -R ppbackend:ppbackend /path/to/ppBackend
```

---

## Rollback to Clean State

If you need to start over:

```bash
# 1. Stop application
pm2 stop ppbackend
pm2 delete ppbackend

# 2. Drop database
sudo -u postgres psql << EOF
DROP DATABASE ppsudan;
CREATE DATABASE ppsudan OWNER ppbackend;
GRANT ALL PRIVILEGES ON DATABASE ppsudan TO ppbackend;
EOF

# 3. Re-run migrations
cd /path/to/ppBackend
npx prisma generate
npx prisma migrate deploy

# 4. Restart application
pm2 start ecosystem.config.js
pm2 save
```

---

## Security Hardening (Optional)

### 1. Fail2Ban for Brute Force Protection

```bash
sudo apt install -y fail2ban

sudo nano /etc/fail2ban/jail.local
# Add custom rules for your API
```

### 2. Secure PostgreSQL

```bash
# Disable remote access if not needed
sudo nano /etc/postgresql/14/main/postgresql.conf
# Set: listen_addresses = 'localhost'

sudo systemctl restart postgresql
```

### 3. Regular Updates

```bash
# Set up automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## Success!

Your backend is now deployed with:
- ✅ Fresh PostgreSQL database
- ✅ Mobile number E.164 normalization
- ✅ Chat system with Socket.IO
- ✅ Hierarchy management
- ✅ PM2 process management
- ✅ Nginx reverse proxy
- ✅ SSL (if configured)
- ✅ Automated backups
- ✅ Health monitoring

**Next Steps:**
1. Deploy admin panel
2. Deploy mobile app
3. Create initial hierarchy data
4. Invite users to signup

**Support:**
- Full feature documentation: `IMPLEMENTATION_COMPLETE.md`
- Update guide: `UBUNTU_DEPLOYMENT_GUIDE.md`
- Quick reference: `DEPLOYMENT_QUICKSTART.md`

---

**Deployment Date:** _________________  
**Server IP:** _________________  
**Domain:** _________________  
**Database:** ppsudan  
**Admin Email:** _________________

