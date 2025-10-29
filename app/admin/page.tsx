import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Users, UserPlus, Shield, Settings, Database, Activity } from "lucide-react";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

// Add Next.js caching
export const revalidate = 300; // 5 minutes for better performance

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Only admins can access this page
  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6 animate-fade-in">
      {/* Page Header with Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, <span className="text-[#224794]">{user.name}</span>.
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            System administration dashboard
          </p>
        </div>
        <Button asChild className="bg-[#10b981] hover:bg-[#059669] touch-target w-full sm:w-auto">
          <Link href="/admin/users/new" prefetch>
            <UserPlus className="h-4 w-4 mr-2" />
            Create New User
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <Suspense fallback={<div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"><div className="h-32 bg-slate-200 animate-pulse rounded-lg" /></div>}>
        <AdminStatsGrid />
      </Suspense>

      {/* Main Content Grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Left Column - Quick Actions */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-6 flex flex-col">
          <Card className="h-full shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl font-bold">Quick Actions</CardTitle>
              <CardDescription className="text-slate-600 text-sm">
                Common administrative tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 p-4 sm:p-6 pt-0">
              <Link href="/admin/users" prefetch>
                <div className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all duration-300 cursor-pointer border border-transparent hover:border-slate-200 hover:shadow-md animate-stagger touch-target" style={{ animationDelay: '0ms' }}>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#224794] shadow-lg transition-shadow duration-300 flex-shrink-0">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-[#224794] transition-colors">User Management</p>
                    <p className="text-xs text-slate-500">View and manage users</p>
                  </div>
                </div>
              </Link>

              <Link href="/admin/users/new" prefetch>
                <div className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all duration-300 cursor-pointer border border-transparent hover:border-slate-200 hover:shadow-md animate-stagger touch-target" style={{ animationDelay: '100ms' }}>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-[#10b981] shadow-lg transition-shadow duration-300 flex-shrink-0">
                    <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-[#10b981] transition-colors">Create New User</p>
                    <p className="text-xs text-slate-500">Add user to system</p>
                  </div>
                </div>
              </Link>

              <div className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-slate-100 opacity-50 cursor-not-allowed border border-transparent touch-target" style={{ animationDelay: '200ms' }}>
                <div className="p-2.5 sm:p-3 rounded-xl bg-slate-400 shadow-lg flex-shrink-0">
                  <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-600">System Settings</p>
                  <p className="text-xs text-slate-500">Coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - System Information */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* System Status Card */}
          <Card className="shadow-lg border-0">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-bold">System Status</CardTitle>
                  <CardDescription className="text-slate-600 text-sm mt-1">
                    Platform health and activity
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-semibold">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  Operational
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-4 w-4 text-[#224794]" />
                    <p className="text-xs font-medium text-slate-600">Database</p>
                  </div>
                  <p className="text-lg font-bold text-slate-900">Online</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-green-600" />
                    <p className="text-xs font-medium text-slate-600">System Load</p>
                  </div>
                  <p className="text-lg font-bold text-slate-900">Normal</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Notice Card */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-slate-50 border-blue-200">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-blue-900">Security Notice</CardTitle>
                  <CardDescription className="text-blue-700 text-xs mt-1">
                    Important information about admin access
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-2 text-sm text-blue-800">
                <p>• All administrative actions are logged for audit purposes</p>
                <p>• Only create users with appropriate roles and permissions</p>
                <p>• Regularly review user access and permissions</p>
                <p>• Report any suspicious activity immediately</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Admin Stats Grid Component
async function AdminStatsGrid() {
  const supabase = await createClient();

  // Fetch stats
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, role, status");

  const totalUsers = users?.length || 0;
  const activeUsers = users?.filter((u) => u.status === "active").length || 0;
  const adminUsers = users?.filter((u) => u.role === "admin").length || 0;
  const evaluatorUsers = users?.filter((u) => u.role === "evaluator").length || 0;

  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="shadow-lg border-0">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Users</p>
              <p className="text-2xl sm:text-3xl font-bold mt-2">{totalUsers}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg border-0">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Users</p>
              <p className="text-2xl sm:text-3xl font-bold mt-2">{activeUsers}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg border-0">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Administrators</p>
              <p className="text-2xl sm:text-3xl font-bold mt-2">{adminUsers}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg border-0">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Evaluators</p>
              <p className="text-2xl sm:text-3xl font-bold mt-2">{evaluatorUsers}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
