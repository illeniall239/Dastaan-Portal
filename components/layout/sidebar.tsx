"use client";

import { memo } from "react";
import {
  CalendarIcon,
  FileTextIcon,
  HomeIcon,
  ClipboardListIcon,
  Film,
  ClipboardCheck,
  Handshake,
  FileSpreadsheet,
  Settings,
  ChefHat,
  X,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/lib/providers/sidebar-provider";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  title: string;
  href: string;
  icon: string;
}

interface SidebarProps {
  navItems?: NavItem[];
}

function getIconComponent(iconName: string) {
  const icons: Record<string, React.ElementType> = {
    home: HomeIcon,
    calendar: CalendarIcon,
    fileText: FileTextIcon,
    clipboardList: ClipboardListIcon,
    clipboardCheck: ClipboardCheck,
    film: Film,
    handshake: Handshake,
    fileSpreadsheet: FileSpreadsheet,
    settings: Settings,
    chefHat: ChefHat,
    users: Users,
  };
  return icons[iconName] || HomeIcon;
}

export const Sidebar = memo(function Sidebar({
  navItems = []
}: SidebarProps) {
  const pathname = usePathname();
  const { isMobileOpen, closeMobile } = useSidebar();

  const handleNavClick = () => {
    if (isMobileOpen) {
      closeMobile();
    }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 transition-all duration-150 flex-col",
          // Desktop - always visible as flex
          "hidden lg:flex lg:w-70",
          // Mobile - only visible when open
          isMobileOpen ? "flex w-[calc(100vw-3rem)] max-w-[280px]" : "hidden lg:flex"
        )}
      >
        {/* Header Section */}
        <div className="h-16 flex items-center justify-center px-4 border-b border-gray-200 flex-shrink-0 relative">
          {/* Logo - Centered */}
          <Link
            href={navItems[0]?.href || "/content-department"}
            className="transition-all duration-150"
            onClick={handleNavClick}
          >
            <span
              dir="rtl"
              lang="ur"
              className="font-urdu font-bold text-[#f79224] text-2xl"
            >
              داستان
            </span>
          </Link>

          {/* Mobile close button - Absolute positioned */}
          <Button
            variant="ghost"
            size="icon"
            onClick={closeMobile}
            className="lg:hidden h-8 w-8 absolute right-4"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation Section (scrollable) */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = getIconComponent(item.icon);
              const isActive = pathname === item.href;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch
                    onClick={handleNavClick}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                      isActive
                        ? "bg-blue-50 text-[#224794] border-l-4 border-[#224794]"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
});
