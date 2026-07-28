"use client";

import { useState, useCallback, memo } from "react";
import {
  Bell,
  CalendarIcon,
  FileTextIcon,
  CheckCircle2,
  LogOut,
  Menu,
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
import { useRouter, usePathname } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import Link from "next/link";

interface TopBarProps {
  userName: string;
  userEmail?: string;
  userPosition?: string;
  teamName?: string | null;
  isDemoMode?: boolean;
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

export const TopBar = memo(function TopBar({
  userName,
  userEmail,
  userPosition,
  teamName,
  isDemoMode = false,
}: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { notifications, unreadCount, handleMarkAsRead, handleMarkAllAsRead } = useNotificationContext();
  const { isCollapsed, toggleMobile } = useSidebar();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const portalPrefix = pathname.split("/")[1] ? `/${pathname.split("/")[1]}` : "";
  const notificationsHref = `${portalPrefix}/notifications`;

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

      {/* Fixed top bar spanning the full width on mobile, starting after sidebar on desktop */}
      <div className={cn("fixed top-0 right-0 left-0 h-14 bg-white border-b border-gray-200 z-[60] flex items-center justify-between px-4 lg:px-8 transition-all duration-300", isCollapsed ? "lg:left-16" : "lg:left-70")}>
        {/* Left side: Hamburger menu (mobile only) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMobile}
          className="lg:hidden h-9 w-9 text-gray-700 hover:bg-gray-100"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Spacer for desktop (hidden on mobile) */}
        <div className="hidden lg:block" />

        {/* Right side: Team Badge + Notifications + Profile */}
        <div className="flex items-center gap-3">
          {/* Team Badge */}
          {teamName && (
            <span className="hidden sm:inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-medium text-blue-700">
              {teamName}
            </span>
          )}

          {/* Notifications Dropdown */}
          <DropdownMenu open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 rounded-full hover:bg-gray-100 transition-colors"
              >
                <Bell className="h-5 w-5 text-gray-700" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0 -right-0 h-4 w-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="bottom"
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
              <div className="border-t border-gray-100 px-4 py-2.5">
                <Link
                  href={notificationsHref}
                  className="block text-center text-xs font-medium text-[#224794] hover:underline"
                  onClick={() => setIsNotificationOpen(false)}
                >
                  See all notifications
                </Link>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2.5 hover:bg-gray-100 rounded-full pl-1 pr-2.5 py-1 transition-all"
                aria-label="Profile menu"
              >
                <div className="h-8 w-8 rounded-full bg-[#224794] flex items-center justify-center text-white font-semibold text-xs shadow-sm">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{userName}</p>
                  {userEmail && (
                    <p className="text-[11px] text-gray-500 leading-tight truncate max-w-[140px]">{userEmail}</p>
                  )}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="bottom"
              className="w-[calc(100vw-2rem)] max-w-64"
            >
              <div className="px-3 py-3 border-b sm:hidden">
                <p className="text-sm font-semibold text-gray-900">{userName}</p>
                {userEmail && (
                  <p className="text-xs text-gray-500 mt-0.5">{userEmail}</p>
                )}
                {userPosition && (
                  <p className="text-xs text-gray-500 mt-0.5">{userPosition}</p>
                )}
              </div>
              <div className="px-3 py-3 border-b hidden sm:block">
                {userPosition && (
                  <p className="text-xs text-gray-500">{userPosition}</p>
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
    </>
  );
});
