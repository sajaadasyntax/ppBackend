const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const contentRoutes = require('./routes/contentRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const hierarchyRoutes = require('./routes/hierarchyRoutes');
const adminHierarchyRoutes = require('./routes/adminHierarchyRoutes');
const hierarchyManagementRoutes = require('./routes/hierarchyManagementRoutes');
const debugRoutes = require('./routes/debugRoutes');

// Create Express app
const app = express();

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 hours
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files from the public directory

// Add detailed request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Generate request ID
  const requestId = Math.random().toString(36).substring(2, 10);
  
  // Log basic request info
  console.log(`[${requestId}] ${new Date().toISOString()} ${req.method} ${req.url}`);
  
  // Log request headers and body for non-GET requests (excluding file uploads)
  if (req.method !== 'GET') {
    if (req.headers['content-type'] && !req.headers['content-type'].includes('multipart/form-data')) {
      console.log(`[${requestId}] Request Body:`, req.body);
    } else {
      console.log(`[${requestId}] Request with multipart form data or binary content`);
    }
  }
  
  // Log request headers for debugging authentication issues
  if (req.url.includes('/auth/')) {
    console.log(`[${requestId}] Auth request headers:`, req.headers);
  }
  
  // Intercept and log the response
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - start;
    
    // Log response status and time
    console.log(`[${requestId}] Response ${res.statusCode} (${duration}ms)`);
    
    // For error responses or auth endpoints, log more details
    if (res.statusCode >= 400 || req.url.includes('/auth/')) {
      try {
        // Only parse and log if it's JSON and not a file
        if (typeof body === 'string' && body.startsWith('{')) {
          const parsed = JSON.parse(body);
          
          // Redact sensitive information
          if (parsed.token) parsed.token = '[REDACTED]';
          if (parsed.refreshToken) parsed.refreshToken = '[REDACTED]';
          if (parsed.password) parsed.password = '[REDACTED]';
          
          console.log(`[${requestId}] Response body:`, parsed);
        }
      } catch (e) {
        // Not JSON or can't be parsed
        console.log(`[${requestId}] Non-JSON response or parse error`);
      }
    }
    
    // Call the original send method
    return originalSend.call(this, body);
  };
  
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/hierarchy', hierarchyRoutes);
app.use('/api/admin/hierarchy', adminHierarchyRoutes);
app.use('/api/hierarchy-management', hierarchyManagementRoutes);
app.use('/api/debug', debugRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Not found handler
app.use((req, res, next) => {
  console.log('404 Not Found:', req.method, req.url);
  res.status(404).json({ error: 'Not found' });
});

// Import error handler
const errorHandler = require('./middlewares/errorHandler');

// Error handler
app.use(errorHandler);

// Add DB connection status endpoint
app.get('/api/status', (req, res) => {
  const prisma = require('./utils/prisma');
  
  // Check if we can perform a simple query
  prisma.$queryRaw`SELECT 1 as result`
    .then(() => {
      res.status(200).json({ 
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    })
    .catch(err => {
      res.status(503).json({
        status: 'error',
        database: 'disconnected',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
    // Close other resources like database connections
    process.exit(0);
  });
  
  // Force close after 10s
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
});

module.exports = app; 