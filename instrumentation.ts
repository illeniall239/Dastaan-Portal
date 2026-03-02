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

/**
 * Next.js 15 server-side catch-all error hook.
 * Fires for every unhandled server error — route handlers, RSC renders, middleware.
 * Complements handleApiError() for errors that bypass our catch blocks.
 */
export async function onRequestError(
  error: { digest: string } & Error,
  request: { path: string; method: string; headers: Record<string, string> },
  context: { routeType: string; routePath: string }
) {
  // Only run on Node.js runtime — admin client requires Node APIs
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { logError } = await import("./lib/errors/server");
    const ipAddress =
      request.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      request.headers["x-real-ip"] ||
      undefined;

    await logError({
      error,
      statusCode: 500,
      context: {
        routeType: context.routeType,
        routePath: context.routePath,
        digest: error.digest,
        path: request.path,
        method: request.method,
        ipAddress,
      },
    });
  } catch {
    // Silently swallow — instrumentation must never crash the server
  }
}
