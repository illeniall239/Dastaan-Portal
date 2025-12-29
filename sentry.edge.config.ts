/**
 * Sentry Edge Configuration for GlitchTip
 *
 * This file runs on the Edge runtime (Vercel Edge Functions)
 * Handles middleware errors and edge function errors
 *
 * Note: Edge runtime has limited APIs (no Node.js APIs)
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // GlitchTip DSN (same format as Sentry DSN)
  dsn: process.env.NEXT_PUBLIC_GLITCHTIP_DSN,

  // Environment (development/staging/production)
  environment: process.env.NODE_ENV,

  // Only enable in production to avoid dev noise
  enabled: process.env.NODE_ENV === "production",

  // Performance Monitoring: 10% of transactions
  tracesSampleRate: 0.1,

  // Capture 100% of errors
  sampleRate: 1.0,

  // Privacy: Scrub sensitive data
  beforeSend(event, hint) {
    // Redact sensitive headers
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
      delete event.request.headers["x-api-key"];
      delete event.request.headers["Authorization"];
      delete event.request.headers["Cookie"];
    }

    return event;
  },

  // Attach stack traces to messages
  attachStacktrace: true,

  // Max breadcrumbs to keep in memory (lower for edge runtime)
  maxBreadcrumbs: 30,
});
