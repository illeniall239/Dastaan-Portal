import { describe, it, expect } from 'vitest';
import { signSessionPayload, verifySessionPayload, SESSION_MAX_AGE } from '@/lib/session';

describe('session cookie signing', () => {
  const payload = {
    id: 'user-123',
    email: 'test@geo.com',
    name: 'Test User',
    role: 'evaluator',
    position: 'Senior',
    department: 'Content',
  };

  it('roundtrips: sign then verify returns original payload', () => {
    const signed = signSessionPayload(payload);
    const result = verifySessionPayload(signed);
    expect(result).toEqual(payload);
  });

  it('rejects tampered payload', () => {
    const signed = signSessionPayload(payload);
    // Parse, tamper with role, re-serialize
    const parts = signed.split('.');
    const tampered = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    tampered.role = 'admin';
    const tamperedSigned = Buffer.from(JSON.stringify(tampered)).toString('base64url') + '.' + parts[1];
    const result = verifySessionPayload(tamperedSigned);
    expect(result).toBeNull();
  });

  it('rejects garbage input', () => {
    expect(verifySessionPayload('')).toBeNull();
    expect(verifySessionPayload('not.valid')).toBeNull();
    expect(verifySessionPayload('just-garbage')).toBeNull();
  });

  it('session TTL is 1 hour', () => {
    expect(SESSION_MAX_AGE).toBe(3600);
  });
});
