import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SidebarWrapper } from "./sidebar-wrapper";

// Programmer-specific navigation items
const programmerNavItems = [
  {
    title: "Dashboard",
    href: "/programmer",
    icon: "home",
  },
  {
    title: "Calendar",
    href: "/programmer/calendar",
    icon: "calendar",
  },
  {
    title: "Writer Engagement Reports",
    href: "/programmer/call-reports",
    icon: "fileText",
  },
  {
    title: "One-Liner Evaluations",
    href: "/programmer/evaluations-list",
    icon: "clipboardList",
  },
  {
    title: "Episodes",
    href: "/programmer/episodes",
    icon: "film",
  },
  {
    title: "Status Report",
    href: "/programmer/status-updater",
    icon: "clipboardCheck",
  },
  {
    title: "Contract Terms",
    href: "/programmer/contract-terms",
    icon: "handshake",
  },
];

export default async function ProgrammerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Redirect if user is not authenticated
  if (!user) {
    redirect("/login");
  }

  // Allow programmer, management, and admin roles
  if (!["programmer", "management", "admin"].includes(user.role)) {
    redirect("/dashboard");
  }

  return (
    <SidebarWrapper
      userName={user.name || "Programmer"}
      userEmail={user.email}
      userPosition={user.position}
      navItems={programmerNavItems}
    >
      {children}
    </SidebarWrapper>
  );
}
