"use client";

import { createContext, useContext, useEffect, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { subscribeToNotifications, type Notification } from "@/lib/notifications/client";
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
