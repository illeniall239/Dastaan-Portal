import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import "./print.css";
import { SidebarWrapper } from "./sidebar-wrapper";
import { MANDATORY_APPROVER_EMAILS } from "@/lib/approvals/config";

const baseNavItems = [
  { title: "Dashboard",           href: "/management",                    icon: "home" },
  { title: "Calendar",            href: "/management/calendar",           icon: "calendar" },
  { title: "Writer Engagement",   href: "/management/writers",            icon: "userPen" },
  { title: "What's Cooking",      href: "/management/whats-cooking",      icon: "chefHat" },
  { title: "Script Bank",         href: "/management/story-bank",         icon: "fileText" },
  { title: "Idea Roadmap",        href: "/management/roadmap",            icon: "map" },
  { title: "Project Status",      href: "/management/status-updater",     icon: "listChecks" },
  { title: "Evaluations",         href: "/management/evaluations",        icon: "clipboardCheck" },
  { title: "Evaluation Requests", href: "/management/cross-team-shares",  icon: "share2" },
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

  // Pending Evaluations is only visible to the mandatory approvers (Humera & Salman)
  const isMandatoryApprover = MANDATORY_APPROVER_EMAILS.includes(user.email || "");
  const navItems = isMandatoryApprover
    ? [...baseNavItems.slice(0, 7), pendingEvaluationsItem, ...baseNavItems.slice(7)]
    : baseNavItems;

  return (
    <SidebarWrapper
      userName={user.name || "Management"}
      userEmail={user.email}
      userPosition={user.position}
      navItems={navItems}
    >
      {children}
    </SidebarWrapper>
  );
}
