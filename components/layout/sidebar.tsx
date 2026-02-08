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
  Users,
  DollarSign,
  AlertTriangle,
  Activity,
  Share2,
  Clock,
  UserPen,
  UserCheck,
  ListChecks,
  Map,
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
    dollarSign: DollarSign,
    alertTriangle: AlertTriangle,
    activity: Activity,
    share2: Share2,
    clock: Clock,
    userPen: UserPen,
    userCheck: UserCheck,
    listChecks: ListChecks,
    map: Map,
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
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300",
          isMobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={closeMobile}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-white z-50 flex flex-col transition-transform duration-300 ease-in-out",
          // Desktop - always visible
          "lg:w-70 lg:translate-x-0",
          // Mobile - slide in/out
          "w-[calc(100vw-3rem)] max-w-[280px]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header Section */}
        <div className="h-14 flex items-center justify-center px-4 border-b border-gray-200 bg-white flex-shrink-0 relative">
          {/* Logo - Centered */}
          <Link
            href={navItems[0]?.href || "/content-department"}
            className="transition-all duration-150"
            onClick={handleNavClick}
          >
            <span
              dir="rtl"
              lang="ur"
              className="font-urdu font-bold text-orange-500 text-xl"
            >
              داستان
            </span>
          </Link>

          {/* Mobile close button - Absolute positioned */}
          <Button
            variant="ghost"
            size="icon"
            onClick={closeMobile}
            className="lg:hidden h-8 w-8 absolute right-4 text-gray-700 hover:bg-gray-100"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation Section (scrollable) */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 border-r border-gray-200">
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
