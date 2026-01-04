import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  createdBy?: string;
}

/**
 * Create a new notification for a user
 * This function should be called from server components
 *
 * NOTE: Uses admin client to bypass RLS. This is secure because:
 * - Only server-side code can call this function
 * - RLS policy blocks authenticated users from creating notifications
 * - Forces all notification creation through validated server-side code paths
 */
export async function createNotification(input: CreateNotificationInput) {
  // Use admin client to bypass RLS (RLS policy blocks authenticated user inserts)
  const supabase = createAdminClient();

  const notificationData = {
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message || null,
    entity_type: input.entityType || null,
    entity_id: input.entityId || null,
    created_by: input.createdBy || null,
    is_read: false,
  };

  const { data, error} = await supabase
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
 *
 * NOTE: Uses admin client to bypass RLS. This is secure because:
 * - Only server-side code can call this function
 * - RLS policy blocks authenticated users from creating notifications
 * - Forces all notification creation through validated server-side code paths
 */
export async function createNotifications(
  userIds: string[],
  type: "info" | "success" | "warning" | "error",
  title: string,
  message?: string,
  entityType?: string,
  entityId?: string,
  createdBy?: string
) {
  // Use admin client to bypass RLS (RLS policy blocks authenticated user inserts)
  const supabase = createAdminClient();

  const notifications = userIds.map((userId) => ({
    user_id: userId,
    type,
    title,
    message: message || null,
    entity_type: entityType || null,
    entity_id: entityId || null,
    created_by: createdBy || null,
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
    .select("id, user_id, type, title, message, entity_type, entity_id, is_read, created_at")
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

/**
 * Helper: Get user IDs by roles
 * Generic function to get users by multiple roles
 */
export async function getUserIdsByRoles(roles: string[]) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("id")
    .in("role", roles)
    .eq("status", "active");

  if (error) {
    console.error("Failed to fetch users by roles:", error);
    return [];
  }

  return data.map((user) => user.id);
}

/**
 * Helper: Exclude a specific user ID from a list
 * Used to prevent notifying the person who performed the action
 */
export function excludeUserFromList(userIds: string[], excludeUserId?: string): string[] {
  if (!excludeUserId) return userIds;
  return userIds.filter(id => id !== excludeUserId);
}

/**
 * Helper: Get all relevant user IDs for content department activities
 * Returns: management, evaluators, content_manager, content_creator
 */
export async function getContentActivityNotificationRecipients(excludeUserId?: string) {
  const roles = ["management", "evaluator", "content_manager", "content_creator"];
  const userIds = await getUserIdsByRoles(roles);
  return excludeUserFromList(userIds, excludeUserId);
}

/**
 * Helper: Get all relevant user IDs for evaluation activities
 * Returns: management, content_manager, content_creator
 */
export async function getEvaluationActivityNotificationRecipients(excludeUserId?: string) {
  const roles = ["management", "content_manager", "content_creator"];
  const userIds = await getUserIdsByRoles(roles);
  return excludeUserFromList(userIds, excludeUserId);
}
