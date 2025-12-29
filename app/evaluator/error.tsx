"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

export default function EvaluatorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report error to GlitchTip
    Sentry.captureException(error, {
      level: "error",
      tags: {
        error_boundary: "evaluator",
        location: "evaluator-portal",
      },
      contexts: {
        error: {
          digest: error.digest,
          message: error.message,
          stack: error.stack,
        },
      },
    });

    // Also log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Evaluator portal error:", error);
      if (error.digest) {
        console.error("Error ID:", error.digest);
      }
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <Card className="max-w-lg w-full border-red-200 shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Evaluator Portal Error
          </CardTitle>
          <CardDescription className="text-slate-600 mt-2">
            We encountered an error in the evaluator portal. Your evaluations are safe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === "development" && (
            <div className="p-3 bg-slate-100 rounded-md border border-slate-200">
              <p className="text-xs font-mono text-slate-700 break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-slate-500 mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={reset}
              className="bg-[#224794] hover:bg-[#1a3670]"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
            <Button
              asChild
              variant="outline"
            >
              <Link href="/evaluator">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
            >
              <Link href="/evaluator/call-reports">
                Call Reports
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
            >
              <Link href="/evaluator/evaluations-list">
                Evaluations
              </Link>
            </Button>
          </div>
          <p className="text-xs text-center text-slate-500 mt-4">
            If you were submitting an evaluation, please check if it was saved before retrying.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
