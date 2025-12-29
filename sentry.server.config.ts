/**
 * Sentry Server Configuration for GlitchTip
 *
 * This file runs on the server (Node.js runtime)
 * Handles server-side errors, API route errors, server component errors
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

  // Server-specific integrations
  integrations: [
    Sentry.httpIntegration(),
    Sentry.postgresIntegration(),
    Sentry.extraErrorDataIntegration({
      // Capture extra error context
      depth: 10,
    }),
  ],

  // Privacy: Scrub sensitive data
  beforeSend(event, hint) {
    // Redact environment variables (contains secrets)
    if (event.contexts?.runtime?.variables) {
      delete event.contexts.runtime.variables;
    }

    // Redact sensitive environment variables from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
        if (breadcrumb.data) {
          // Remove any key that might contain secrets
          Object.keys(breadcrumb.data).forEach((key) => {
            if (
              key.toLowerCase().includes("password") ||
              key.toLowerCase().includes("secret") ||
              key.toLowerCase().includes("token") ||
              key.toLowerCase().includes("key")
            ) {
              breadcrumb.data![key] = "[Redacted]";
            }
          });
        }
        return breadcrumb;
      });
    }

    // Redact sensitive headers
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
      delete event.request.headers["x-api-key"];
      delete event.request.headers["Authorization"];
      delete event.request.headers["Cookie"];
    }

    // Redact Supabase service role key from error messages
    if (event.exception?.values) {
      event.exception.values = event.exception.values.map((exception) => {
        if (exception.value) {
          // Replace service role key patterns
          exception.value = exception.value.replace(
            /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
            "[JWT_REDACTED]"
          );
          // Replace generic secrets
          exception.value = exception.value.replace(
            /(secret|password|token|key)=([^\s&]+)/gi,
            "$1=[Redacted]"
          );
        }
        return exception;
      });
    }

    return event;
  },

  // Attach stack traces to messages
  attachStacktrace: true,

  // Max breadcrumbs to keep in memory
  maxBreadcrumbs: 50,
});
