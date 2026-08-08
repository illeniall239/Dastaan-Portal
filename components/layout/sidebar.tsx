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
  PanelLeftClose,
  PanelLeftOpen,
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
  Inbox,
  ChartNoAxesCombined,
  Bell,
  MessageSquare,
  MessageSquarePlus,
  Sparkles,
  Target,
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
    inbox: Inbox,
    chartNoAxesCombined: ChartNoAxesCombined,
    bell: Bell,
    messageSquare: MessageSquare,
    messageSquarePlus: MessageSquarePlus,
    sparkles: Sparkles,
    target: Target,
  };
  return icons[iconName] || HomeIcon;
}

export const Sidebar = memo(function Sidebar({
  navItems = []
}: SidebarProps) {
  const pathname = usePathname();
  const { isCollapsed, isMobileOpen, toggleCollapse, closeMobile } = useSidebar();

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
          "fixed top-0 left-0 h-full bg-white z-50 flex flex-col transition-all duration-300 ease-in-out border-r border-gray-200",
          // Desktop - always visible, width depends on collapse state
          isCollapsed ? "lg:w-16" : "lg:w-70",
          "lg:translate-x-0",
          // Mobile - always expanded, slide in/out
          "w-[calc(100vw-3rem)] max-w-[280px]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header Section */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-gray-200 bg-white flex-shrink-0">
          {/* Desktop: Logo + toggle */}
          {!isCollapsed && (
            <Link
              href={navItems[0]?.href || "/content-department"}
              className="hidden lg:block font-heading font-bold text-[#224794] text-base"
              onClick={handleNavClick}
            >
              Dastaan
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            className="hidden lg:flex h-9 w-9 text-gray-700 hover:bg-gray-100 flex-shrink-0"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>

          {/* Mobile: Logo + close button */}
          <div className="lg:hidden flex items-center justify-between w-full px-2">
            <Link
              href={navItems[0]?.href || "/content-department"}
              className="font-heading font-bold text-[#224794] text-base"
              onClick={handleNavClick}
            >
              Dastaan
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeMobile}
              className="h-8 w-8 text-gray-700 hover:bg-gray-100"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Navigation Section (scrollable) */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = getIconComponent(item.icon);
              const isActive = pathname === item.href;

              return (
                <li key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    prefetch
                    onClick={handleNavClick}
                    className={cn(
                      "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150",
                      isCollapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                      isActive
                        ? "bg-blue-50 text-[#224794] border-l-4 border-[#224794]"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.title}</span>}
                  </Link>
                  {/* Tooltip on hover when collapsed */}
                  {isCollapsed && (
                    <div className="hidden lg:group-hover:flex absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap z-[100] shadow-lg">
                      {item.title}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
});
