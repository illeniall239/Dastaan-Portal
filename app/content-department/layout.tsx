import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SidebarWrapper } from "./sidebar-wrapper";

export default async function ContentDepartmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Redirect if user is not authenticated or not in content department
  if (!user) {
    redirect("/login");
  }

  // Only allow content department users (both managers and creators)
  // Evaluators are not allowed in the main content department area
  if (user.role !== "content_creator" && user.role !== "content_manager") {
    redirect("/dashboard");
  }

  const navItems = [
    {
      title: "Dashboard",
      href: "/content-department",
      icon: "home",
    },
    {
      title: "Calendar",
      href: "/content-department/calendar",
      icon: "calendar",
    },
    {
      title: "Writer Engagement Reports",
      href: "/content-department/call-reports",
      icon: "fileText",
    },
    {
      title: "Episodes",
      href: "/content-department/episodes",
      icon: "film",
    },
    {
      title: "Writers",
      href: "/content-department/writers",
      icon: "userPen",
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