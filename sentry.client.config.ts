/**
 * Sentry Client Configuration for GlitchTip
 *
 * GlitchTip is 100% Sentry API compatible, so we use @sentry/nextjs
 * This file runs in the browser (client-side)
 *
 * Setup Instructions:
 * 1. Sign up for GlitchTip at https://app.glitchtip.com (free, no credit card)
 * 2. Create a new project
 * 3. Copy the DSN from project settings
 * 4. Add to Vercel environment variables:
 *    - NEXT_PUBLIC_GLITCHTIP_DSN=https://xxx@app.glitchtip.com/xxx
 */

import * as Sentry from "@sentry/nextjs";

// This file runs in the browser, but when manually imported in Next.js App Router,
// it might be evaluated during SSR. We must ensure we don't access client-only methods on server.

const isBrowser = typeof window !== "undefined";

if (isBrowser) {
  Sentry.init({
    // GlitchTip DSN (same format as Sentry DSN)
    dsn: process.env.NEXT_PUBLIC_GLITCHTIP_DSN,

    // Proxy requests through Next.js to bypass adblockers
    tunnel: "/monitoring",

    // Environment (development/staging/production)
    environment: process.env.NODE_ENV,

    // Only enable in production to avoid dev noise
    enabled: process.env.NODE_ENV === "production",

    // Performance Monitoring: 10% of transactions
    // Adjust based on traffic (lower for high-traffic apps)
    tracesSampleRate: 0.1,

    // Capture 100% of errors (free tier allows 1,000 events/month)
    sampleRate: 1.0,

    // GlitchTip doesn't support session replay yet
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

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

      // Redact URL query params that might contain tokens
      if (event.request?.url) {
        try {
          const url = new URL(event.request.url);
          if (url.searchParams.has("token")) url.searchParams.set("token", "[Redacted]");
          if (url.searchParams.has("api_key")) url.searchParams.set("api_key", "[Redacted]");
          event.request.url = url.toString();
        } catch { }
      }

      // Ignore noise (ResizeObserver errors, etc.)
      if (event.exception?.values?.[0]?.value?.includes("ResizeObserver")) {
        return null;
      }

      return event;
    },

    // Ignore common non-critical errors
    ignoreErrors: [
      // Browser extensions
      "top.GLOBALS",
      "canvas.contentDocument",
      "MyApp_RemoveAllHighlights",
      "atomicFindClose",
      // Network errors that are user's fault
      "NetworkError",
      "Network request failed",
      "Failed to fetch",
      // Abort errors (user navigated away)
      "AbortError",
      "The operation was aborted",
      // ResizeObserver (non-critical)
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
    ],

    // Denylist: Don't send errors from browser extensions
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
    ],

    // Add breadcrumbs for debugging
    integrations: [
      // Check if browserTracingIntegration exists (safety for SSR)
      typeof Sentry.browserTracingIntegration === "function" ? Sentry.browserTracingIntegration({
        // Trace only key navigation events
        traceFetch: true,
        traceXHR: true,
      }) : null,
    ].filter(Boolean) as any, // Filter out nulls

    // Max breadcrumbs to keep in memory
    maxBreadcrumbs: 50,

    // Attach stack traces to messages
    attachStacktrace: true,
  });
}
