/**
 * Performance optimization utilities for TaxiLibre
 */

let redis
try {
  redis = require('../config/redis')
} catch (e) {
  redis = {
    get: async () => null,
    setex: async () => {},
    keys: async () => [],
    del: async () => 0
  }
}

/**
 * Cache wrapper for expensive operations
 */
class CacheService {
  /**
   * Get value from cache or compute and store it
   * @param {string} key - Cache key
   * @param {Function} computeFn - Function to compute value if not cached
   * @param {number} ttl - Time to live in seconds (default: 300)
   * @returns {Promise<any>} Cached or computed value
   */
  static async getOrCompute (key, computeFn, ttl = 300) {
    try {
      // Try to get from cache first
      const cached = await redis.get(key)
      if (cached !== null) {
        return JSON.parse(cached)
      }

      // Compute value if not in cache
      const value = await computeFn()

      // Store in cache
      await redis.setex(key, ttl, JSON.stringify(value))

      return value
    } catch (error) {
      // Fallback to computing value without caching
      return computeFn()
    }
  }

  /**
   * Invalidate cache by pattern
   * @param {string} pattern - Key pattern to match
   * @returns {Promise<number>} Number of keys deleted
   */
  static async invalidatePattern (pattern) {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
        return keys.length
      }
      return 0
    } catch (error) {
      return 0
    }
  }
}

/**
 * Database query optimization helpers
 */
class QueryOptimizer {
  /**
   * Add pagination to Sequelize query options
   * @param {Object} options - Sequelize options object
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Items per page
   * @returns {Object} Updated options with pagination
   */
  static paginate (options, page = 1, limit = 20) {
    const offset = (page - 1) * limit
    return {
      ...options,
      limit,
      offset
    }
  }

  /**
   * Select only specific fields to reduce data transfer
   * @param {Array<string>} fields - Fields to include
   * @returns {Object} Sequelize attributes option
   */
  static selectFields (fields) {
    return { attributes: fields }
  }

  /**
   * Add ordering to query
   * @param {Array<Array<string>>} order - Order specifications [[field, direction], ...]
   * @returns {Object} Sequelize order option
   */
  static orderBy (order) {
    return { order }
  }
}

/**
 * Pagination helper for API responses
 */
class PaginationHelper {
  /**
   * Create paginated response metadata
   * @param {number} totalItems - Total number of items
   * @param {number} page - Current page (1-based)
   * @param {number} limit - Items per page
   * @returns {Object} Pagination metadata
   */
  static createMeta (totalItems, page = 1, limit = 20) {
    const totalPages = Math.ceil(totalItems / limit)
    return {
      totalItems,
      totalPages,
      currentPage: page,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  }
}

/**
 * Debounce utility for rate limiting function calls
 */
class Debouncer {
  /**
   * Create a debounced function
   * @param {Function} fn - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @param {boolean} immediate - Whether to invoke immediately on leading edge
   * @returns {Function} Debounced function
   */
  static debounce (fn, wait, immediate = false) {
    let timeout
    return function () {
      const context = this
      const args = arguments
      const later = () => {
        timeout = null
        if (!immediate) fn.apply(context, args)
      }
      const callNow = immediate && !timeout
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
      if (callNow) fn.apply(context, args)
    }
  }
}

/**
 * Throttle utility for limiting function call frequency
 */
class Throttler {
  /**
   * Create a throttled function
   * @param {Function} fn - Function to throttle
   * @param {number} limit - Maximum calls per time window
   * @param {number} window - Time window in milliseconds
   * @returns {Function} Throttled function
   */
  static throttle (fn, limit, window) {
    const lastExecuted = 0
    let history = []

    return function () {
      const now = Date.now()
      const context = this
      const args = arguments

      // Remove expired timestamps
      history = history.filter(timestamp => now - timestamp < window)

      if (history.length < limit) {
        history.push(now)
        return fn.apply(context, args)
      }

      // If we're at the limit, don't execute
      return null
    }
  }
}

module.exports = {
  CacheService,
  QueryOptimizer,
  PaginationHelper,
  Debouncer,
  Throttler
}
