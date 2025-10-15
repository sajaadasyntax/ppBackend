# Quick Deployment Reference

## Fast Track (Experienced Admins)

```bash
# 1. SSH and navigate
ssh user@server
cd /path/to/ppBackend

# 2. Backup database
pg_dump -U postgres -d dbname > ~/backups/backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Pull code
git pull origin main

# 4. Install dependencies
npm install

# 5. Run mobile normalization (DRY RUN first!)
node normalize-mobile-numbers.js
# Review output, then:
node normalize-mobile-numbers.js --live

# 6. Generate Prisma client and migrate
npx prisma generate
npx prisma migrate dev --name add-chat-and-normalize-mobile

# 7. Restart server
pm2 restart ppbackend
pm2 logs ppbackend --lines 50

# 8. Verify
curl http://localhost:5000/health
curl http://localhost:5000/api/status
```

## Key Files Changed

```
src/
├── app.js                           # Socket.IO integration
├── controllers/
│   ├── authController.js            # Mobile normalization on login
│   └── chatController.js            # NEW - Chat endpoints
├── routes/
│   └── chatRoutes.js                # NEW - Chat routes
├── services/
│   └── userService.js               # Duplicate mobile check
├── middlewares/
│   └── auth.js                      # Added requireAdmin
└── utils/
    └── mobileNormalization.js       # NEW - E.164 utility

prisma/
└── schema.prisma                    # Chat models, mobile index

normalize-mobile-numbers.js          # NEW - Migration script
package.json                         # Added socket.io
```

## Critical Checks

| Check | Command | Expected |
|-------|---------|----------|
| Server running | `pm2 status` | `online` |
| Socket.IO loaded | `npm list socket.io` | `socket.io@4.7.2` |
| Health endpoint | `curl localhost:5000/health` | `{"status":"ok"}` |
| DB connection | `curl localhost:5000/api/status` | `"database":"connected"` |
| Chat tables | `npx prisma studio` | ChatRoom, ChatMembership, ChatMessage visible |

## Rollback (Emergency)

```bash
# 1. Stop server
pm2 stop ppbackend

# 2. Restore database
psql -U postgres -d dbname < ~/backups/backup_LATEST.sql

# 3. Revert code
git reset --hard HEAD~1

# 4. Reinstall and restart
npm install
npx prisma generate
pm2 restart ppbackend
```

## Common Issues

**Port in use:**
```bash
lsof -i :5000
kill -9 PID
pm2 restart ppbackend
```

**Migration fails:**
```bash
node normalize-mobile-numbers.js --live
npx prisma migrate dev --name add-chat-and-normalize-mobile
```

**Socket.IO not connecting:**
```bash
# Check firewall
sudo ufw allow 5000/tcp

# Check port listening
netstat -tulpn | grep 5000
```

## Environment Variables Required

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
PORT=5000
```

## Post-Deployment Tests

```bash
# 1. Health check
curl http://localhost:5000/health

# 2. Mobile uniqueness test
node -e "
const { normalizeMobileNumber } = require('./src/utils/mobileNormalization');
console.log(normalizeMobileNumber('900000001'));
"
# Expected: +249900000001

# 3. Chat endpoints (with auth token)
TOKEN="your-jwt-token"
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/chat/chatrooms
```

## Monitoring Commands

```bash
# Real-time logs
pm2 logs ppbackend

# Memory usage
pm2 monit

# Process info
pm2 info ppbackend

# Restart
pm2 restart ppbackend
```

## Support

Full guide: `UBUNTU_DEPLOYMENT_GUIDE.md`
Implementation details: `../IMPLEMENTATION_COMPLETE.md`

