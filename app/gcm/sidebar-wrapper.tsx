"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { TopBar } from "@/components/layout/top-bar";
import { useSidebar } from "@/lib/providers/sidebar-provider";

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
  const { toggleMobile } = useSidebar();
  const [mounted, setMounted] = useState(false);

  // Only render interactive components after mounting to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        navItems={navItems}
      />
      <MobileHeader onMenuClick={toggleMobile} />
      {mounted && (
        <TopBar
          userName={userName}
          userEmail={userEmail}
          userPosition={userPosition}
        />
      )}
      <div className="flex flex-col flex-1 transition-all duration-150 lg:ml-70 pt-14">
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
