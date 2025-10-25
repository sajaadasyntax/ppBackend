const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const contentRoutes = require('./routes/contentRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const hierarchyRoutes = require('./routes/hierarchyRoutes');
const adminHierarchyRoutes = require('./routes/adminHierarchyRoutes');
const hierarchyManagementRoutes = require('./routes/hierarchyManagementRoutes');
const hierarchicalUserRoutes = require('./routes/hierarchicalUserRoutes');
const expatriateHierarchyRoutes = require('./routes/expatriateHierarchyRoutes');
const sectorHierarchyRoutes = require('./routes/sectorHierarchyRoutes');
const adminRoutes = require('./routes/adminRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const publicRoutes = require('./routes/publicRoutes');
const chatRoutes = require('./routes/chatRoutes');
// const debugRoutes = require('./routes/debugRoutes'); // Removed - no longer needed

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// CORS configuration - Allow specific origins with credentials
const allowedOrigins = [
  'https://ppsudan.org',
  'https://admin.ppsudan.org',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:19006', // Expo web
  'exp://192.168.1.1:8081', // Expo Go (adjust IP as needed)
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`Blocked origin: ${origin}`);
      callback(null, true); // Still allow but log it
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Enable credentials for authentication
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
app.use('/api/hierarchical', hierarchicalUserRoutes);
app.use('/api/hierarchical-users', hierarchicalUserRoutes); // Alias for frontend compatibility
app.use('/api/expatriate-hierarchy', expatriateHierarchyRoutes);
app.use('/api/sector-hierarchy', sectorHierarchyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/chat', chatRoutes);
// app.use('/api/debug', debugRoutes); // Removed - no longer needed

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

// Setup Socket.IO with same CORS settings
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Still allow but log it
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.IO authentication middleware
const { verifyAccessToken } = require('./utils/auth');
const prisma = require('./utils/prisma');

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return next(new Error('Authentication error: Invalid token'));
  }

  socket.userId = decoded.id;
  socket.user = decoded;
  next();
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId}`);

  // Join chat rooms
  socket.on('join_room', async (roomId) => {
    try {
      // Verify user is a member of this room
      const membership = await prisma.chatMembership.findUnique({
        where: {
          roomId_userId: {
            roomId,
            userId: socket.userId
          }
        }
      });

      if (!membership) {
        socket.emit('error', { message: 'Not a member of this room' });
        return;
      }

      socket.join(roomId);
      console.log(`User ${socket.userId} joined room ${roomId}`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Leave chat room
  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    console.log(`User ${socket.userId} left room ${roomId}`);
  });

  // Handle new message
  socket.on('send_message', async ({ roomId, text }) => {
    try {
      // Verify membership
      const membership = await prisma.chatMembership.findUnique({
        where: {
          roomId_userId: {
            roomId,
            userId: socket.userId
          }
        }
      });

      if (!membership) {
        socket.emit('error', { message: 'Not a member of this room' });
        return;
      }

      // Create message
      const message = await prisma.chatMessage.create({
        data: {
          roomId,
          senderId: socket.userId,
          text: text.trim()
        },
        include: {
          sender: {
            select: {
              id: true,
              memberDetails: {
                select: {
                  fullName: true
                }
              }
            }
          }
        }
      });

      // Update room's updatedAt
      await prisma.chatRoom.update({
        where: { id: roomId },
        data: { updatedAt: new Date() }
      });

      // Broadcast to all members in the room
      io.to(roomId).emit('new_message', message);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
  });
});

// Make io available to routes if needed
app.set('io', io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO enabled on port ${PORT}`);
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