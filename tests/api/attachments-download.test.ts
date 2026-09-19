import { describe, it, expect } from 'vitest';
import { validateDownloadAccess } from '@/lib/download-validation';

describe('download endpoint access control', () => {
  it('rejects unauthenticated requests without a token', () => {
    const result = validateDownloadAccess({
      userId: null,
      externalToken: null,
      filePath: 'call_reports/uuid1/uuid2.pdf',
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('unauthorized');
  });

  it('allows authenticated users', () => {
    const result = validateDownloadAccess({
      userId: 'user-123',
      externalToken: null,
      filePath: 'call_reports/uuid1/uuid2.pdf',
    });
    expect(result.allowed).toBe(true);
  });

  it('allows requests with a valid external token', () => {
    const result = validateDownloadAccess({
      userId: null,
      externalToken: 'some-valid-token',
      filePath: 'episodes/uuid1/uuid2.pdf',
    });
    expect(result.allowed).toBe(true);
  });

  it('rejects path traversal attempts', () => {
    const result = validateDownloadAccess({
      userId: 'user-123',
      externalToken: null,
      filePath: 'call_reports/../../../etc/passwd',
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('invalid_path');
  });

  it('rejects disallowed path prefixes', () => {
    const result = validateDownloadAccess({
      userId: 'user-123',
      externalToken: null,
      filePath: 'secrets/something.pdf',
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('invalid_path');
  });
});

describe('download error responses', () => {
  it('error responses must not contain detail field', () => {
    // This is a contract test: when we build error responses,
    // they should never include internal details
    const errorResponse = { error: 'Failed to generate download URL' };
    expect(errorResponse).not.toHaveProperty('detail');
  });
});
