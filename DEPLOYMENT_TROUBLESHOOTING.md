# Deployment Troubleshooting Guide

## Common Issues and Solutions

This guide addresses issues you may encounter during fresh deployment.

---

## Database Issues

### Issue 1: Cannot connect to PostgreSQL

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# If not running, start it
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check if it's listening
sudo netstat -plnt | grep 5432

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

---

### Issue 2: Authentication failed for user

**Symptoms:**
```
Error: password authentication failed for user "ppbackend"
```

**Solutions:**

```bash
# Reset password
sudo -u postgres psql
ALTER USER ppbackend WITH PASSWORD 'new_password';
\q

# Update .env file
nano .env
# DATABASE_URL="postgresql://ppbackend:new_password@localhost:5432/ppsudan"

# Check pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf
# Ensure this line exists:
# host    ppsudan    ppbackend    127.0.0.1/32    md5

sudo systemctl restart postgresql
```

---

### Issue 3: Database does not exist

**Symptoms:**
```
Error: database "ppsudan" does not exist
```

**Solutions:**

```bash
# Create database
sudo -u postgres psql
CREATE DATABASE ppsudan OWNER ppbackend;
GRANT ALL PRIVILEGES ON DATABASE ppsudan TO ppbackend;
\q

# Verify
psql -U ppbackend -d ppsudan -c "SELECT 1;"
```

---

### Issue 4: Prisma migration fails

**Symptoms:**
```
Error: P1001: Can't reach database server
```

**Solutions:**

```bash
# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Test connection manually
psql -U ppbackend -d ppsudan -h localhost

# Check Prisma schema
npx prisma validate

# Try reset (⚠️ deletes all data)
npx prisma migrate reset --force

# Fresh migration
npx prisma migrate deploy
```

---

## Application Issues

### Issue 5: npm install fails

**Symptoms:**
```
npm ERR! code EACCES
npm ERR! syscall access
```

**Solutions:**

```bash
# Fix npm permissions
sudo chown -R $USER:$USER ~/.npm
sudo chown -R $USER:$USER /path/to/ppBackend

# Clear npm cache
npm cache clean --force

# Try again
rm -rf node_modules package-lock.json
npm install
```

---

### Issue 6: Port 5000 already in use

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solutions:**

```bash
# Find process using port 5000
sudo lsof -i :5000
# OR
sudo netstat -tulpn | grep 5000

# Kill the process
sudo kill -9 <PID>

# Change port in .env if needed
nano .env
# PORT=5001

pm2 restart ppbackend
```

---

### Issue 7: Module not found

**Symptoms:**
```
Error: Cannot find module 'socket.io'
```

**Solutions:**

```bash
# Reinstall dependencies
npm install

# Install missing package specifically
npm install socket.io

# Verify installation
npm list socket.io

# Check node_modules
ls -la node_modules/socket.io
```

---

### Issue 8: Prisma client not generated

**Symptoms:**
```
Error: @prisma/client did not initialize yet
```

**Solutions:**

```bash
# Generate Prisma client
npx prisma generate

# Verify generation
ls -la node_modules/@prisma/client

# If still fails, reinstall
npm uninstall @prisma/client
npm install @prisma/client
npx prisma generate
```

---

## PM2 Issues

### Issue 9: PM2 app won't start

**Symptoms:**
```
pm2 status shows: errored | stopped
```

**Solutions:**

```bash
# Check error logs
pm2 logs ppbackend --err --lines 50

# Delete and restart
pm2 delete ppbackend
pm2 start ecosystem.config.js

# Check for syntax errors
node src/app.js
# Fix any errors shown

# Verify ecosystem.config.js
cat ecosystem.config.js
```

---

### Issue 10: PM2 not starting on boot

**Symptoms:**
After reboot, `pm2 list` shows nothing

**Solutions:**

```bash
# Set up startup script
pm2 startup

# Copy and run the command it outputs
# Usually: sudo env PATH=$PATH:...

# Save current processes
pm2 save

# Test
sudo reboot
# After reboot:
pm2 list
```

---

### Issue 11: PM2 out of memory

**Symptoms:**
```
pm2 status shows very high memory usage
App keeps restarting
```

**Solutions:**

```bash
# Check memory usage
pm2 monit

# Reduce instances in ecosystem.config.js
nano ecosystem.config.js
# Set: instances: 1

# Set memory limit
nano ecosystem.config.js
# Set: max_memory_restart: '500M'

# Restart
pm2 delete ppbackend
pm2 start ecosystem.config.js
pm2 save
```

---

## Nginx Issues

### Issue 12: 502 Bad Gateway

**Symptoms:**
Browser shows "502 Bad Gateway"

**Solutions:**

```bash
# Check if backend is running
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test Nginx config
sudo nginx -t

# Check if backend is accessible
curl http://localhost:5000/health

# Restart both
pm2 restart ppbackend
sudo systemctl restart nginx
```

---

### Issue 13: Nginx config test fails

**Symptoms:**
```
nginx: configuration file /etc/nginx/nginx.conf test failed
```

**Solutions:**

```bash
# Check syntax error location
sudo nginx -t

# Common issues:
# - Missing semicolon
# - Wrong brackets
# - Invalid directive

# Edit config
sudo nano /etc/nginx/sites-available/ppbackend

# Remove config and start fresh if needed
sudo rm /etc/nginx/sites-enabled/ppbackend
sudo nano /etc/nginx/sites-available/ppbackend
# Paste working config from guide

sudo ln -s /etc/nginx/sites-available/ppbackend /etc/nginx/sites-enabled/
sudo nginx -t
```

---

### Issue 14: WebSocket/Socket.IO not working through Nginx

**Symptoms:**
- Chat not working
- Socket.IO connection fails through domain
- Works on localhost but not through Nginx

**Solutions:**

```bash
# Ensure upgrade headers in Nginx config
sudo nano /etc/nginx/sites-available/ppbackend
```

**Add/verify these lines:**
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 3600s;
proxy_send_timeout 3600s;
```

```bash
# Restart Nginx
sudo systemctl restart nginx

# Test WebSocket
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  http://api.yourdomain.com/socket.io/
```

---

## SSL/HTTPS Issues

### Issue 15: Certbot fails

**Symptoms:**
```
The following errors were reported by the server:
Domain: api.yourdomain.com
Type: unauthorized
```

**Solutions:**

```bash
# Ensure domain points to server IP
dig api.yourdomain.com

# Ensure port 80 is open
sudo ufw allow 80/tcp

# Stop Nginx temporarily
sudo systemctl stop nginx

# Try standalone mode
sudo certbot certonly --standalone -d api.yourdomain.com

# Restart Nginx
sudo systemctl start nginx

# Configure SSL manually
sudo nano /etc/nginx/sites-available/ppbackend
# Add SSL config from guide
```

---

### Issue 16: SSL certificate expired

**Symptoms:**
```
SSL certificate verification failed
```

**Solutions:**

```bash
# Check certificate expiry
sudo certbot certificates

# Renew certificates
sudo certbot renew

# Test auto-renewal
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal
```

---

## Firewall Issues

### Issue 17: Cannot access from outside

**Symptoms:**
- Works on localhost
- Doesn't work from external IP/domain

**Solutions:**

```bash
# Check firewall status
sudo ufw status

# Allow necessary ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH - important!

# Check if port is listening externally
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443

# Test from external
curl http://YOUR_SERVER_IP/health
```

---

## Permission Issues

### Issue 18: EACCES permission denied

**Symptoms:**
```
Error: EACCES: permission denied, open '/path/to/file'
```

**Solutions:**

```bash
# Fix ownership
sudo chown -R ppbackend:ppbackend /opt/ppBackend

# Fix specific file permissions
chmod 644 /path/to/file
chmod 755 /path/to/directory

# Fix .env permissions
chmod 600 /opt/ppBackend/.env

# Fix logs directory
mkdir -p /opt/ppBackend/logs
sudo chown -R ppbackend:ppbackend /opt/ppBackend/logs
chmod 755 /opt/ppBackend/logs
```

---

## Mobile Number Issues

### Issue 19: Normalization fails

**Symptoms:**
```
Error: Invalid mobile number format
```

**Solutions:**

```bash
# Test normalization utility
node -e "
const { normalizeMobileNumber } = require('./src/utils/mobileNormalization');
console.log(normalizeMobileNumber('900000001'));
"

# If error, check file exists
ls -la src/utils/mobileNormalization.js

# Check for syntax errors
node src/utils/mobileNormalization.js

# Test different formats
node -e "
const { normalizeMobileNumber } = require('./src/utils/mobileNormalization');
console.log(normalizeMobileNumber('900000001'));      // 9 digits
console.log(normalizeMobileNumber('0900000001'));     // With leading 0
console.log(normalizeMobileNumber('249900000001'));   // With country code
console.log(normalizeMobileNumber('+249900000001'));  // E.164
"
```

---

### Issue 20: Duplicate mobile numbers in database

**Symptoms:**
```
Migration fails with: unique constraint violation
```

**Solutions:**

```bash
# Run normalization script
node normalize-mobile-numbers.js

# This will show duplicates

# Run in LIVE mode to fix
node normalize-mobile-numbers.js --live

# Manually check for duplicates
psql -U ppbackend -d ppsudan << EOF
SELECT "mobileNumber", COUNT(*)
FROM "User"
GROUP BY "mobileNumber"
HAVING COUNT(*) > 1;
EOF

# Fix manually if needed
psql -U ppbackend -d ppsudan
UPDATE "User" SET "mobileNumber" = '+249900000099_disabled' WHERE id = 'USER_ID_TO_DISABLE';
\q

# Then run migration
npx prisma migrate deploy
```

---

## Performance Issues

### Issue 21: High memory usage

**Symptoms:**
- Server becomes slow
- Out of memory errors

**Solutions:**

```bash
# Check memory usage
free -h
pm2 monit

# Reduce PM2 instances
nano ecosystem.config.js
# Set: instances: 1
# Set: max_memory_restart: '500M'

pm2 restart ppbackend

# Check for memory leaks
node --inspect src/app.js
# Use Chrome DevTools for profiling

# Add swap space if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

### Issue 22: Slow database queries

**Symptoms:**
- API responses slow
- Timeouts

**Solutions:**

```bash
# Check PostgreSQL settings
sudo nano /etc/postgresql/14/main/postgresql.conf

# Optimize for your RAM (2GB example):
shared_buffers = 512MB
effective_cache_size = 1536MB
work_mem = 4MB

sudo systemctl restart postgresql

# Analyze slow queries
psql -U ppbackend -d ppsudan
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log queries > 1s
SELECT pg_reload_conf();
\q

# Check slow query log
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Add indexes if needed (already in schema)
```

---

## Socket.IO Issues

### Issue 23: Socket.IO not connecting

**Symptoms:**
```
Socket.IO connection error
Client cannot connect
```

**Solutions:**

```bash
# Check if Socket.IO route is accessible
curl http://localhost:5000/socket.io/
# Should return Socket.IO client code

# Check server logs
pm2 logs ppbackend | grep -i socket

# Test with simple script
cat > test.js << 'EOF'
const io = require('socket.io-client');
const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling']
});
socket.on('connect', () => {
  console.log('Connected!');
  process.exit(0);
});
socket.on('connect_error', (e) => {
  console.log('Error:', e.message);
  process.exit(1);
});
EOF

node test.js
rm test.js

# Check firewall
sudo ufw status
sudo ufw allow 5000/tcp

# Check CORS settings in src/app.js
nano src/app.js
# Ensure origin includes your domain
```

---

## Backup/Restore Issues

### Issue 24: Backup script fails

**Symptoms:**
```
pg_dump: error: connection failed
```

**Solutions:**

```bash
# Test database connection
psql -U ppbackend -d ppsudan -c "SELECT 1;"

# Update backup script with correct credentials
nano backup-db.sh

# Test backup manually
pg_dump -U ppbackend -d ppsudan > test_backup.sql

# Check file was created
ls -lh test_backup.sql

# Set up .pgpass for automatic auth
echo "localhost:5432:ppsudan:ppbackend:your_password" > ~/.pgpass
chmod 600 ~/.pgpass

# Test backup again
./backup-db.sh
```

---

### Issue 25: Restore fails

**Symptoms:**
```
ERROR: must be owner of table User
```

**Solutions:**

```bash
# Drop and recreate database
sudo -u postgres psql << EOF
DROP DATABASE ppsudan;
CREATE DATABASE ppsudan OWNER ppbackend;
GRANT ALL PRIVILEGES ON DATABASE ppsudan TO ppbackend;
EOF

# Restore as database owner
psql -U ppbackend -d ppsudan < backup.sql

# If restore still fails, try as postgres user
sudo -u postgres psql ppsudan < backup.sql

# Then reassign ownership
sudo -u postgres psql ppsudan
REASSIGN OWNED BY postgres TO ppbackend;
\q
```

---

## Diagnostic Commands

### General Health Check

```bash
# Run this script to check everything
cat > healthcheck-full.sh << 'EOF'
#!/bin/bash

echo "=== System Health Check ==="
echo ""

echo "1. Server Resources:"
free -h
df -h | grep -E '^/dev/'
echo ""

echo "2. PostgreSQL:"
sudo systemctl status postgresql | grep Active
psql -U ppbackend -d ppsudan -c "SELECT COUNT(*) as users FROM \"User\";" 2>&1
echo ""

echo "3. Application:"
pm2 status
curl -s http://localhost:5000/health || echo "Health check failed"
echo ""

echo "4. Nginx:"
sudo systemctl status nginx | grep Active
sudo nginx -t 2>&1
echo ""

echo "5. Firewall:"
sudo ufw status | head -5
echo ""

echo "6. Disk Space:"
du -sh /opt/ppBackend
du -sh /var/lib/postgresql
echo ""

echo "7. Last 10 Error Logs:"
pm2 logs ppbackend --err --lines 10 --nostream 2>&1
EOF

chmod +x healthcheck-full.sh
./healthcheck-full.sh
```

---

## Getting Help

### Gather Information

Before asking for help, gather this information:

```bash
# System info
uname -a
lsb_release -a

# Application versions
node --version
npm --version
pm2 --version
psql --version

# Application logs
pm2 logs ppbackend --lines 100 --nostream > app-logs.txt

# Nginx logs
sudo tail -100 /var/log/nginx/error.log > nginx-logs.txt

# PostgreSQL logs
sudo tail -100 /var/log/postgresql/postgresql-14-main.log > pg-logs.txt

# Configuration
cat .env | sed 's/=.*/=REDACTED/' > env-config.txt
cat ecosystem.config.js > pm2-config.txt

# Create support bundle
tar -czf support-bundle.tar.gz \
  app-logs.txt \
  nginx-logs.txt \
  pg-logs.txt \
  env-config.txt \
  pm2-config.txt

# Clean up
rm app-logs.txt nginx-logs.txt pg-logs.txt env-config.txt pm2-config.txt
```

### Support Channels

1. Check documentation: `FRESH_DEPLOYMENT_GUIDE.md`
2. Review implementation: `IMPLEMENTATION_COMPLETE.md`
3. Search error messages online
4. Contact system administrator
5. Open GitHub issue with support bundle

---

## Quick Reference: Working Configuration

### Minimal Working .env

```env
DATABASE_URL="postgresql://ppbackend:password@localhost:5432/ppsudan"
JWT_SECRET="long-random-string-minimum-32-characters"
JWT_REFRESH_SECRET="another-long-random-string-32-chars"
PORT=5000
NODE_ENV=production
```

### Minimal Working ecosystem.config.js

```javascript
module.exports = {
  apps: [{
    name: 'ppbackend',
    script: 'src/app.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    env: { NODE_ENV: 'production' }
  }]
};
```

### Minimal Working Nginx Config

```nginx
upstream ppbackend {
    server 127.0.0.1:5000;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://ppbackend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

---

**Last Updated:** 2024
**For Full Guide:** See `FRESH_DEPLOYMENT_GUIDE.md`

