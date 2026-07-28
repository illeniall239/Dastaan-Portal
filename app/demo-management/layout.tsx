"use client";

import { SidebarProvider } from "@/lib/providers/sidebar-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { TopBar } from "@/components/layout/top-bar";
import { useSidebar } from "@/lib/providers/sidebar-provider";

const demoNavItems = [
  {
    title: "Dashboard",
    href: "/demo-management",
    icon: "home",
  },
  {
    title: "Active Projects",
    href: "/demo-management/whats-cooking",
    icon: "chefHat",
  },
  {
    title: "Calendar",
    href: "/demo-management/calendar",
    icon: "calendar",
  },
  {
    title: "Script Bank",
    href: "/demo-management/story-bank",
    icon: "fileText",
  },
  {
    title: "Teams",
    href: "/demo-management/teams",
    icon: "users",
  },
];

function DemoSidebarWrapper({ children }: { children: React.ReactNode }) {
  const { isCollapsed, toggleMobile } = useSidebar();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar navItems={demoNavItems} />
      <MobileHeader onMenuClick={toggleMobile} />
      <TopBar
        userName="Demo User"
        userEmail="demo@geo.com"
        userPosition="Management Demo"
        isDemoMode={true}
      />
      <div className={`flex flex-col flex-1 transition-all duration-300 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-70'} pt-16`}>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

export default function DemoManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DemoSidebarWrapper>{children}</DemoSidebarWrapper>
    </SidebarProvider>
  );
}
