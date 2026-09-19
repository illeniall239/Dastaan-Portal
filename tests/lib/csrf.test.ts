import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkCsrfOrigin } from '@/lib/csrf';

describe('CSRF origin check', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://portal.geo.com';
  });

  it('passes for same-origin requests', () => {
    const result = checkCsrfOrigin('POST', 'https://portal.geo.com');
    expect(result).toBeNull();
  });

  it('passes for GET requests (safe method)', () => {
    const result = checkCsrfOrigin('GET', 'https://evil.com');
    expect(result).toBeNull();
  });

  it('passes for HEAD/OPTIONS (safe methods)', () => {
    expect(checkCsrfOrigin('HEAD', 'https://evil.com')).toBeNull();
    expect(checkCsrfOrigin('OPTIONS', 'https://evil.com')).toBeNull();
  });

  it('rejects POST from different origin', () => {
    const result = checkCsrfOrigin('POST', 'https://evil.com');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('rejects PATCH from different origin', () => {
    const result = checkCsrfOrigin('PATCH', 'https://evil.com');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('rejects DELETE from different origin', () => {
    const result = checkCsrfOrigin('DELETE', 'https://evil.com');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('passes when no origin header (same-origin non-fetch requests)', () => {
    const result = checkCsrfOrigin('POST', null);
    expect(result).toBeNull();
  });
});
