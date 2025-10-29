import { createClient } from "@/lib/supabase/client";

export interface Notification {
  id: string;
  user_id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

/**
 * Get notifications for the current user
 * This function should be called from client components
 */
export async function getUserNotificationsClient(limit: number = 20) {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch notifications:", error);
    return [];
  }

  return data as Notification[];
}

/**
 * Get unread notification count for the current user
 */
export async function getUnreadNotificationCountClient() {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.error("Failed to fetch unread count:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsReadClient(notificationId: string) {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Failed to mark notification as read:", error);
    return null;
  }

  return data;
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllNotificationsAsReadClient() {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false)
    .select();

  if (error) {
    console.error("Failed to mark all notifications as read:", error);
    return [];
  }

  return data;
}

/**
 * Delete a notification
 */
export async function deleteNotificationClient(notificationId: string) {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to delete notification:", error);
    return false;
  }

  return true;
}

/**
 * Subscribe to real-time notifications for the current user
 */
export function subscribeToNotifications(
  callback: (notification: Notification) => void
) {
  const supabase = createClient();

  // First get the current user
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return;

    // Subscribe to new notifications
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();

    // Return cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
  });
}
