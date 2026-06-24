import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SidebarWrapper } from "./sidebar-wrapper";
import { AssistantChat } from "@/components/ui/assistant-chat";

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
    title: "Writers",
    href: "/programmer/writers",
    icon: "userPen",
  },
  {
    title: "Writer Commitments",
    href: "/programmer/writer-commitment",
    icon: "listChecks",
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
    title: "Idea Roadmap",
    href: "/programmer/roadmap",
    icon: "map",
  },
  {
    title: "Cross-Team Shares Tracking",
    href: "/programmer/cross-team-shares",
    icon: "share2",
  },
  {
    title: "Requested Evaluations",
    href: "/programmer/requested-evaluations",
    icon: "clipboardCheck",
  },
  {
    title: "Missing Details",
    href: "/programmer/missing-details",
    icon: "alertCircle",
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
    <>
      <SidebarWrapper
        userName={user.name || "Programmer"}
        userEmail={user.email}
        userPosition={user.position}
        navItems={programmerNavItems}
      >
        {children}
      </SidebarWrapper>
      <AssistantChat portalKey="programmer" />
    </>
  );
}
