"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

export default function ProgrammerContractTermsError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        Sentry.captureException(error, {
            level: "error",
            tags: {
                error_boundary: "programmer_contract_terms",
                location: "programmer-contract-terms-page",
            },
            contexts: {
                error: {
                    digest: error.digest,
                    message: error.message,
                    stack: error.stack,
                },
            },
        });

        if (process.env.NODE_ENV === "development") {
            console.error("Programmer contract terms page error:", error);
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
                        Error Loading Contract Terms
                    </CardTitle>
                    <CardDescription className="text-slate-600 mt-2">
                        We couldn't load the contract terms. Your data is safe.
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
                        <Button asChild variant="outline">
                            <Link href="/programmer">
                                <Home className="h-4 w-4 mr-2" />
                                Dashboard
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
