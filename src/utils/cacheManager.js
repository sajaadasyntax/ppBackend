/**
 * Simple in-memory cache implementation to reduce database load
 */
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map(); // Time to live map
    this.defaultTTL = 300000; // 5 minutes in milliseconds
    
    // Periodic cleanup of expired cache items
    setInterval(() => this.cleanupExpired(), 60000);
  }

  /**
   * Get item from cache
   * @param {string} key - Cache key
   * @returns {*} - Cached value or undefined if not found/expired
   */
  get(key) {
    if (!this.has(key)) return undefined;
    
    const expiry = this.ttl.get(key);
    if (expiry && expiry < Date.now()) {
      this.delete(key);
      return undefined;
    }
    
    return this.cache.get(key);
  }

  /**
   * Set item in cache with optional TTL
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttl);
  }

  /**
   * Check if key exists in cache and is not expired
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    if (!this.cache.has(key)) return false;
    
    const expiry = this.ttl.get(key);
    if (expiry && expiry < Date.now()) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete item from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear();
    this.ttl.clear();
  }
  
  /**
   * Remove expired items from cache
   */
  cleanupExpired() {
    const now = Date.now();
    for (const [key, expiry] of this.ttl.entries()) {
      if (expiry < now) {
        this.delete(key);
      }
    }
  }
  
  /**
   * Get or set cache with a factory function
   * @param {string} key - Cache key
   * @param {Function} factory - Factory function to produce value if not in cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   * @returns {Promise<*>} - Cached or computed value
   */
  async getOrSet(key, factory, ttl = this.defaultTTL) {
    const cachedValue = this.get(key);
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    try {
      const value = await factory();
      this.set(key, value, ttl);
      return value;
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new CacheManager();
