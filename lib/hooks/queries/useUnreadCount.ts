import { useQuery } from "@tanstack/react-query";
import { getUnreadNotificationCountClient } from "@/lib/notifications/client";

interface UseUnreadCountOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * React Query hook for fetching unread notification count with automatic polling
 *
 * Automatically refetches the unread count every 30 seconds (configurable) to keep
 * the notification badge fresh. Works alongside useNotifications as a lightweight
 * query for header/badge displays.
 *
 * @param enabled - Whether the query should run (default: true)
 * @param refetchInterval - Polling interval in milliseconds (default: 30000 = 30 seconds)
 *
 * @returns React Query result with unread count, loading state, and error
 *
 * @example
 * ```tsx
 * const { data: unreadCount } = useUnreadCount({
 *   refetchInterval: 30000 // Poll every 30 seconds
 * });
 *
 * return (
 *   <Badge count={unreadCount} />
 * );
 * ```
 */
export function useUnreadCount({
  enabled = true,
  refetchInterval = 30000, // 30 seconds default
}: UseUnreadCountOptions = {}) {
  return useQuery({
    queryKey: ["notifications", "unread-count"],

    queryFn: () => getUnreadNotificationCountClient(),

    enabled,

    // Always fetch fresh on mount (fixes delay after login)
    staleTime: 0,

    // Keep count in cache for 5 minutes after last use
    gcTime: 5 * 60 * 1000,

    // Refetch on window focus to update badge when user returns
    refetchOnWindowFocus: true,

    // Poll for new unread count (for real-time badge updates)
    refetchInterval,

    // Stop polling when window is not visible (save resources)
    refetchIntervalInBackground: false,

    // Retry once on failure
    retry: 1,

    // Initialize with 0 to prevent undefined state
    placeholderData: 0,
  });
}
