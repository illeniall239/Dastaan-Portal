"use client";

/**
 * Global Error Boundary
 *
 * Catches errors in layout.tsx (root-level errors)
 * This is the last line of defense for uncaught errors
 *
 * Note: Must be a Client Component
 * Documentation: https://nextjs.org/docs/app/building-your-application/routing/error-handling#handling-errors-in-root-layouts
 */

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report fatal error to GlitchTip
    Sentry.captureException(error, {
      level: "fatal",
      tags: {
        error_boundary: "global",
        location: "root_layout",
      },
      contexts: {
        error: {
          digest: error.digest,
          message: error.message,
          stack: error.stack,
        },
      },
    });

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("[Global Error Boundary]", error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full text-center">
            <div className="mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Critical Error
              </h1>
              <p className="text-slate-600 mb-4">
                We're sorry, but something unexpected happened. Our team has been notified and will investigate.
              </p>
              {error.digest && (
                <p className="text-xs text-slate-500 font-mono mb-4">
                  Error ID: {error.digest}
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Try again
              </button>
              <a
                href="/"
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition-colors"
              >
                Go to homepage
              </a>
            </div>

            {process.env.NODE_ENV === "development" && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-slate-600 hover:text-slate-900">
                  Error details (dev only)
                </summary>
                <pre className="mt-2 p-4 bg-slate-900 text-slate-100 rounded-md text-xs overflow-auto max-h-64">
                  {error.stack || error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
