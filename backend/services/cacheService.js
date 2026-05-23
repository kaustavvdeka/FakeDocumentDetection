const { createClient } = require('redis');

class CacheService {
  constructor() {
    this.client = null;
    this.isRedisConnected = false;
    this.memoryCache = new Map();
    this.memoryTtls = new Map(); // key -> expiration timestamp

    this.initializeRedis();
  }

  async initializeRedis() {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    try {
      this.client = createClient({ url: redisUrl });
      
      this.client.on('error', (err) => {
        console.warn('Redis Client Error, falling back to memory cache:', err.message);
        this.isRedisConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis Client Connected successfully.');
        this.isRedisConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      console.warn('Could not establish Redis connection. Using in-memory fallback cache.', error.message);
      this.isRedisConnected = false;
      this.client = null;
    }
  }

  /**
   * Get value from cache
   */
  async get(key) {
    if (this.isRedisConnected && this.client) {
      try {
        const val = await this.client.get(key);
        return val ? JSON.parse(val) : null;
      } catch (err) {
        console.warn('Redis GET failed, trying memory fallback:', err.message);
      }
    }

    // Memory fallback
    if (this.memoryCache.has(key)) {
      const expiry = this.memoryTtls.get(key);
      if (expiry && expiry < Date.now()) {
        // Expired
        this.memoryCache.delete(key);
        this.memoryTtls.delete(key);
        return null;
      }
      return this.memoryCache.get(key);
    }
    return null;
  }

  /**
   * Set value in cache with TTL in seconds
   */
  async set(key, value, ttlSeconds = 300) {
    if (this.isRedisConnected && this.client) {
      try {
        await this.client.set(key, JSON.stringify(value), {
          EX: ttlSeconds
        });
        return true;
      } catch (err) {
        console.warn('Redis SET failed, falling back to memory:', err.message);
      }
    }

    // Memory fallback
    this.memoryCache.set(key, value);
    if (ttlSeconds > 0) {
      this.memoryTtls.set(key, Date.now() + ttlSeconds * 1000);
    } else {
      this.memoryTtls.delete(key);
    }
    return true;
  }

  /**
   * Delete value from cache
   */
  async del(key) {
    if (this.isRedisConnected && this.client) {
      try {
        await this.client.del(key);
        return true;
      } catch (err) {
        console.warn('Redis DEL failed, falling back to memory:', err.message);
      }
    }

    this.memoryCache.delete(key);
    this.memoryTtls.delete(key);
    return true;
  }

  /**
   * Clear all cached keys (for reset/flush)
   */
  async clear() {
    if (this.isRedisConnected && this.client) {
      try {
        await this.client.flushAll();
        return true;
      } catch (err) {
        console.warn('Redis FLUSHALL failed:', err.message);
      }
    }
    this.memoryCache.clear();
    this.memoryTtls.clear();
    return true;
  }
}

// Export singleton instance
module.exports = new CacheService();
