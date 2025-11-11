import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  markNotificationAsReadClient,
  markAllNotificationsAsReadClient,
  type Notification,
} from "@/lib/notifications/client";

interface UseMarkAsReadOptions {
  onSuccess?: (data: Notification | null) => void;
  onError?: (error: Error) => void;
}

interface UseMarkAllAsReadOptions {
  onSuccess?: (data: Notification[]) => void;
  onError?: (error: Error) => void;
}

/**
 * React Query mutation hook for marking a notification as read
 *
 * Automatically invalidates notification queries after successful mutation,
 * ensuring the notification list and unread count badge update immediately.
 *
 * @param options - Optional success/error callbacks
 *
 * @returns Mutation object with mutate function and loading state
 *
 * @example
 * ```tsx
 * const markAsRead = useMarkAsRead({
 *   onSuccess: () => {
 *     toast.success("Notification marked as read");
 *   }
 * });
 *
 * // In event handler
 * markAsRead.mutate(notificationId);
 * ```
 */
export function useMarkAsRead(options?: UseMarkAsReadOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      markNotificationAsReadClient(notificationId),

    onSuccess: (data) => {
      // Invalidate notifications list to refetch with updated read status
      queryClient.invalidateQueries({ queryKey: ["notifications"] });

      // Invalidate unread count to update badge
      queryClient.invalidateQueries({
        queryKey: ["notifications", "unread-count"],
      });

      options?.onSuccess?.(data);
    },

    onError: (error: Error) => {
      console.error("Error marking notification as read:", error);
      options?.onError?.(error);
    },
  });
}

/**
 * React Query mutation hook for marking all notifications as read
 *
 * Automatically invalidates notification queries after successful mutation,
 * clearing the unread badge and updating the notification list.
 *
 * @param options - Optional success/error callbacks
 *
 * @returns Mutation object with mutate function and loading state
 *
 * @example
 * ```tsx
 * const markAllAsRead = useMarkAllAsRead({
 *   onSuccess: () => {
 *     toast.success("All notifications marked as read");
 *   }
 * });
 *
 * // In event handler
 * markAllAsRead.mutate();
 * ```
 */
export function useMarkAllAsRead(options?: UseMarkAllAsReadOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsAsReadClient(),

    onSuccess: (data) => {
      // Invalidate notifications list to refetch with all marked as read
      queryClient.invalidateQueries({ queryKey: ["notifications"] });

      // Invalidate unread count to clear badge (should become 0)
      queryClient.invalidateQueries({
        queryKey: ["notifications", "unread-count"],
      });

      options?.onSuccess?.(data);
    },

    onError: (error: Error) => {
      console.error("Error marking all notifications as read:", error);
      options?.onError?.(error);
    },
  });
}
