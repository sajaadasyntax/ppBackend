# Fresh Deployment Checklist

## Quick Reference Card

Print this page and check off items as you complete them.

---

## Pre-Deployment

- [ ] Ubuntu server 20.04+ with sudo access
- [ ] Domain name configured (if using)
- [ ] SSH access verified
- [ ] At least 2GB RAM available
- [ ] At least 20GB disk space available

---

## System Setup (15 min)

- [ ] `sudo apt update && sudo apt upgrade -y`
- [ ] Install Node.js 18 LTS
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt install -y nodejs
  ```
- [ ] Install PostgreSQL 14
  ```bash
  sudo apt install -y postgresql postgresql-contrib
  ```
- [ ] Install PM2
  ```bash
  sudo npm install -g pm2
  pm2 startup
  ```
- [ ] Install Git (if needed)
  ```bash
  sudo apt install -y git
  ```

---

## Database Setup (10 min)

- [ ] Create database user
  ```bash
  sudo -u postgres psql
  CREATE USER ppbackend WITH PASSWORD 'secure_password';
  CREATE DATABASE ppsudan OWNER ppbackend;
  GRANT ALL PRIVILEGES ON DATABASE ppsudan TO ppbackend;
  \q
  ```
- [ ] Test connection
  ```bash
  psql -U ppbackend -d ppsudan -h localhost
  ```

---

## Application Setup (15 min)

- [ ] Clone repository
  ```bash
  cd /opt
  git clone <repository-url>
  cd ppBackend
  ```
- [ ] Install dependencies
  ```bash
  npm install
  ```
- [ ] Create `.env` file
  ```env
  DATABASE_URL="postgresql://ppbackend:password@localhost:5432/ppsudan"
  JWT_SECRET="<generate-random-32-chars>"
  JWT_REFRESH_SECRET="<generate-random-32-chars>"
  PORT=5000
  NODE_ENV=production
  ```
- [ ] Generate Prisma client
  ```bash
  npx prisma generate
  ```
- [ ] Run migrations
  ```bash
  npx prisma migrate deploy
  ```

---

## Initial Data (5 min)

- [ ] Create admin user (run seed or manual SQL)
- [ ] Test mobile normalization
  ```bash
  node -e "require('./src/utils/mobileNormalization').normalizeMobileNumber('900000001')"
  ```
- [ ] Verify database tables exist
  ```bash
  npx prisma studio
  ```

---

## Start Application (5 min)

- [ ] Create PM2 config (ecosystem.config.js)
- [ ] Start with PM2
  ```bash
  pm2 start ecosystem.config.js
  pm2 save
  ```
- [ ] Check status
  ```bash
  pm2 status
  pm2 logs ppbackend --lines 50
  ```

---

## Configure Nginx (10 min)

- [ ] Install Nginx
  ```bash
  sudo apt install -y nginx
  ```
- [ ] Create site config
  ```bash
  sudo nano /etc/nginx/sites-available/ppbackend
  ```
- [ ] Enable site
  ```bash
  sudo ln -s /etc/nginx/sites-available/ppbackend /etc/nginx/sites-enabled/
  sudo nginx -t
  sudo systemctl reload nginx
  ```
- [ ] Configure SSL (optional)
  ```bash
  sudo certbot --nginx -d api.yourdomain.com
  ```

---

## Security (10 min)

- [ ] Configure firewall
  ```bash
  sudo ufw allow 22
  sudo ufw allow 80
  sudo ufw allow 443
  sudo ufw enable
  ```
- [ ] Set file permissions
  ```bash
  chmod 600 .env
  sudo chown -R ppbackend:ppbackend /opt/ppBackend
  ```
- [ ] Secure PostgreSQL
  ```bash
  sudo nano /etc/postgresql/14/main/pg_hba.conf
  # Verify only localhost connections
  ```

---

## Backups (5 min)

- [ ] Create backup script
- [ ] Test backup
  ```bash
  ./backup-db.sh
  ```
- [ ] Schedule daily backups
  ```bash
  crontab -e
  # 0 2 * * * /path/to/backup-db.sh >> /path/to/logs/backup.log 2>&1
  ```

---

## Testing (10 min)

- [ ] Health check
  ```bash
  curl http://localhost:5000/health
  ```
- [ ] Database status
  ```bash
  curl http://localhost:5000/api/status
  ```
- [ ] Create test user
  ```bash
  curl -X POST http://localhost:5000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","mobileNumber":"+249900000002","password":"test123"}'
  ```
- [ ] Test duplicate mobile rejection
- [ ] Test Socket.IO connection
- [ ] Test through Nginx
  ```bash
  curl https://api.yourdomain.com/health
  ```

---

## Monitoring (5 min)

- [ ] Set up log rotation
- [ ] Create health check cron job
- [ ] Configure PM2 monitoring
  ```bash
  pm2 monit
  ```

---

## Documentation (5 min)

- [ ] Document server credentials
- [ ] Document database credentials
- [ ] Document admin user credentials
- [ ] Save this checklist with completion date

---

## Final Verification

- [ ] PM2 running: `pm2 list`
- [ ] No errors in logs: `pm2 logs ppbackend --lines 100`
- [ ] Database accessible: `psql -U ppbackend -d ppsudan -c "SELECT 1;"`
- [ ] Nginx running: `sudo systemctl status nginx`
- [ ] SSL valid (if configured): `curl https://api.yourdomain.com/health`
- [ ] Firewall active: `sudo ufw status`
- [ ] Backups scheduled: `crontab -l`
- [ ] Admin panel can connect
- [ ] Mobile app can connect

---

## Post-Deployment

- [ ] Update admin panel API URL
- [ ] Update mobile app API URL
- [ ] Create initial hierarchy data (regions, localities)
- [ ] Create admin accounts for team
- [ ] Test complete user flow (signup → login → chat)
- [ ] Monitor for 24 hours

---

## Rollback Plan

If issues occur:

1. Stop app: `pm2 stop ppbackend`
2. Restore DB: `psql -U ppbackend -d ppsudan < backup.sql`
3. Revert code: `git reset --hard COMMIT_HASH`
4. Reinstall: `npm install && npx prisma generate`
5. Restart: `pm2 restart ppbackend`

---

## Emergency Contacts

- **System Admin:** _________________
- **Database Admin:** _________________
- **Dev Team Lead:** _________________
- **Hosting Provider:** _________________

---

## Server Information

**Deployment Date:** _________________  
**Server IP:** _________________  
**Domain:** _________________  
**Database Name:** ppsudan  
**Database User:** ppbackend  
**Application User:** ppbackend  
**PM2 Process Name:** ppbackend  
**Nginx Config:** /etc/nginx/sites-available/ppbackend  
**Application Path:** /opt/ppBackend  
**Logs Path:** /opt/ppBackend/logs  
**Backup Path:** /home/ppbackend/backups  

---

## Useful Commands

```bash
# Status
pm2 status
pm2 logs ppbackend
sudo systemctl status nginx
sudo systemctl status postgresql

# Restart
pm2 restart ppbackend
sudo systemctl restart nginx
sudo systemctl restart postgresql

# Logs
pm2 logs ppbackend --lines 100
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Database
psql -U ppbackend -d ppsudan
pg_dump -U ppbackend -d ppsudan > backup.sql

# Disk space
df -h
du -sh /opt/ppBackend
du -sh /var/lib/postgresql

# Memory
free -h
pm2 monit
```

---

**Completed by:** _________________  
**Date:** _________________  
**Signature:** _________________

