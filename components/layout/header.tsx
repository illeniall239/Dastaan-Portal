"use client";

import { useState, useCallback, memo } from "react";
import { Bell, CalendarIcon, FileTextIcon, CheckCircle2, Settings, LogOut, HomeIcon, ClipboardListIcon, Film, ClipboardCheck, Menu, X, Handshake, FileSpreadsheet, ChefHat } from "lucide-react";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotificationContext } from "@/lib/providers/notification-provider";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import Image from "next/image";

interface NavItem {
  title: string;
  href: string;
  icon: string; // Icon name as string instead of component
}

interface HeaderProps {
  userName: string;
  userEmail?: string;
  userPosition?: string;
  navItems?: NavItem[];
  dashboardHref?: string;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "meeting_scheduled":
      return <CalendarIcon className="h-4 w-4 text-blue-500" />;
    case "story_submitted":
      return <FileTextIcon className="h-4 w-4 text-orange-500" />;
    case "story_approved":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    default:
      return <Bell className="h-4 w-4 text-slate-500" />;
  }
}

function getTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

// Map icon names to icon components
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
    users: ClipboardListIcon,
  };
  return icons[iconName] || HomeIcon;
}

const defaultNavItems: NavItem[] = [
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
    title: "Status Report",
    href: "/content-department/status-updater",
    icon: "clipboardCheck",
  },
  {
    title: "Contract Terms",
    href: "/content-department/contract-terms",
    icon: "handshake",
  },
  // Settings and Help routes are not yet implemented; hide to avoid 404s
];

export const Header = memo(function Header({ userName, userEmail, userPosition, navItems = defaultNavItems, dashboardHref }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { notifications, unreadCount, handleMarkAsRead, handleMarkAllAsRead } = useNotificationContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Determine logo href: use dashboardHref prop, or first nav item, or default
  const logoHref = dashboardHref || (navItems && navItems[0]?.href) || "/content-department";

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/signout', {
        method: 'POST',
      });
      router.push('/login');
      router.refresh();
    } catch (error) {
      logger.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  }, [router]);

  return (
    <>
      {isLoggingOut && <LoadingSpinner text="Logging out..." />}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm safe-top">
        <div className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-3">
          {/* Left: Branding */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Brand */}
            <Link href={logoHref} className="flex items-center gap-3">
              <Image
                src="/Geo-Logo1.png"
                alt="Geo Logo"
                width={32}
                height={32}
                priority
                className="object-contain"
              />
              <div className="flex flex-col leading-none">
                <span dir="rtl" lang="ur" className="text-lg font-bold text-slate-900 font-urdu">داستان</span>
                <span className="text-sm font-semibold text-slate-700 -mt-1">Dastaan</span>
              </div>
            </Link>
          </div>

          {/* Center: Navigation Menu */}
          <nav className="hidden xl:flex flex-1 items-center justify-center gap-4">
            {navItems.map((item) => {
              const Icon = getIconComponent(item.icon);
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200",
                    isActive
                      ? "bg-[#224794] text-white shadow-md"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  )}
                  onClick={(e) => {
                    // Provide immediate pressed feedback
                    const target = e.currentTarget;
                    target.classList.add("scale-[0.99]");
                    setTimeout(() => target.classList.remove("scale-[0.99]"), 150);
                  }}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}
          </nav>

          {/* Right: Icons + Profile */}
          <div className="flex items-center gap-2">
            {/* Mobile hamburger */}
            <div className="xl:hidden">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open menu"
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                className="relative h-10 w-10 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5 text-slate-600" /> : <Menu className="h-5 w-5 text-slate-600" />}
              </Button>
            </div>

            {/* Notifications Dropdown */}
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-lg hover:bg-slate-100 transition-colors">
                  <Bell className="h-5 w-5 text-slate-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold shadow-lg animate-badge-pulse">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-96 rounded-2xl shadow-2xl border-slate-200">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <DropdownMenuLabel className="p-0 text-base font-bold">Notifications</DropdownMenuLabel>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-xs text-[#224794] hover:text-[#1a3670] hover:underline font-medium"
                      onClick={handleMarkAllAsRead}
                    >
                      Mark all as read
                    </Button>
                  )}
                </div>
                <div className="max-h-[450px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-500 font-medium">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className={cn(
                          "flex items-start gap-3 p-4 cursor-pointer transition-all m-1 rounded-xl",
                          !notification.is_read && "bg-blue-50 hover:bg-blue-100"
                        )}
                        onClick={() => {
                          if (!notification.is_read) {
                            handleMarkAsRead(notification.id);
                          }
                        }}
                      >
                        <div className="mt-0.5 p-2 rounded-lg bg-white shadow-sm">
                          {getNotificationIcon(notification.entity_type || "")}
                        </div>
                        <div className="flex-1 space-y-1 min-w-0">
                          <p className="text-sm font-semibold leading-snug text-slate-900">
                            {notification.title}
                          </p>
                          {notification.message && (
                            <p className="text-xs text-slate-600 line-clamp-2">
                              {notification.message}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 font-medium" suppressHydrationWarning>
                            {getTimeAgo(notification.created_at)}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <div className="h-2 w-2 rounded-full bg-[#224794] mt-2 flex-shrink-0" />
                        )}
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-9 w-9 rounded-full bg-[#224794] flex items-center justify-center text-white font-bold text-xs shadow-md hover:shadow-lg transition-all" aria-label="Profile menu">
                  {userName.charAt(0).toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-64">
                <div className="px-3 py-3 border-b">
                  <p className="text-sm font-semibold text-slate-900">{userName}</p>
                  {userEmail && (
                    <p className="text-xs text-slate-500 mt-0.5">{userEmail}</p>
                  )}
                  {userPosition && (
                    <p className="text-xs text-slate-500 mt-0.5">{userPosition}</p>
                  )}
                </div>
                {/* Settings/Help hidden until pages exist */}
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile menu panel */}
        {isMobileMenuOpen && (
          <div className="xl:hidden border-b bg-white">
            <nav className="px-4 sm:px-6 py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = getIconComponent(item.icon);
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium",
                      isActive ? "bg-[#224794] text-white" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>
    </>
  );
});
