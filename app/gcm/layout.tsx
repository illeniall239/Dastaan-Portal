import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SidebarWrapper } from "./sidebar-wrapper";

export default async function GcmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Redirect if user is not authenticated
  if (!user) {
    redirect("/login");
  }

  // Only allow GCM users
  if (user.role !== "gcm") {
    redirect("/dashboard");
  }

  const navItems = [
    { title: "Dashboard", href: "/gcm", icon: "home" },
    { title: "AI Assistant", href: "/gcm/ai-assistant", icon: "sparkles" },
    { title: "Calendar", href: "/gcm/calendar", icon: "calendar" },
    { title: "Writers", href: "/gcm/writers", icon: "userPen" },
    { title: "Team", href: "/gcm/team", icon: "users" },
    { title: "One-Liner Reports", href: "/gcm/call-reports", icon: "fileText" },
    { title: "Team Feedback", href: "/gcm/team-feedback", icon: "messageSquare" },
    { title: "One-Liner Evaluations", href: "/gcm/evaluations-list", icon: "clipboardList" },
    { title: "Incoming Evaluations", href: "/gcm/cross-team-shares", icon: "inbox" },
    { title: "Requested Evaluations", href: "/gcm/requested-evaluations", icon: "share2" },
    { title: "Episodes", href: "/gcm/episodes", icon: "film" },
    { title: "Status Report", href: "/gcm/status-updater", icon: "clipboardCheck" },
    { title: "Contract Terms", href: "/gcm/contract-terms", icon: "handshake" },
    { title: "Notifications", href: "/gcm/notifications", icon: "bell" },
  ];

  return (
    <SidebarWrapper
      userName={user.name || "User"}
      userEmail={user.email}
      userPosition={user.position}
      navItems={navItems}
      showAIButton
    >
      {children}
    </SidebarWrapper>
  );
}
