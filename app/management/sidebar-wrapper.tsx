"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { useSidebar } from "@/lib/providers/sidebar-provider";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: string;
}

interface SidebarWrapperProps {
  userName: string;
  userEmail?: string;
  userPosition?: string;
  navItems: NavItem[];
  children: React.ReactNode;
}

export function SidebarWrapper({
  userName,
  userEmail,
  userPosition,
  navItems,
  children,
}: SidebarWrapperProps) {
  const { isCollapsed, toggleMobile } = useSidebar();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        userName={userName}
        userEmail={userEmail}
        userPosition={userPosition}
        navItems={navItems}
      />
      <MobileHeader onMenuClick={toggleMobile} />
      <div
        className={cn(
          "flex flex-col flex-1 transition-all duration-150",
          isCollapsed ? "lg:ml-20" : "lg:ml-70",
          "pt-16 lg:pt-0"
        )}
      >
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
