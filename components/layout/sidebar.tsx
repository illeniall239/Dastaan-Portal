"use client";

import { useState, useCallback, memo } from "react";
import {
  Bell,
  CalendarIcon,
  FileTextIcon,
  CheckCircle2,
  LogOut,
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
import { useSidebar } from "@/lib/providers/sidebar-provider";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface NavItem {
  title: string;
  href: string;
  icon: string;
}

interface SidebarProps {
  userName: string;
  userEmail?: string;
  userPosition?: string;
  navItems?: NavItem[];
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
  userName,
  userEmail,
  userPosition,
  navItems = []
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { notifications, unreadCount, handleMarkAsRead, handleMarkAllAsRead } = useNotificationContext();
  const { isMobileOpen, closeMobile } = useSidebar();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  const handleNavClick = () => {
    if (isMobileOpen) {
      closeMobile();
    }
  };

  return (
    <>
      {isLoggingOut && <LoadingSpinner text="Logging out..." />}

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
        <div className="h-16 flex items-center px-4 border-b border-gray-200 flex-shrink-0 gap-2">
          {/* Logo */}
          <div className="flex-1 flex justify-center">
            <Link
              href={navItems[0]?.href || "/content-department"}
              className="transition-all duration-150"
              onClick={handleNavClick}
            >
              <span
                dir="rtl"
                lang="ur"
                className="font-urdu font-bold text-center text-[#f79224] text-xl"
              >
                داستان
              </span>
            </Link>
          </div>

          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={closeMobile}
            className="lg:hidden h-8 w-8 flex-shrink-0"
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

        {/* Footer Section */}
        <div className="border-t border-gray-200 p-2 flex-shrink-0">
          <div className="flex gap-2">
            {/* Notifications Dropdown */}
            <DropdownMenu open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-10 w-10 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Bell className="h-5 w-5 text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold shadow-sm">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="top"
                className="w-[calc(100vw-2rem)] max-w-96 rounded-xl shadow-2xl border-gray-200"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
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
                      <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 font-medium">No notifications yet</p>
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
                          <p className="text-sm font-semibold leading-snug text-gray-900">
                            {notification.title}
                          </p>
                          {notification.message && (
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {notification.message}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 font-medium" suppressHydrationWarning>
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
                <button
                  className="h-10 rounded-lg bg-[#224794] flex items-center justify-center text-white font-semibold text-sm hover:bg-[#1a3670] transition-all gap-2 flex-1 px-3"
                  aria-label="Profile menu"
                >
                  <span className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium truncate">{userName}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="top"
                className="w-[calc(100vw-2rem)] max-w-64"
              >
                <div className="px-3 py-3 border-b">
                  <p className="text-sm font-semibold text-gray-900">{userName}</p>
                  {userEmail && (
                    <p className="text-xs text-gray-500 mt-0.5">{userEmail}</p>
                  )}
                  {userPosition && (
                    <p className="text-xs text-gray-500 mt-0.5">{userPosition}</p>
                  )}
                </div>
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>
    </>
  );
});
