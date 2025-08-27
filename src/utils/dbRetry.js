/**
 * Utility function to retry database operations
 * @param {Function} operation - The database operation to retry
 * @param {Object} options - Retry options
 * @returns {Promise<*>} - Result of the operation
 */
const withRetry = async (operation, options = {}) => {
  const {
    maxRetries = 3,
    retryInterval = 1000,
    onRetry = null,
  } = options;
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Try to execute the operation
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if error is related to connection
      const isConnectionError = 
        error.name === 'PrismaClientInitializationError' ||
        error.code === 'P1001' ||
        error.code === 'P1002' ||
        error.message.includes('connection');
      
      // Only retry on connection errors
      if (!isConnectionError || attempt === maxRetries) {
        throw error;
      }
      
      // Call onRetry callback if provided
      if (onRetry && typeof onRetry === 'function') {
        onRetry(attempt, error);
      } else {
        console.error(`Database operation failed (attempt ${attempt}/${maxRetries}): ${error.message}`);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryInterval * attempt));
    }
  }
  
  // If we get here, all retries failed
  throw lastError;
};

module.exports = { withRetry };
