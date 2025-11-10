"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";

export default function ManagementError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Management section error:", error);
    if (error.digest) {
      console.error("Error ID:", error.digest);
    }
    console.error("Location: Management Error Boundary");
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <Card className="max-w-md w-full border-red-200 shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Management Dashboard Error
          </CardTitle>
          <CardDescription className="text-slate-600 mt-2">
            We encountered an error while loading the management dashboard.
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
          <div className="flex flex-col gap-2">
            <Button
              onClick={reset}
              className="w-full bg-[#224794] hover:bg-[#1a3670]"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
            <Button
              onClick={() => window.location.href = "/management"}
              variant="outline"
              className="w-full"
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Back to Management
            </Button>
          </div>
          <p className="text-xs text-center text-slate-500 mt-4">
            If this problem persists, please contact technical support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
