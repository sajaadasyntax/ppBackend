# PP Application Deployment Guide for Ubuntu Server

This guide will help you deploy the PP application to your Ubuntu server with a local PostgreSQL database.

## Prerequisites

- Ubuntu 20.04 LTS or later
- Root or sudo access
- Internet connection

## Step 1: Server Setup

### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Node.js (LTS version)
```bash
# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 1.3 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

## Step 2: Database Setup

### 2.1 Run Database Setup Script
```bash
# Make the script executable
chmod +x setup-database.sh

# Run the database setup
./setup-database.sh
```

### 2.2 Manual Database Setup (Alternative)
If the script doesn't work, follow these manual steps:

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE pp_database;
CREATE USER pp_user WITH PASSWORD 'pp_password_2024';
GRANT ALL PRIVILEGES ON DATABASE pp_database TO pp_user;
\c pp_database;
GRANT ALL ON SCHEMA public TO pp_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pp_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO pp_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO pp_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO pp_user;
\q
EOF
```

## Step 3: Application Setup

### 3.1 Clone and Setup Application
```bash
# Navigate to your project directory
cd /path/to/your/project

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### 3.2 Configure Environment Variables
Edit the `.env` file with your database credentials:

```env
# Database Configuration
DATABASE_URL="postgresql://pp_user:pp_password_2024@localhost:5432/pp_database?schema=public"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-jwt-key-change-this-in-production"

# Server Configuration
PORT=5000
NODE_ENV="production"

# CORS Configuration
FRONTEND_URL="http://your-server-ip:3000"

# File Upload Configuration
UPLOAD_DIR="./public/uploads"
MAX_FILE_SIZE="10485760"

# Admin Configuration
ADMIN_EMAIL="admin@pp.com"
ADMIN_PASSWORD="admin123"

# API Configuration
API_BASE_URL="http://your-server-ip:5000"
```

### 3.3 Database Migration and Seeding
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed the database
npm run seed
```

## Step 4: Frontend Applications Setup

### 4.1 Mobile App (React Native/Expo)
```bash
cd ../new-expo-project
npm install

# Update API URL in services/api.ts
# Change API_BASE_URL to your server IP
```

### 4.2 Web App (Next.js)
```bash
cd ../ppWeb/ppweb
npm install

# Update API URL in context/apiContext.ts
# Change API_BASE_URL to your server IP
```

### 4.3 Admin Panel (Next.js)
```bash
cd ../ppAdmin/pp-admin
npm install

# Update API URL in context/apiContext.ts
# Change API_BASE_URL to your server IP
```

## Step 5: Production Deployment

### 5.1 Build Applications
```bash
# Build Web App
cd ../ppWeb/ppweb
npm run build

# Build Admin Panel
cd ../ppAdmin/pp-admin
npm run build
```

### 5.2 Start Backend with PM2
```bash
cd ../ppBackend

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'pp-backend',
    script: 'src/app.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF

# Create logs directory
mkdir -p logs

# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 5.3 Setup Nginx (Optional)
```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/pp-app << EOF
server {
    listen 80;
    server_name your-domain.com;

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Web App
    location / {
        root /path/to/ppWeb/ppweb/out;
        try_files \$uri \$uri.html \$uri/index.html /index.html;
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/pp-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 6: SSL Certificate (Optional)

### 6.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 6.2 Get SSL Certificate
```bash
sudo certbot --nginx -d your-domain.com
```

## Step 7: Monitoring and Maintenance

### 7.1 PM2 Commands
```bash
# View running processes
pm2 list

# View logs
pm2 logs pp-backend

# Restart application
pm2 restart pp-backend

# Stop application
pm2 stop pp-backend

# Monitor resources
pm2 monit
```

### 7.2 Database Backup
```bash
# Create backup script
cat > backup-database.sh << EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U pp_user -d pp_database > backup_pp_database_\$DATE.sql
echo "Database backed up to backup_pp_database_\$DATE.sql"
EOF

chmod +x backup-database.sh

# Schedule daily backups
echo "0 2 * * * /path/to/backup-database.sh" | crontab -
```

## Step 8: Testing

### 8.1 Test Backend API
```bash
curl http://localhost:5000/health
curl http://localhost:5000/api/status
```

### 8.2 Test Database Connection
```bash
PGPASSWORD=pp_password_2024 psql -h localhost -U pp_user -d pp_database -c "SELECT COUNT(*) FROM \"User\";"
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check if PostgreSQL is running: `sudo systemctl status postgresql`
   - Verify credentials in `.env` file
   - Check firewall settings

2. **Port Already in Use**
   - Change PORT in `.env` file
   - Kill process using the port: `sudo lsof -ti:5000 | xargs kill -9`

3. **Permission Denied**
   - Check file permissions: `chmod +x setup-database.sh`
   - Run with sudo if needed

4. **PM2 Issues**
   - Check logs: `pm2 logs pp-backend`
   - Restart PM2: `pm2 kill && pm2 start ecosystem.config.js`

## Security Considerations

1. **Change Default Passwords**
   - Update database password
   - Update JWT secrets
   - Update admin credentials

2. **Firewall Configuration**
   ```bash
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   sudo ufw allow 5000  # Backend API
   sudo ufw enable
   ```

3. **Regular Updates**
   ```bash
   sudo apt update && sudo apt upgrade -y
   npm update
   ```

## Support

If you encounter any issues during deployment, check:
1. Application logs: `pm2 logs pp-backend`
2. System logs: `sudo journalctl -u postgresql`
3. Nginx logs: `sudo tail -f /var/log/nginx/error.log`

For additional help, refer to the application documentation or contact the development team.
