import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import "./print.css";
import { SidebarWrapper } from "./sidebar-wrapper";

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
    title: "What's Cooking",
    href: "/management/whats-cooking",
    icon: "chefHat",
  },
  {
    title: "Script Bank",
    href: "/management/story-bank",
    icon: "fileText",
  },
  {
    title: "Idea Roadmap",
    href: "/management/roadmap",
    icon: "map",
  },
  {
    title: "Project Status",
    href: "/management/status-updater",
    icon: "listChecks",
  },
  {
    title: "Evaluations",
    href: "/management/evaluations",
    icon: "clipboardCheck",
  },
  {
    title: "Evaluation Requests",
    href: "/management/cross-team-shares",
    icon: "share2",
  },
  {
    title: "Teams",
    href: "/management/teams",
    icon: "users",
  },
  {
    title: "Writer Engagement",
    href: "/management/writers",
    icon: "penTool",
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
    <SidebarWrapper
      userName={user.name || "Management"}
      userEmail={user.email}
      userPosition={user.position}
      navItems={managementNavItems}
    >
      {children}
    </SidebarWrapper>
  );
}
