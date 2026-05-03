import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SidebarWrapper } from "./sidebar-wrapper";

// Evaluator-specific navigation items
const evaluatorNavItems = [
  {
    title: "Dashboard",
    href: "/evaluator",
    icon: "home",
  },
  {
    title: "Calendar",
    href: "/evaluator/calendar",
    icon: "calendar",
  },
  {
    title: "Writers",
    href: "/evaluator/writers",
    icon: "userPen",
  },
  {
    title: "Team",
    href: "/evaluator/team",
    icon: "users",
  },
  // Temporarily hidden - will be enabled later
  // {
  //   title: "One-Liner",
  //   href: "/evaluator/one-liner",
  //   icon: "penLine",
  // },
  // {
  //   title: "Characters",
  //   href: "/evaluator/characters",
  //   icon: "users",
  // },
  {
    title: "Writer Engagement Reports",
    href: "/evaluator/call-reports",
    icon: "fileText",
  },
  {
    title: "Team Feedback",
    href: "/evaluator/team-feedback",
    icon: "users",
  },
  {
    title: "One-Liner Evaluations",
    href: "/evaluator/evaluations-list",
    icon: "clipboardList",
  },
  {
    title: "Incoming Evaluations",
    href: "/evaluator/cross-team-shares",
    icon: "inbox",
  },
  {
    title: "Requested Evaluations",
    href: "/evaluator/requested-evaluations",
    icon: "share2",
  },
  {
    title: "Episodes",
    href: "/evaluator/episodes",
    icon: "film",
  },
  {
    title: "Status Report",
    href: "/evaluator/status-updater",
    icon: "clipboardCheck",
  },
  {
    title: "Contract Terms",
    href: "/evaluator/contract-terms",
    icon: "handshake",
  },
  {
    title: "Notifications",
    href: "/evaluator/notifications",
    icon: "bell",
  },
];

export default async function EvaluatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Redirect if user is not authenticated
  if (!user) {
    redirect("/login");
  }

  // Only allow evaluators
  if (user.role !== "evaluator") {
    redirect("/dashboard");
  }

  return (
    <SidebarWrapper
      userName={user.name || "Evaluator"}
      userEmail={user.email}
      userPosition={user.position}
      navItems={evaluatorNavItems}
    >
      {children}
    </SidebarWrapper>
  );
}