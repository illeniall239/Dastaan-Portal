import { Header } from "@/components/layout/header";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Redirect if user is not authenticated or not admin
  if (!user) {
    redirect("/login");
  }

  // Only allow admin users
  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  const navItems = [
    {
      title: "Dashboard",
      href: "/admin",
      icon: "home",
    },
    {
      title: "User Management",
      href: "/admin/users",
      icon: "clipboardList",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header - Navbar */}
      <Header
        userName={user.name || "Admin"}
        userEmail={user.email}
        userPosition={user.position || "Administrator"}
        navItems={navItems}
        dashboardHref="/admin"
      />

      {/* Main Content - Full Width */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
