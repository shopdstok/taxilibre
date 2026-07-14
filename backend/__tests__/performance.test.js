// Mock redis for testing before importing modules that depend on it
jest.mock('../src/config/redis', () => ({
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn()
}));

// Now import the modules that depend on redis
const { CacheService, QueryOptimizer, PaginationHelper, Debouncer, Throttler } = require('../src/services/optimization');
const rideMatchingService = require('../src/services/matchingService');

describe('Performance Optimizations', () => {
  describe('CacheService', () => {
    beforeEach(() => {
      // Reset mock calls between tests
      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return cached value when available', async () => {
      const redis = require('../src/config/redis');
      redis.get.mockResolvedValue(JSON.stringify({ test: 'value' }));

      const computeFn = jest.fn().mockResolvedValue({ test: 'computed' });
      const result = await CacheService.getOrCompute('test-key', computeFn);

      expect(result).toEqual({ test: 'value' });
      expect(computeFn).not.toHaveBeenCalled();
      expect(redis.setex).not.toHaveBeenCalled();
    });

    it('should compute and cache value when not in cache', async () => {
      const redis = require('../src/config/redis');
      redis.get.mockResolvedValue(null);

      const computeFn = jest.fn().mockResolvedValue({ test: 'computed' });
      const result = await CacheService.getOrCompute('test-key', computeFn, 60);

      expect(result).toEqual({ test: 'computed' });
      expect(computeFn).toHaveBeenCalled();
      expect(redis.setex).toHaveBeenCalledWith('test-key', 60, JSON.stringify({ test: 'computed' }));
    });
  });

  describe('QueryOptimizer', () => {
    it('should add pagination to options', () => {
      const options = { where: { active: true } };
      const paginated = QueryOptimizer.paginate(options, 2, 10);

      expect(paginated).toEqual({
        where: { active: true },
        limit: 10,
        offset: 10
      });
    });

    it('should create select fields option', () => {
      const fields = ['id', 'name', 'email'];
      const select = QueryOptimizer.selectFields(fields);

      expect(select).toEqual({ attributes: ['id', 'name', 'email'] });
    });

    it('should create order by option', () => {
      const order = [['createdAt', 'DESC'], ['name', 'ASC']];
      const orderOption = QueryOptimizer.orderBy(order);

      expect(orderOption).toEqual({ order: [['createdAt', 'DESC'], ['name', 'ASC']] });
    });
  });

  describe('PaginationHelper', () => {
    it('should create correct pagination metadata', () => {
      const meta = PaginationHelper.createMeta(95, 3, 20);

      expect(meta).toEqual({
        totalItems: 95,
        totalPages: 5,
        currentPage: 3,
        itemsPerPage: 20,
        hasNextPage: true,
        hasPrevPage: true
      });
    });

    it('should handle edge cases', () => {
      // First page
      let meta = PaginationHelper.createMeta(15, 1, 20);
      expect(meta.hasPrevPage).toBe(false);
      expect(meta.hasNextPage).toBe(false);

      // Last page
      meta = PaginationHelper.createMeta(95, 5, 20);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.hasPrevPage).toBe(true);
    });
  });

  describe('Debouncer', () => {
    it('should debounce function calls', (done) => {
      const fn = jest.fn();
      const debounced = Debouncer.debounce(fn, 100);

      // Call multiple times quickly
      debounced();
      debounced();
      debounced();

      // Should not have called yet
      expect(fn).not.toHaveBeenCalled();

      // Wait for debounce timeout
      setTimeout(() => {
        expect(fn).toHaveBeenCalledTimes(1);
        done();
      }, 150);
    });
  });

  describe('Throttler', () => {
    it('should throttle function calls', () => {
      const fn = jest.fn();
      const throttled = Throttler.throttle(fn, 2, 1000); // 2 calls per second

      // Should allow first 2 calls
      expect(throttled()).toBeUndefined(); // first call
      expect(throttled()).toBeUndefined(); // second call
      expect(throttled()).toBeNull();      // third call - should be throttled
      expect(throttled()).toBeNull();      // fourth call - should be throttled

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Haversine Distance Calculation', () => {
    it('should calculate distance correctly', () => {
      // Paris to London (approximately 344 km)
      const distance = rideMatchingService.haversineDistance(48.8566, 2.3522, 51.5074, -0.1278);

      // Should be approximately 344 km (allowing 1% tolerance)
      expect(distance).toBeGreaterThan(340);
      expect(distance).toBeLessThan(350);
    });

    it('should return 0 for same coordinates', () => {
      const distance = rideMatchingService.haversineDistance(48.8566, 2.3522, 48.8566, 2.3522);
      expect(distance).toBe(0);
    });

    it('should handle antipodal points', () => {
      // Point and its antipode should be ~20,000 km apart (half earth circumference)
      const distance = rideMatchingService.haversineDistance(0, 0, 0, 180);
      expect(distance).toBeGreaterThan(19000);
      expect(distance).toBeLessThan(21000);
    });
  });
});
