"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, Bell, LogOut, Menu, X } from "lucide-react";
import { useNotificationContext } from "@/lib/providers/notification-provider";
import { logger } from "@/lib/logger";

interface NavItem {
  title: string;
  href: string;
  icon: string;
}

interface BsPillNavProps {
  userName: string;
  userEmail?: string;
  userPosition?: string;
  teamName?: string | null;
  navItems: NavItem[];
  showAIButton?: boolean;
}

const TAB_ITEMS = [
  { label: "Overview", href: "/content-department" },
  { label: "Calendar", href: "/content-department/calendar" },
  { label: "One-Liners", href: "/content-department/call-reports" },
  { label: "Episodes", href: "/content-department/episodes" },
  { label: "Evaluations", href: "/content-department/evaluations" },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function BsPillNav({
  userName,
  userEmail,
  userPosition,
  showAIButton,
}: BsPillNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { unreadCount } = useNotificationContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      logger.error("Logout error:", error);
      setIsLoggingOut(false);
    }
  }, [router]);

  const isActive = (href: string) => {
    if (href === "/content-department") return pathname === "/content-department";
    return pathname.startsWith(href);
  };

  return (
    <nav className="bg-white rounded-[22px] h-[64px] px-[18px] flex items-center gap-4 sticky top-4 z-50 shadow-sm">
      {/* Brand */}
      <Link href="/content-department" className="text-[#5B4BFF] font-bold text-[15px] flex-shrink-0">
        Dastaan
      </Link>

      {/* Tab Switcher — Desktop */}
      <div className="hidden md:flex items-center bg-[#F4F4F1] rounded-[16px] p-1 gap-1">
        {TAB_ITEMS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-[12px] px-[15px] py-[8px] text-[12.5px] font-semibold transition-all whitespace-nowrap ${
              isActive(tab.href)
                ? "bg-white text-[#15151A] shadow-sm"
                : "text-[#7B7B85] hover:text-[#15151A]"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden w-[36px] h-[36px] rounded-[10px] flex items-center justify-center hover:bg-[#F4F4F1] transition-colors"
      >
        {mobileMenuOpen ? <X className="w-[18px] h-[18px] text-[#15151A]" /> : <Menu className="w-[18px] h-[18px] text-[#15151A]" />}
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* AI Button */}
      {showAIButton && (
        <Link
          href="/content-department/ai-assistant"
          className={`hidden sm:flex items-center gap-2 rounded-[14px] px-4 py-[10px] text-[13px] font-bold transition-colors ${
            pathname === "/content-department/ai-assistant"
              ? "bg-[#5B4BFF] text-white"
              : "bg-[#17171F] text-white hover:bg-[#2a2a35]"
          }`}
        >
          <Sparkles className="w-[15px] h-[15px] text-[#FFC94D]" />
          AI
        </Link>
      )}

      {/* Notifications */}
      <div className="relative">
        <Link
          href="/content-department/notifications"
          className="w-[44px] h-[44px] rounded-[14px] flex items-center justify-center hover:bg-[#F4F4F1] transition-colors relative"
        >
          <Bell className="w-[18px] h-[18px] text-[#7B7B85]" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-[#FF6B4A] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
      </div>

      {/* User Pill */}
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-[9px] bg-[#F4F4F1] rounded-[16px] pl-[6px] pr-[14px] py-[6px] hover:bg-[#EDEDEA] transition-colors"
        >
          <div className="w-[32px] h-[32px] rounded-full bg-[#FF6B4A] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[11px] font-bold">{getInitials(userName)}</span>
          </div>
          <span className="hidden sm:block text-[12.5px] font-semibold text-[#15151A] max-w-[100px] truncate">
            {userName}
          </span>
        </button>

        {/* User Dropdown */}
        {showUserMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
            <div className="absolute right-0 top-full mt-2 w-[200px] bg-white rounded-[16px] shadow-lg border border-gray-100 py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-[13px] font-semibold text-[#15151A] truncate">{userName}</p>
                {userEmail && <p className="text-[11px] text-[#7B7B85] truncate">{userEmail}</p>}
                {userPosition && <p className="text-[11px] text-[#7B7B85]">{userPosition}</p>}
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-[14px] h-[14px]" />
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/20" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-4 right-4 top-[72px] bg-white rounded-[20px] shadow-lg border border-gray-100 p-3 z-40 md:hidden">
            <div className="flex flex-col gap-1">
              {TAB_ITEMS.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-[12px] px-4 py-3 text-[13px] font-semibold transition-colors ${
                    isActive(tab.href)
                      ? "bg-[#F4F4F1] text-[#15151A]"
                      : "text-[#7B7B85] hover:bg-[#F8F8F5]"
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
              {showAIButton && (
                <Link
                  href="/content-department/ai-assistant"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-[12px] px-4 py-3 text-[13px] font-semibold flex items-center gap-2 text-[#7B7B85] hover:bg-[#F8F8F5]"
                >
                  <Sparkles className="w-[14px] h-[14px] text-[#FFC94D]" />
                  AI Assistant
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
