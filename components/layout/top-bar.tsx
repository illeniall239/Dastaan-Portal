"use client";

import { useState, useCallback, memo } from "react";
import {
  Bell,
  CalendarIcon,
  FileTextIcon,
  CheckCircle2,
  LogOut,
  Search,
} from "lucide-react";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotificationContext } from "@/lib/providers/notification-provider";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface TopBarProps {
  userName: string;
  userEmail?: string;
  userPosition?: string;
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
}: TopBarProps) {
  const router = useRouter();
  const { notifications, unreadCount, handleMarkAsRead, handleMarkAllAsRead } = useNotificationContext();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // TODO: Implement search functionality
      console.log("Searching for:", searchQuery);
    }
  };

  return (
    <>
      {isLoggingOut && <LoadingSpinner text="Logging out..." />}
      
      {/* Fixed top bar spanning the content area */}
      <div className="fixed top-0 right-0 left-0 lg:left-70 h-16 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4 lg:px-8">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-gray-50 border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#224794]/20 focus:border-[#224794] transition-all"
            />
          </div>
        </form>

        {/* Right side: Notifications + Profile */}
        <div className="flex items-center gap-3 ml-4">
          {/* Notifications Dropdown */}
          <DropdownMenu open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-10 w-10 rounded-full hover:bg-gray-100 transition-colors"
              >
                <Bell className="h-5 w-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
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
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-3 hover:bg-gray-50 rounded-full pl-1 pr-3 py-1 transition-all"
                aria-label="Profile menu"
              >
                <div className="h-9 w-9 rounded-full bg-[#224794] flex items-center justify-center text-white font-semibold text-sm">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{userName}</p>
                  {userEmail && (
                    <p className="text-xs text-gray-500 leading-tight truncate max-w-[150px]">{userEmail}</p>
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
