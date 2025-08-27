# PP Backend API

Backend API for managing mobile app and admin panel using Node.js, Express, Prisma, and PostgreSQL with NeonDB.

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   DATABASE_URL="postgresql://user:password@db.neon.tech/ppdb?sslmode=require"
   JWT_SECRET="your-jwt-secret-key"
   JWT_REFRESH_SECRET="your-jwt-refresh-secret-key"
   PORT=3000
   ```
4. Update the `DATABASE_URL` with your NeonDB connection string

## NeonDB Setup

1. Create a NeonDB account at [https://neon.tech](https://neon.tech)
2. Create a new project
3. Create a new database named `ppdb`
4. Get the connection string from the dashboard
5. Update the `DATABASE_URL` in your `.env` file
6. Make sure to replace `user:password` with your actual credentials

## Database Setup

1. Run Prisma migrations:
   ```
   npm run migrate
   ```
2. Generate Prisma client:
   ```
   npm run generate
   ```
3. Seed the database with initial data (optional):
   ```
   npm run seed
   ```
4. Or run the setup script for demonstration purposes:
   ```
   npm run setup
   ```

## Running the Application

Development mode:
```
npm run dev
```

Production mode:
```
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users/profile` - Get current user profile (requires authentication)
- `GET /api/users` - Get all users (requires admin role)
- `GET /api/users/:id` - Get user by ID (requires admin role)
- `POST /api/users` - Create a new user (requires admin role)
- `PUT /api/users/:id` - Update user (requires admin role)
- `DELETE /api/users/:id` - Delete user (requires admin role)

### Content
- `GET /api/content/public` - Get all published content (public)
- `GET /api/content/public/:id` - Get published content by ID (public)
- `GET /api/content` - Get all content (requires admin role)
- `GET /api/content/:id` - Get content by ID (requires admin role)
- `POST /api/content` - Create content (requires admin role)
- `PUT /api/content/:id` - Update content (requires admin role)
- `DELETE /api/content/:id` - Delete content (requires admin role)
- `PATCH /api/content/:id/publish` - Publish/unpublish content (requires admin role)

### Settings
- `GET /api/settings/public` - Get public settings (public)
- `GET /api/settings` - Get all settings (requires admin role)
- `GET /api/settings/:key` - Get setting by key (requires admin role)
- `PUT /api/settings/:key` - Update setting (requires admin role)
- `DELETE /api/settings/:key` - Delete setting (requires admin role)
- `POST /api/settings/bulk` - Bulk update settings (requires admin role)

## Test Credentials (after running setup)

- Admin: `admin@example.com` / `admin123`
- User: `user@example.com` / `user123`

## Database Schema

### User
- id (UUID)
- email (String, unique)
- password (String, hashed)
- role (Enum: USER, ADMIN)
- createdAt (DateTime)
- updatedAt (DateTime)

### Profile
- id (UUID)
- userId (UUID, unique)
- firstName (String, optional)
- lastName (String, optional)
- phoneNumber (String, optional)
- avatarUrl (String, optional)
- createdAt (DateTime)
- updatedAt (DateTime)

### RefreshToken
- id (UUID)
- token (String, unique)
- userId (UUID)
- expiresAt (DateTime)
- createdAt (DateTime)

### Content
- id (UUID)
- title (String)
- description (String, optional)
- body (String, optional)
- published (Boolean, default: false)
- createdAt (DateTime)
- updatedAt (DateTime)

### Settings
- id (UUID)
- key (String, unique)
- value (String)
- createdAt (DateTime)
- updatedAt (DateTime) 