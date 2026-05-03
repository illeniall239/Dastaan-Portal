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
    {
      title: "Dashboard",
      href: "/gcm",
      icon: "home",
    },
    {
      title: "Calendar",
      href: "/gcm/calendar",
      icon: "calendar",
    },
    {
      title: "Writer Engagement Reports",
      href: "/gcm/call-reports",
      icon: "fileText",
    },
    {
      title: "Episodes",
      href: "/gcm/episodes",
      icon: "film",
    },
    {
      title: "Notifications",
      href: "/gcm/notifications",
      icon: "bell",
    },
  ];

  return (
    <SidebarWrapper
      userName={user.name || "User"}
      userEmail={user.email}
      userPosition={user.position}
      navItems={navItems}
    >
      {children}
    </SidebarWrapper>
  );
}
