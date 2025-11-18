import { PrismaClient } from '@prisma/client';
// import * as fs from 'fs'; // Reserved for future use
// import * as path from 'path'; // Reserved for future use

// Check if SQLite database file exists
// const sqliteDbPath = path.join(__dirname, '../../prisma/dev.db'); // Reserved for future use
// const sqliteExists = fs.existsSync(sqliteDbPath); // Reserved for future use

// Create Prisma client with connection retry logic and fallback mechanism
const prisma = new PrismaClient({
  log: ['warn', 'error'],
  errorFormat: 'pretty',
});

// Connection management
let isConnected = false;
let retryCount = 0;
const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000; // 5 seconds

// Function to initialize DB connection with retry
async function connectWithRetry(): Promise<void> {
  try {
    if (!isConnected) {
      // Test the connection
      await prisma.$connect();
      isConnected = true;
      retryCount = 0;
      console.log('Database connection established successfully');
    }
  } catch (error: any) {
    isConnected = false;
    retryCount++;
    
    console.error(`Database connection failed (attempt ${retryCount}/${MAX_RETRIES}):`, error.message);
    
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying connection in ${RETRY_INTERVAL / 1000} seconds...`);
      setTimeout(connectWithRetry, RETRY_INTERVAL);
    } else {
      console.error('Max retry attempts reached. Please check your database configuration.');
      // Continue without crashing - operations will fail gracefully
    }
  }
}

// Monitor connection state with heartbeat
setInterval(async () => {
  try {
    if (isConnected) {
      // Simple query to test connection
      await prisma.$queryRaw`SELECT 1 as result`;
    } else if (retryCount < MAX_RETRIES) {
      // Try to reconnect if not connected
      connectWithRetry();
    }
  } catch (error: any) {
    console.error('Connection heartbeat failed:', error.message);
    isConnected = false;
    
    // Attempt to reconnect
    if (retryCount < MAX_RETRIES) {
      connectWithRetry();
    }
  }
}, 30000); // Check every 30 seconds

// Initialize connection
connectWithRetry();

// Handle process termination
process.on('SIGINT', async () => {
  try {
    await prisma.$disconnect();
    console.log('Database connection closed due to application termination');
    process.exit(0);
  } catch (error) {
    console.error('Error during disconnection:', error);
    process.exit(1);
  }
});

export default prisma;

