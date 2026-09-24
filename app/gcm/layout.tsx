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
    { title: "One-Liners", href: "/gcm/one-liners", icon: "fileText", highlight: true },
    { title: "Scripts & Episodes", href: "/gcm/episodes", icon: "film", highlight: true },
    { title: "Team Feedback", href: "/gcm/team-feedback", icon: "users" },
    { title: "My Team", href: "/gcm/team", icon: "users" },
    { title: "Writer Contracts", href: "/gcm/contract-terms", icon: "handshake" },
    { title: "Calendar", href: "/gcm/calendar", icon: "calendar" },
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
