import { createClient } from "@/lib/supabase/server";

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

export interface CreateNotificationInput {
  userId: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message?: string;
  entityType?: string;
  entityId?: string;
}

/**
 * Create a new notification for a user
 * This function should be called from server components
 */
export async function createNotification(input: CreateNotificationInput) {
  const supabase = await createClient();

  const notificationData = {
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message || null,
    entity_type: input.entityType || null,
    entity_id: input.entityId || null,
    is_read: false,
  };

  const { data, error } = await supabase
    .from("notifications")
    .insert(notificationData)
    .select()
    .single();

  if (error) {
    console.error("Failed to create notification:", error);
    return null;
  }

  return data;
}

/**
 * Create notifications for multiple users
 * Useful for notifying multiple people about the same event
 */
export async function createNotifications(
  userIds: string[],
  type: "info" | "success" | "warning" | "error",
  title: string,
  message?: string,
  entityType?: string,
  entityId?: string
) {
  const supabase = await createClient();

  const notifications = userIds.map((userId) => ({
    user_id: userId,
    type,
    title,
    message: message || null,
    entity_type: entityType || null,
    entity_id: entityId || null,
    is_read: false,
  }));

  const { data, error } = await supabase
    .from("notifications")
    .insert(notifications)
    .select();

  if (error) {
    console.error("Failed to create notifications:", error);
    return [];
  }

  return data;
}

/**
 * Get notifications for a user
 * This function should be called from server components
 */
export async function getUserNotifications(userId: string, limit: number = 20) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch notifications:", error);
    return [];
  }

  return data as Notification[];
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string) {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
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
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Failed to mark notification as read:", error);
    return null;
  }

  return data;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
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
export async function deleteNotification(notificationId: string, userId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to delete notification:", error);
    return false;
  }

  return true;
}

/**
 * Helper: Get all content department user IDs
 * Useful for notifying all content team members
 */
export async function getContentDepartmentUserIds() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("id")
    .in("role", ["content_creator", "content_manager"])
    .eq("status", "active");

  if (error) {
    console.error("Failed to fetch content department users:", error);
    return [];
  }

  return data.map((user) => user.id);
}
