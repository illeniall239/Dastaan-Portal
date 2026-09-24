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
    title: "One-Liners",
    href: "/evaluator/one-liners",
    icon: "fileText",
    highlight: true,
  },
  {
    title: "Scripts & Episodes",
    href: "/evaluator/episodes",
    icon: "film",
    highlight: true,
  },
  {
    title: "Team Feedback",
    href: "/evaluator/team-feedback",
    icon: "users",
  },
  {
    title: "My Team",
    href: "/evaluator/team",
    icon: "users",
  },
  {
    title: "Writer Contracts",
    href: "/evaluator/contract-terms",
    icon: "handshake",
  },
  {
    title: "Calendar",
    href: "/evaluator/calendar",
    icon: "calendar",
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
      showAIButton
    >
      {children}
    </SidebarWrapper>
  );
}