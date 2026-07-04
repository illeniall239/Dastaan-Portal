import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import "./print.css";
import { SidebarWrapper } from "./sidebar-wrapper";
import { AssistantChat } from "@/components/ui/assistant-chat";

const baseNavItems = [
  { title: "Dashboard",           href: "/management",                    icon: "home" },
  { title: "Calendar",            href: "/management/calendar",           icon: "calendar" },
  { title: "Writer Engagement",   href: "/management/writers",            icon: "userPen" },
  { title: "Active Projects",      href: "/management/whats-cooking",      icon: "chefHat" },
  { title: "Script Bank",         href: "/management/story-bank",         icon: "fileText" },
  { title: "Idea Roadmap",        href: "/management/roadmap",            icon: "map" },
  { title: "Project Status",      href: "/management/status-updater",     icon: "listChecks" },
  { title: "Evaluations",         href: "/management/evaluations",        icon: "clipboardCheck" },
  { title: "Evaluations by Story",  href: "/management/evaluator-bias",     icon: "chartNoAxesCombined" },
  { title: "Content Aging",             href: "/management/content-aging",      icon: "clock" },
  { title: "Cross-Team Shares Tracking", href: "/management/cross-team-shares",  icon: "share2" },
  { title: "Teams",               href: "/management/teams",              icon: "users" },
];

const pendingEvaluationsItem = {
  title: "Pending Evaluations",
  href: "/management/pending-evaluations",
  icon: "inbox",
};

export default async function ManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  if (!["admin", "management", "executive"].includes(user.role)) {
    redirect("/dashboard");
  }

  // Approval Tracking is visible to all management members
  const navItems = [...baseNavItems.slice(0, 7), pendingEvaluationsItem, ...baseNavItems.slice(7)];

  return (
    <>
      <SidebarWrapper
        userName={user.name || "Management"}
        userEmail={user.email}
        userPosition={user.position}
        navItems={navItems}
      >
        {children}
      </SidebarWrapper>
      <AssistantChat portalKey="management" />
    </>
  );
}
