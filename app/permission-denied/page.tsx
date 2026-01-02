import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldX, Home } from "lucide-react";
import Link from "next/link";

export default function PermissionDeniedPage({
  searchParams,
}: {
  searchParams: { message?: string; returnUrl?: string };
}) {
  const message = searchParams.message || "You don't have permission to access this page.";
  const returnUrl = searchParams.returnUrl || "/dashboard";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <Card className="max-w-lg w-full border-amber-200 shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center">
              <ShieldX className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Permission Denied
          </CardTitle>
          <CardDescription className="text-slate-600 mt-2">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600 text-center">
            If you believe you should have access to this page, please contact your administrator.
          </p>
          <Button asChild className="w-full bg-[#224794] hover:bg-[#1a3670]">
            <Link href={returnUrl}>
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
