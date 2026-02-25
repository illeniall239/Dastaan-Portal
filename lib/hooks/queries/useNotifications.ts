import { useQuery } from "@tanstack/react-query";
import {
  getUserNotificationsClient,
  type Notification,
} from "@/lib/notifications/client";

interface UseNotificationsOptions {
  limit?: number;
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * React Query hook for fetching user notifications with automatic polling
 *
 * Automatically refetches notifications every 30 seconds (configurable) to keep data fresh
 * even when real-time WebSocket connections aren't available or fail.
 *
 * @param limit - Maximum number of notifications to fetch (default: 20)
 * @param enabled - Whether the query should run (default: true)
 * @param refetchInterval - Polling interval in milliseconds (default: 30000 = 30 seconds)
 *
 * @returns React Query result with notifications data, loading state, and error
 *
 * @example
 * ```tsx
 * const { data: notifications, isLoading } = useNotifications({
 *   limit: 10,
 *   refetchInterval: 30000 // Poll every 30 seconds
 * });
 * ```
 */
export function useNotifications({
  limit = 20,
  enabled = true,
  refetchInterval = 30000, // 30 seconds default
}: UseNotificationsOptions = {}) {
  return useQuery({
    queryKey: ["notifications", limit],

    queryFn: () => getUserNotificationsClient(limit),

    enabled,

    // Always fetch fresh on mount (fixes delay after login)
    staleTime: 0,

    // Keep notifications in cache for 5 minutes after last use
    gcTime: 5 * 60 * 1000,

    // Refetch on window focus to get latest notifications when user returns
    refetchOnWindowFocus: true,

    // Poll for new notifications (fallback for when WebSockets don't work)
    refetchInterval,

    // Stop polling when window is not visible (save resources)
    refetchIntervalInBackground: false,

    // Retry once on failure
    retry: 1,
  });
}
