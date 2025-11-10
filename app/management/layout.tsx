import { Header } from "@/components/layout/header";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import "./print.css";

// Management-specific navigation items
const managementNavItems = [
  {
    title: "Dashboard",
    href: "/management",
    icon: "home",
  },
  {
    title: "Calendar",
    href: "/management/calendar",
    icon: "calendar",
  },
  {
    title: "Story Bank",
    href: "/management/story-bank",
    icon: "fileText",
  },
];

export default async function ManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Redirect if user is not authenticated
  if (!user) {
    redirect("/login");
  }

  // Only allow management, executive, and admin roles
  if (!["admin", "management", "executive"].includes(user.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header - Navbar */}
      <Header
        userName={user.name || "Management"}
        userEmail={user.email}
        userPosition={user.position}
        navItems={managementNavItems}
      />

      {/* Main Content - Full Width */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
