import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Users, UserPlus, Shield, Settings, Database, Activity } from "lucide-react";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { BentoGrid } from "@/components/dashboard/bento-grid";
import { BentoCard } from "@/components/dashboard/bento-card";
import { EnhancedStatCard } from "@/components/dashboard/enhanced-stat-card";
import { EnhancedQuickActions } from "@/components/dashboard/enhanced-quick-actions";

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

      {/* Bento Grid Dashboard */}
      <Suspense fallback={<div className="h-96 bg-slate-200 animate-pulse rounded-lg" />}>
        <AdminBentoDashboard />
      </Suspense>
    </div>
  );
}

// Admin Bento Dashboard Component
async function AdminBentoDashboard() {
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
      icon: "Users",
      label: "User Management",
      description: "View and manage users",
      href: "/admin/users",
      color: "blue" as const,
    },
    {
      icon: "UserPlus",
      label: "Create New User",
      description: "Add user to system",
      href: "/admin/users/new",
      color: "green" as const,
    },
  ];

  return (
    <BentoGrid>
      {/* Hero Card - Total Users (2x2) - LUXURY MINIMAL */}
      <EnhancedStatCard
        title="Total Users"
        value={totalUsers}
        icon="Users"
        size="2x2"
        variant="hero"
        gradient="blue"
        borderAccent="left"
        accentColor="blue"
        href="/admin/users"
        luxuryMinimal
      />

      {/* Active Users (1x1) - LUXURY MINIMAL */}
      <EnhancedStatCard
        title="Active Users"
        value={activeUsers}
        icon="Activity"
        size="1x1"
        variant="metric"
        gradient="green"
        borderAccent="top"
        accentColor="green"
        href="/admin/users"
        luxuryMinimal
      />

      {/* Administrators (1x1) - LUXURY MINIMAL */}
      <EnhancedStatCard
        title="Administrators"
        value={adminUsers}
        icon="Shield"
        size="1x1"
        variant="metric"
        gradient="purple"
        borderAccent="top"
        accentColor="red"
        href="/admin/users"
        luxuryMinimal
      />

      {/* Quick Actions (1x2) - LUXURY MINIMAL */}
      <BentoCard
        size="1x2"
        variant="content"
        gradient="none"
        minimalist
      >
        <div className="h-full flex flex-col">
          <div className="mb-4">
            <h3 className="luxury-text-label text-neutral-700">Quick Actions</h3>
            <p className="luxury-text-micro text-neutral-500 mt-1">Common administrative tasks</p>
          </div>
          <EnhancedQuickActions actions={quickActions} luxuryMinimal />
        </div>
      </BentoCard>

      {/* System Status (2x1) - LUXURY MINIMAL */}
      <BentoCard
        size="2x1"
        variant="content"
        gradient="none"
        minimalist
      >
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="luxury-text-label text-neutral-700">System Status</h3>
              <p className="luxury-text-micro text-neutral-500 mt-1">Platform health and activity</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              Operational
            </div>
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
      </BentoCard>

      {/* Security Notice (2x2) - LUXURY MINIMAL */}
      <BentoCard
        size="2x2"
        variant="content"
        gradient="none"
        minimalist
      >
        <div>
          <div className="flex items-start gap-3 mb-4">
            <div className="luxury-icon-outline w-12 h-12">
              <Shield className="h-6 w-6 text-[#224794]" />
            </div>
            <div>
              <h3 className="luxury-text-label text-neutral-700">Security Notice</h3>
              <p className="luxury-text-micro text-neutral-500 mt-1">
                Important information about admin access
              </p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-neutral-700">
            <p>• All administrative actions are logged for audit purposes</p>
            <p>• Only create users with appropriate roles and permissions</p>
            <p>• Regularly review user access and permissions</p>
            <p>• Report any suspicious activity immediately</p>
          </div>
        </div>
      </BentoCard>

      {/* Evaluators (1x1) - LUXURY MINIMAL */}
      <EnhancedStatCard
        title="Evaluators"
        value={evaluatorUsers}
        icon="Users"
        size="1x1"
        variant="metric"
        gradient="orange"
        borderAccent="top"
        accentColor="orange"
        href="/admin/users"
        luxuryMinimal
      />
    </BentoGrid>
  );
}
