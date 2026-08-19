"use client";

import { BsPillNav } from "./bs-pill-nav";

interface NavItem {
  title: string;
  href: string;
  icon: string;
}

interface BsLayoutWrapperProps {
  userName: string;
  userEmail?: string;
  userPosition?: string;
  teamName?: string | null;
  navItems: NavItem[];
  showAIButton?: boolean;
  children: React.ReactNode;
}

export function BsLayoutWrapper({
  userName,
  userEmail,
  userPosition,
  teamName,
  navItems,
  showAIButton,
  children,
}: BsLayoutWrapperProps) {
  return (
    <div className="bento-studio min-h-screen">
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-4 md:py-5 space-y-4">
        <BsPillNav
          userName={userName}
          userEmail={userEmail}
          userPosition={userPosition}
          teamName={teamName}
          navItems={navItems}
          showAIButton={showAIButton}
        />
        <main>{children}</main>
      </div>
    </div>
  );
}
