import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SidebarWrapper } from "./sidebar-wrapper";

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
    {
      title: "Audit Logs",
      href: "/admin/audit-logs",
      icon: "fileText",
    },
    {
      title: "Login Activity",
      href: "/admin/login-activity",
      icon: "activity",
    },
    {
      title: "Settings",
      href: "/admin/settings",
      icon: "settings",
    },
  ];

  return (
    <SidebarWrapper
      userName={user.name || "Admin"}
      userEmail={user.email}
      userPosition={user.position || "Administrator"}
      navItems={navItems}
    >
      {children}
    </SidebarWrapper>
  );
}
