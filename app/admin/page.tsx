import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, UserPlus, Shield, Database, Activity, CheckCircle2 } from "lucide-react";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ModernStatCard } from "@/components/dashboard/modern-stat-card";
import { ModernContentCard } from "@/components/dashboard/modern-content-card";

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
    <div className="mobile-container mobile-section space-y-6 animate-fade-in">
      {/* Page Header with Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
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

      {/* Dashboard Content */}
      <Suspense fallback={<DashboardContentSkeleton />}>
        <AdminDashboardContent />
      </Suspense>
    </div>
  );
}

// Admin Dashboard Content Component
async function AdminDashboardContent() {
  const supabase = await createClient();

  // Fetch stats
  const { data: users } = await supabase
    .from("users")
    .select("id, role, status");

  const totalUsers = users?.length || 0;
  const activeUsers = users?.filter((u) => u.status === "active").length || 0;
  const adminUsers = users?.filter((u) => u.role === "admin").length || 0;
  const evaluatorUsers = users?.filter((u) => u.role === "evaluator").length || 0;

  const quickActions = [
    {
      icon: Users,
      label: "User Management",
      description: "View and manage users",
      href: "/admin/users",
    },
    {
      icon: UserPlus,
      label: "Create New User",
      description: "Add user to system",
      href: "/admin/users/new",
    },
  ];

  return (
    <>
      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ModernStatCard
          title="Total Users"
          value={totalUsers}
          icon={Users}
          href="/admin/users"
          accent={true}
        />

        <ModernStatCard
          title="Active Users"
          value={activeUsers}
          icon={Activity}
          href="/admin/users"
        />

        <ModernStatCard
          title="Administrators"
          value={adminUsers}
          icon={Shield}
          href="/admin/users"
        />

        <ModernStatCard
          title="Evaluators"
          value={evaluatorUsers}
          icon={Users}
          href="/admin/users"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <ModernContentCard
          title="Quick Actions"
          subtitle="Common administrative tasks"
        >
          <div className="space-y-2">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link
                  key={index}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                >
                  <Icon className="h-5 w-5 text-gray-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {action.label}
                    </p>
                    <p className="text-xs text-gray-500">{action.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </ModernContentCard>

        {/* System Status */}
        <ModernContentCard
          title="System Status"
          subtitle="Platform health and activity"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-900">Operational Status</span>
              </div>
              <span className="text-xs font-bold text-green-700 bg-green-200 px-2 py-1 rounded-full">
                Normal
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <Database className="h-4 w-4 text-[#224794]" />
                  <p className="text-xs font-medium text-slate-600">Database</p>
                </div>
                <p className="text-sm font-bold text-slate-900">Online</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-green-600" />
                  <p className="text-xs font-medium text-slate-600">System Load</p>
                </div>
                <p className="text-sm font-bold text-slate-900">Normal</p>
              </div>
            </div>
          </div>
        </ModernContentCard>

        {/* Security Notice */}
        <ModernContentCard
          title="Security Notice"
          subtitle="Important information about admin access"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Shield className="h-6 w-6 text-[#224794]" />
            </div>
            <div className="text-sm text-gray-600 space-y-2">
              <p>• All administrative actions are logged for audit purposes</p>
              <p>• Only create users with appropriate roles and permissions</p>
              <p>• Regularly review user access and permissions</p>
            </div>
          </div>
        </ModernContentCard>
      </div>
    </>
  );
}

// Skeleton for Dashboard Content
function DashboardContentSkeleton() {
  return (
    <>
      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md"
          >
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="h-12 w-16 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ))}
      </div>

      {/* Content Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md"
          >
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="h-20 bg-gray-100 rounded-lg animate-pulse"
                ></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
