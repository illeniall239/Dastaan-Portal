"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

/**
 * Custom 404 Not Found Page
 *
 * Displayed when a user navigates to a non-existent route
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center">
              <FileQuestion className="h-10 w-10 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-slate-900">
            404
          </CardTitle>
          <CardDescription className="text-lg text-slate-600 mt-2">
            Page Not Found
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-slate-600">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <div className="flex flex-col gap-2">
            <Button
              asChild
              className="w-full bg-[#224794] hover:bg-[#1a3670]"
            >
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go to Homepage
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-center text-slate-500">
              Common destinations:
            </p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link href="/evaluator">Evaluator</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link href="/content-department">Content Dept</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link href="/management">Management</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
