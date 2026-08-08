import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { SidebarWrapper } from "./sidebar-wrapper";

// Tabs hidden from management-type teams (e.g., Humera's team)
const managementTeamHiddenPaths = new Set([
  "/programmer/missing-details",
  "/programmer/content-aging",
  "/programmer/writer-commitment",
  "/programmer/feedback-timeline",
  "/programmer/roadmap",
  "/programmer/cross-team-shares",
]);

// Programmer-specific navigation items
const programmerNavItems = [
  {
    title: "Dashboard",
    href: "/programmer",
    icon: "home",
  },
  {
    title: "AI Assistant",
    href: "/programmer/ai-assistant",
    icon: "sparkles",
  },
  {
    title: "Calendar",
    href: "/programmer/calendar",
    icon: "calendar",
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
    title: "One-Liner Reports",
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
    title: "Annual Targets",
    href: "/programmer/annual-targets",
    icon: "target",
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

  // Check if user is on a management-type team to hide certain nav items
  let filteredNavItems = programmerNavItems;
  if (["programmer", "management"].includes(user.role)) {
    const adminClient = createAdminClient();
    const { data: userProfile } = await adminClient
      .from("users")
      .select("team_id")
      .eq("id", user.id)
      .single();
    if (userProfile?.team_id) {
      const { data: team } = await adminClient
        .from("teams")
        .select("team_type")
        .eq("id", userProfile.team_id)
        .single();
      if (team?.team_type === "management") {
        filteredNavItems = programmerNavItems.filter(
          (item) => !managementTeamHiddenPaths.has(item.href)
        );
      }
    }
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
