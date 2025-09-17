# PP Application Setup Guide for Windows

This guide will help you set up the PP application on Windows with a local PostgreSQL database.

## Prerequisites

- Windows 10/11
- Node.js (LTS version)
- PostgreSQL
- Git (optional)

## Step 1: Install PostgreSQL on Windows

### 1.1 Download PostgreSQL
1. Go to [PostgreSQL Downloads](https://www.postgresql.org/download/windows/)
2. Download the latest version (15.x or 16.x)
3. Run the installer as Administrator

### 1.2 Installation Steps
1. **Setup Wizard**: Click "Next"
2. **Installation Directory**: Keep default or choose your preferred location
3. **Select Components**: Keep all components selected
4. **Data Directory**: Keep default location
5. **Password**: Set a password for the `postgres` superuser (remember this!)
6. **Port**: Keep default port 5432
7. **Locale**: Keep default
8. **Pre Installation Summary**: Click "Next"
9. **Ready to Install**: Click "Next"
10. **Installing**: Wait for installation to complete
11. **Completing**: Uncheck "Stack Builder" and click "Finish"

### 1.3 Verify Installation
1. Open Command Prompt as Administrator
2. Navigate to PostgreSQL bin directory (usually `C:\Program Files\PostgreSQL\16\bin`)
3. Run: `psql --version`

## Step 2: Create Database and User

### 2.1 Open pgAdmin or Command Line
**Option A: Using pgAdmin (GUI)**
1. Open pgAdmin from Start Menu
2. Connect to PostgreSQL server using your password
3. Right-click "Databases" → "Create" → "Database"
4. Name: `pp_database`
5. Click "Save"

**Option B: Using Command Line**
```cmd
# Open Command Prompt as Administrator
# Navigate to PostgreSQL bin directory
cd "C:\Program Files\PostgreSQL\16\bin"

# Connect to PostgreSQL
psql -U postgres

# Create database and user
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
```

## Step 3: Setup Environment Variables

### 3.1 Create .env File
Create a `.env` file in the `ppBackend` directory with the following content:

```env
# Database Configuration
DATABASE_URL="postgresql://pp_user:pp_password_2024@localhost:5432/pp_database?schema=public"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-jwt-key-change-this-in-production"

# Server Configuration
PORT=5000
NODE_ENV="development"

# CORS Configuration
FRONTEND_URL="http://localhost:3000"

# File Upload Configuration
UPLOAD_DIR="./public/uploads"
MAX_FILE_SIZE="10485760"

# Admin Configuration
ADMIN_EMAIL="admin@pp.com"
ADMIN_PASSWORD="admin123"

# API Configuration
API_BASE_URL="http://localhost:5000"
```

## Step 4: Install Dependencies and Setup Database

### 4.1 Install Dependencies
```cmd
cd ppBackend
npm install
```

### 4.2 Generate Prisma Client
```cmd
npx prisma generate
```

### 4.3 Run Database Migrations
```cmd
npx prisma migrate dev --name init
```

### 4.4 Seed the Database
```cmd
npm run seed
```

## Step 5: Test the Setup

### 5.1 Start the Backend Server
```cmd
npm start
```

### 5.2 Test API Endpoints
Open another Command Prompt and test:
```cmd
curl http://localhost:5000/health
curl http://localhost:5000/api/status
```

### 5.3 Test Database Connection
```cmd
# Using psql
psql -h localhost -U pp_user -d pp_database -c "SELECT COUNT(*) FROM \"User\";"
```

## Step 6: Setup Frontend Applications

### 6.1 Mobile App (React Native/Expo)
```cmd
cd ../new-expo-project
npm install
npm start
```

### 6.2 Web App (Next.js)
```cmd
cd ../ppWeb/ppweb
npm install
npm run dev
```

### 6.3 Admin Panel (Next.js)
```cmd
cd ../ppAdmin/pp-admin
npm install
npm run dev
```

## Step 7: Update API URLs

Make sure all frontend applications are pointing to the correct backend URL:

### 7.1 Mobile App
Update `new-expo-project/services/api.ts`:
```typescript
const API_BASE_URL = "http://localhost:5000";
```

### 7.2 Web App
Update `ppWeb/ppweb/context/apiContext.ts`:
```typescript
const API_BASE_URL = "http://localhost:5000";
```

### 7.3 Admin Panel
Update `ppAdmin/pp-admin/app/context/apiContext.ts`:
```typescript
const API_BASE_URL = "http://localhost:5000";
```

## Step 8: Test Complete System

### 8.1 Test Login with Mobile Numbers
1. **Admin Panel**: Use `+249123456789` / `admin123`
2. **Mobile/Web App**: Use `116461085` / `116461085`

### 8.2 Test Hierarchical Management
1. Login to admin panel
2. Check that you can only see users within your jurisdiction
3. Test creating content and verify it's properly targeted

## Troubleshooting

### Common Issues

1. **PostgreSQL Connection Error**
   - Check if PostgreSQL service is running: `services.msc` → PostgreSQL
   - Verify credentials in `.env` file
   - Check if port 5432 is available

2. **Port Already in Use**
   - Change PORT in `.env` file
   - Kill process using the port: `netstat -ano | findstr :5000`

3. **Permission Denied**
   - Run Command Prompt as Administrator
   - Check file permissions

4. **Database Migration Errors**
   - Drop and recreate database
   - Check if all required tables exist

### Useful Commands

```cmd
# Check PostgreSQL service status
sc query postgresql-x64-16

# Start PostgreSQL service
net start postgresql-x64-16

# Stop PostgreSQL service
net stop postgresql-x64-16

# Check if port is in use
netstat -ano | findstr :5432
netstat -ano | findstr :5000
```

## Next Steps for Linux Deployment

When you're ready to deploy to Linux, follow the `DEPLOYMENT.md` guide which includes:
- Ubuntu server setup
- PostgreSQL installation
- PM2 process management
- Nginx configuration
- SSL certificate setup
- Monitoring and maintenance

## Development Workflow

1. **Start Backend**: `cd ppBackend && npm start`
2. **Start Web App**: `cd ppWeb/ppweb && npm run dev`
3. **Start Admin Panel**: `cd ppAdmin/pp-admin && npm run dev`
4. **Start Mobile App**: `cd new-expo-project && npm start`

All applications will be available at:
- Backend API: http://localhost:5000
- Web App: http://localhost:3000
- Admin Panel: http://localhost:3001
- Mobile App: Expo development server
