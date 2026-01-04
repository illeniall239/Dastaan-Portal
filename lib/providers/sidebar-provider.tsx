"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface SidebarContextType {
  isCollapsed: boolean;      // Desktop collapse state
  isMobileOpen: boolean;     // Mobile overlay state
  toggleCollapse: () => void;
  toggleMobile: () => void;
  closeMobile: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const STORAGE_KEY = "dastaan-sidebar-collapsed";

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setIsCollapsed(stored === "true");
    }
  }, []);

  // Persist collapse state to localStorage
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(STORAGE_KEY, String(isCollapsed));
    }
  }, [isCollapsed, isMounted]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  const toggleMobile = () => {
    setIsMobileOpen((prev) => !prev);
  };

  const closeMobile = () => {
    setIsMobileOpen(false);
  };

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        isMobileOpen,
        toggleCollapse,
        toggleMobile,
        closeMobile,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    // During SSR or initial render, return a default context
    // This will be replaced with the actual context on mount
    if (typeof window === 'undefined') {
      return {
        isCollapsed: false,
        isMobileOpen: false,
        toggleCollapse: () => {},
        toggleMobile: () => {},
        closeMobile: () => {},
      };
    }
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
