import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SidebarWrapper } from "./sidebar-wrapper";

const managementTeamAllowedPaths = new Set([
  "/programmer",
  "/programmer/calendar",
  "/programmer/one-liners",
  "/programmer/episodes",
  "/programmer/status-updater",
  "/programmer/contract-terms",
]);

// Programmer-specific navigation items
const programmerNavItems = [
  {
    title: "Dashboard",
    href: "/programmer",
    icon: "home",
  },
  {
    title: "Writer Commitments",
    href: "/programmer/writer-commitment",
    icon: "listChecks",
  },
  {
    title: "Delivery Rate",
    href: "/programmer/delivery-rate",
    icon: "activity",
  },
  {
    title: "One-Liners",
    href: "/programmer/one-liners",
    icon: "fileText",
    highlight: true,
  },
  {
    title: "Scripts & Episodes",
    href: "/programmer/episodes",
    icon: "film",
    highlight: true,
  },
  {
    title: "Status Report",
    href: "/programmer/status-updater",
    icon: "clipboardCheck",
  },
  {
    title: "Annual Targets",
    href: "/programmer/annual-targets",
    icon: "target",
  },
  {
    title: "Writer Contracts",
    href: "/programmer/contract-terms",
    icon: "handshake",
  },
  {
    title: "Content Aging",
    href: "/programmer/content-aging",
    icon: "barChart2",
  },
  {
    title: "Feedback Timeline",
    href: "/programmer/feedback-timeline",
    icon: "clock",
  },
  {
    title: "Missing Details",
    href: "/programmer/missing-details",
    icon: "alertCircle",
  },
  {
    title: "Calendar",
    href: "/programmer/calendar",
    icon: "calendar",
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

  // team_type from session cookie — no DB query needed
  let filteredNavItems = programmerNavItems;
  if (user.team_type === "management") {
    filteredNavItems = programmerNavItems.filter(
      (item) => managementTeamAllowedPaths.has(item.href)
    );
  }

  return (
    <SidebarWrapper
      userName={user.name || "Programmer"}
      userEmail={user.email}
      userPosition={user.position}
      navItems={filteredNavItems}
      showAIButton
    >
      {children}
    </SidebarWrapper>
  );
}
