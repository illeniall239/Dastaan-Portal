import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ json: () => Promise.resolve(data), ...init })),
  },
}));

// Force Redis unavailable so rateLimit uses in-memory fallback instantly
vi.mock('@upstash/redis', () => ({ Redis: vi.fn(() => { throw new Error('no redis in test'); }) }));
vi.mock('@upstash/ratelimit', () => ({ Ratelimit: vi.fn(() => { throw new Error('no redis in test'); }) }));

import { getClientIdentifier, rateLimit, RateLimitPresets, createRateLimitHeaders } from './rate-limit-redis';

describe('getClientIdentifier', () => {
  it('extracts first IP from x-forwarded-for', () => {
    const req = new Request('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.1' },
    });
    expect(getClientIdentifier(req)).toBe('203.0.113.1');
  });

  it('falls back to x-real-ip', () => {
    const req = new Request('http://localhost/api/test', {
      headers: { 'x-real-ip': '192.168.1.200' },
    });
    expect(getClientIdentifier(req)).toBe('192.168.1.200');
  });

  it('returns anonymous when no IP headers', () => {
    const req = new Request('http://localhost/api/test');
    expect(getClientIdentifier(req)).toBe('anonymous');
  });

  it('trims whitespace from IPs', () => {
    const req = new Request('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '  10.0.0.1  , 10.0.0.2' },
    });
    expect(getClientIdentifier(req)).toBe('10.0.0.1');
  });
});

describe('rateLimit (in-memory fallback, no Redis configured)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests up to the limit', async () => {
    const config = { limit: 3, window: 60_000 };
    const id = `test-allow-${Date.now()}`;

    const r1 = await rateLimit(id, config);
    const r2 = await rateLimit(id, config);
    const r3 = await rateLimit(id, config);

    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(2);
    expect(r2.success).toBe(true);
    expect(r2.remaining).toBe(1);
    expect(r3.success).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('blocks the request after the limit is exceeded', async () => {
    const config = { limit: 2, window: 60_000 };
    const id = `test-block-${Date.now()}`;

    await rateLimit(id, config);
    await rateLimit(id, config);
    const r3 = await rateLimit(id, config);

    expect(r3.success).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it('resets after the window expires', async () => {
    const config = { limit: 1, window: 10_000 };
    const id = `test-reset-${Date.now()}`;

    const r1 = await rateLimit(id, config);
    expect(r1.success).toBe(true);

    const r2 = await rateLimit(id, config);
    expect(r2.success).toBe(false);

    vi.advanceTimersByTime(10_001);

    const r3 = await rateLimit(id, config);
    expect(r3.success).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('tracks different identifiers independently', async () => {
    const config = { limit: 1, window: 60_000 };
    const idA = `test-independent-a-${Date.now()}`;
    const idB = `test-independent-b-${Date.now()}`;

    const a1 = await rateLimit(idA, config);
    const b1 = await rateLimit(idB, config);

    expect(a1.success).toBe(true);
    expect(b1.success).toBe(true);

    const a2 = await rateLimit(idA, config);
    const b2 = await rateLimit(idB, config);

    expect(a2.success).toBe(false);
    expect(b2.success).toBe(false);
  });
});

describe('RateLimitPresets', () => {
  it('bulk preset is generous enough for heavy upload sessions', () => {
    expect(RateLimitPresets.bulk).toEqual({ limit: 100, window: 5 * 60 * 1000 });
  });

  it('strict < standard < relaxed in requests per minute', () => {
    const rpm = (p: { limit: number; window: number }) => p.limit / (p.window / 60_000);
    expect(rpm(RateLimitPresets.strict)).toBeLessThan(rpm(RateLimitPresets.standard));
    expect(rpm(RateLimitPresets.standard)).toBeLessThan(rpm(RateLimitPresets.relaxed));
  });

  it('veryStrict is the most restrictive preset per minute', () => {
    const rpm = (p: { limit: number; window: number }) => p.limit / (p.window / 60_000);
    const presets = Object.values(RateLimitPresets);
    const veryStrictRpm = rpm(RateLimitPresets.veryStrict);
    for (const preset of presets) {
      if (preset === RateLimitPresets.veryStrict) continue;
      expect(veryStrictRpm).toBeLessThanOrEqual(rpm(preset));
    }
  });
});

describe('createRateLimitHeaders', () => {
  it('returns standard rate limit headers', () => {
    const headers = createRateLimitHeaders({
      success: true, limit: 60, remaining: 42, reset: 1700000000,
    });
    expect(headers['X-RateLimit-Limit']).toBe('60');
    expect(headers['X-RateLimit-Remaining']).toBe('42');
    expect(headers['X-RateLimit-Reset']).toBe('1700000000');
    expect(headers['RateLimit-Limit']).toBe('60');
  });
});
