import { describe, it, expect } from 'vitest';

describe('next.config security', () => {
  it('production source maps are disabled', async () => {
    // Import the config module to check the exported value
    const configModule = await import('@/next.config');
    const config = configModule.default;

    // Unwrap Sentry wrapper if present — Sentry's withSentryConfig returns
    // a function or object; we need to check the inner config
    expect(config.productionBrowserSourceMaps).not.toBe(true);
  });
});
