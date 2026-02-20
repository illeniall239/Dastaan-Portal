"use client";

import { createContext, useContext, useEffect, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { subscribeToNotifications, type Notification } from "@/lib/notifications/client";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import {
  useNotifications as useNotificationsQuery,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from "@/lib/hooks";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  handleMarkAsRead: (notificationId: string) => void;
  handleMarkAllAsRead: () => void;
  refetch: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // React Query hooks for notifications data with automatic polling
  const {
    data: notifications = [],
    isLoading: isLoadingNotifications,
    refetch: refetchNotifications,
  } = useNotificationsQuery({
    limit: 10,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const {
    data: unreadCount = 0,
    isLoading: isLoadingCount,
  } = useUnreadCount({
    refetchInterval: 30000, // Poll every 30 seconds
  });

  // Mutation hooks for marking notifications as read
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();

  // Invalidate notification queries immediately when user signs in
  // (fixes: NotificationProvider fires before auth is ready on login page,
  //  caches empty results for 30s staleTime, so notifications don't appear after login)
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  // Subscribe to real-time notifications for instant updates
  useEffect(() => {
    const cleanup = subscribeToNotifications((newNotification) => {
      // Invalidate queries to refetch with new notification
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });

      logger.info("📬 [NotificationProvider] New notification received via WebSocket");
    });

    return cleanup;
  }, [queryClient]);

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const refetch = async () => {
    await refetchNotifications();
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading: isLoadingNotifications || isLoadingCount,
        handleMarkAsRead,
        handleMarkAllAsRead,
        refetch,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotificationContext must be used within a NotificationProvider");
  }
  return context;
}
