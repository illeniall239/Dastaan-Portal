import { describe, it, expect } from 'vitest';
import { sanitizeForPrintTitle } from '@/lib/print-utils';

describe('print title sanitization', () => {
  it('returns plain text unchanged', () => {
    expect(sanitizeForPrintTitle('Dashboard Section')).toBe('Dashboard Section');
  });

  it('strips HTML tags from title', () => {
    expect(sanitizeForPrintTitle('</title><script>alert(1)</script>')).toBe('alert(1)');
  });

  it('handles null/undefined gracefully', () => {
    expect(sanitizeForPrintTitle(null)).toBe('Dashboard Section');
    expect(sanitizeForPrintTitle(undefined)).toBe('Dashboard Section');
    expect(sanitizeForPrintTitle('')).toBe('Dashboard Section');
  });
});
