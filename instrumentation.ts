/**
 * Next.js 15 Instrumentation Hook
 *
 * This file is automatically loaded by Next.js on app startup
 * Used to initialize monitoring and observability tools
 *
 * Runs once per runtime environment:
 * - Once for Node.js server runtime
 * - Once for Edge runtime (if used)
 *
 * Documentation: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Initialize GlitchTip error tracking (Sentry SDK compatible)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Server-side error tracking (API routes, server components)
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // Edge runtime error tracking (middleware, edge functions)
    await import("./sentry.edge.config");
  }

  // Week 2: OpenTelemetry performance monitoring
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-otel');
  }
}
