"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import {
  getUserNotificationsClient,
  getUnreadNotificationCountClient,
  markNotificationAsReadClient,
  markAllNotificationsAsReadClient,
  subscribeToNotifications,
  type Notification,
} from "@/lib/notifications/client";
import { logger } from "@/lib/logger";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  handleMarkAsRead: (notificationId: string) => Promise<void>;
  handleMarkAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch notifications once on mount
  const fetchNotifications = useCallback(async () => {
    try {
      const [notifs, count] = await Promise.all([
        getUserNotificationsClient(10),
        getUnreadNotificationCountClient(),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      logger.error("❌ [NotificationProvider] Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchNotifications();

    // Subscribe to real-time notifications
    const cleanup = subscribeToNotifications((newNotification) => {
      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return cleanup;
  }, [fetchNotifications]);

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    await markNotificationAsReadClient(notificationId);
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, is_read: true } : notif
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    await markAllNotificationsAsReadClient();
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, is_read: true }))
    );
    setUnreadCount(0);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        handleMarkAsRead,
        handleMarkAllAsRead,
        refetch: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
