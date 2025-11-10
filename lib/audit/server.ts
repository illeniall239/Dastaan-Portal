/**
 * Audit Logging Server Utilities
 *
 * Provides comprehensive audit trail for admin operations and sensitive actions.
 * All admin operations that bypass RLS MUST be logged for:
 * - Security accountability
 * - Compliance (GDPR, SOC 2, etc.)
 * - Forensic investigation
 * - Regulatory audits
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface AuditLogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by: string;
  timestamp: string;
  details: Record<string, any> | null;
}

export interface CreateAuditLogParams {
  /**
   * Type of entity being operated on (e.g., 'user', 'evaluation', 'story')
   */
  entityType: string;

  /**
   * ID of the entity being operated on
   */
  entityId: string;

  /**
   * Action performed (e.g., 'created', 'updated', 'deleted', 'role_changed')
   */
  action: string;

  /**
   * User ID who performed the action
   */
  performedBy: string;

  /**
   * Additional context about the action
   */
  details?: {
    /**
     * IP address of the user
     */
    ipAddress?: string;

    /**
     * User agent string
     */
    userAgent?: string;

    /**
     * Previous values (for updates)
     */
    previousValues?: Record<string, any>;

    /**
     * New values (for updates/creates)
     */
    newValues?: Record<string, any>;

    /**
     * Reason for action (optional)
     */
    reason?: string;

    /**
     * Any additional metadata
     */
    [key: string]: any;
  };
}

/**
 * Log an admin action to the audit trail
 *
 * This function MUST be called for all operations using createAdminClient()
 * to maintain a complete audit trail.
 *
 * @param params - Audit log parameters
 * @returns The created audit log entry, or null if logging failed
 *
 * @example
 * ```typescript
 * await logAdminAction({
 *   entityType: 'user',
 *   entityId: userId,
 *   action: 'created',
 *   performedBy: currentUser.id,
 *   details: {
 *     ipAddress: request.headers.get('x-forwarded-for'),
 *     userAgent: request.headers.get('user-agent'),
 *     newValues: { email, role, department }
 *   }
 * });
 * ```
 */
export async function logAdminAction(
  params: CreateAuditLogParams
): Promise<AuditLogEntry | null> {
  const supabase = createAdminClient();

  const auditLogData = {
    entity_type: params.entityType,
    entity_id: params.entityId,
    action: params.action,
    performed_by: params.performedBy,
    timestamp: new Date().toISOString(),
    details: params.details || null,
  };

  const { data, error } = await supabase
    .from("audit_logs")
    .insert(auditLogData)
    .select()
    .single();

  if (error) {
    // Log audit logging failure (critical error)
    console.error("[AUDIT] CRITICAL: Failed to create audit log:", error);
    console.error("[AUDIT] Action details:", auditLogData);
    // Continue execution - don't block operations if audit log fails
    // but ensure it's logged to external monitoring (Sentry, DataDog, etc.)
    return null;
  }

  return data as AuditLogEntry;
}

/**
 * Log multiple admin actions in a single transaction
 * Useful when a single operation affects multiple entities
 *
 * @param entries - Array of audit log parameters
 * @returns Array of created audit log entries
 *
 * @example
 * ```typescript
 * await logAdminActions([
 *   {
 *     entityType: 'user',
 *     entityId: userId,
 *     action: 'role_changed',
 *     performedBy: adminId,
 *     details: { from: 'evaluator', to: 'content_manager' }
 *   },
 *   {
 *     entityType: 'permissions',
 *     entityId: userId,
 *     action: 'permissions_updated',
 *     performedBy: adminId,
 *     details: { reason: 'Promotion to content manager' }
 *   }
 * ]);
 * ```
 */
export async function logAdminActions(
  entries: CreateAuditLogParams[]
): Promise<AuditLogEntry[]> {
  const supabase = createAdminClient();

  const auditLogData = entries.map((params) => ({
    entity_type: params.entityType,
    entity_id: params.entityId,
    action: params.action,
    performed_by: params.performedBy,
    timestamp: new Date().toISOString(),
    details: params.details || null,
  }));

  const { data, error } = await supabase
    .from("audit_logs")
    .insert(auditLogData)
    .select();

  if (error) {
    console.error("[AUDIT] CRITICAL: Failed to create audit logs:", error);
    console.error("[AUDIT] Actions details:", auditLogData);
    return [];
  }

  return data as AuditLogEntry[];
}

/**
 * Get audit logs for a specific entity
 *
 * @param entityType - Type of entity
 * @param entityId - ID of the entity
 * @param limit - Maximum number of logs to return
 * @returns Array of audit log entries
 */
export async function getEntityAuditLogs(
  entityType: string,
  entityId: string,
  limit: number = 50
): Promise<AuditLogEntry[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[AUDIT] Failed to fetch entity audit logs:", error);
    return [];
  }

  return data as AuditLogEntry[];
}

/**
 * Get audit logs for a specific user's actions
 *
 * @param userId - ID of the user who performed actions
 * @param limit - Maximum number of logs to return
 * @returns Array of audit log entries
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 50
): Promise<AuditLogEntry[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("performed_by", userId)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[AUDIT] Failed to fetch user audit logs:", error);
    return [];
  }

  return data as AuditLogEntry[];
}

/**
 * Get recent audit logs with optional filtering
 *
 * @param options - Filter options
 * @returns Array of audit log entries
 */
export async function getAuditLogs(options: {
  entityType?: string;
  action?: string;
  performedBy?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
} = {}): Promise<{ data: AuditLogEntry[]; count: number }> {
  const supabase = createAdminClient();
  const {
    entityType,
    action,
    performedBy,
    startDate,
    endDate,
    limit = 100,
    offset = 0,
  } = options;

  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("timestamp", { ascending: false });

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  if (action) {
    query = query.eq("action", action);
  }

  if (performedBy) {
    query = query.eq("performed_by", performedBy);
  }

  if (startDate) {
    query = query.gte("timestamp", startDate.toISOString());
  }

  if (endDate) {
    query = query.lte("timestamp", endDate.toISOString());
  }

  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("[AUDIT] Failed to fetch audit logs:", error);
    return { data: [], count: 0 };
  }

  return {
    data: (data as AuditLogEntry[]) || [],
    count: count || 0,
  };
}

/**
 * Helper to extract request context for audit logging
 *
 * @param request - Next.js request object
 * @returns Context object with IP, user agent, etc.
 */
export function getRequestContext(request: Request) {
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const userAgent = request.headers.get("user-agent") || "unknown";

  return {
    ipAddress,
    userAgent,
  };
}
