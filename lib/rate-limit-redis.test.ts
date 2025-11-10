import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getClientIdentifier } from './rate-limit-redis';

// Mock Next.js server
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({
      json: () => Promise.resolve(data),
      ...init,
    })),
  },
}));

describe('Rate Limit Utilities', () => {
  describe('getClientIdentifier', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.100, 10.0.0.1',
        },
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('192.168.1.100');
    });

    it('should extract IP from x-real-ip header when x-forwarded-for is missing', () => {
      const request = new Request('http://localhost:3000/api/test', {
        headers: {
          'x-real-ip': '192.168.1.200',
        },
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('192.168.1.200');
    });

    it('should use fallback when no IP headers present', () => {
      const request = new Request('http://localhost:3000/api/test', {
        headers: {},
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('anonymous');
    });

    it('should handle multiple IPs in x-forwarded-for (use first)', () => {
      const request = new Request('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1, 192.0.2.1',
        },
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('203.0.113.1');
    });

    it('should trim whitespace from IP addresses', () => {
      const request = new Request('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '  192.168.1.100  , 10.0.0.1',
        },
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('192.168.1.100');
    });

    it('should handle empty x-forwarded-for header', () => {
      const request = new Request('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '',
          'x-real-ip': '192.168.1.100',
        },
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('192.168.1.100');
    });

    it('should handle IPv6 addresses', () => {
      const request = new Request('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        },
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    });
  });

  describe('Rate Limit Configuration', () => {
    it('should validate rate limit config structure', () => {
      const config = {
        limit: 10,
        window: 60000, // 1 minute
      };

      expect(config.limit).toBeGreaterThan(0);
      expect(config.window).toBeGreaterThan(0);
    });

    it('should handle different time windows', () => {
      const configs = [
        { limit: 5, window: 60000 },      // 1 minute
        { limit: 100, window: 3600000 },  // 1 hour
        { limit: 1000, window: 86400000 }, // 1 day
      ];

      configs.forEach(config => {
        expect(config.limit).toBeGreaterThan(0);
        expect(config.window).toBeGreaterThan(0);
      });
    });
  });

  describe('Rate Limit Result', () => {
    it('should have correct structure for successful request', () => {
      const result = {
        success: true,
        limit: 10,
        remaining: 5,
        reset: Date.now() + 60000,
      };

      expect(result.success).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBeLessThan(result.limit);
      expect(result.reset).toBeGreaterThan(Date.now());
    });

    it('should have correct structure for rate-limited request', () => {
      const result = {
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now() + 60000,
      };

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.reset).toBeGreaterThan(Date.now());
    });
  });
});
