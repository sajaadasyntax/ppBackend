// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('API Error:', err);
  
  // Check if it's a Prisma error
  if (err.name === 'PrismaClientInitializationError' || 
      err.name === 'PrismaClientKnownRequestError' ||
      err.name === 'PrismaClientRustPanicError' ||
      err.name === 'PrismaClientUnknownRequestError' ||
      err.code === 'P1001') {
    return res.status(503).json({ 
      error: 'Database connection error. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  
  // Generic error handler
  const status = err.statusCode || 500;
  const message = err.message || 'Something went wrong';
  
  res.status(status).json({ 
    error: message,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
