import { createAdminClient } from "@/lib/supabase/admin";

export type ErrorType =
  | "VALIDATION_ERROR"
  | "AUTH_ERROR"
  | "DB_ERROR"
  | "RATE_LIMIT"
  | "INTERNAL_ERROR";

interface LogErrorParams {
  error: unknown;
  request?: Request;
  userId?: string;
  statusCode?: number;
  context?: Record<string, unknown>;
}

function classifyError(error: unknown, statusCode: number): ErrorType {
  if (statusCode === 429) return "RATE_LIMIT";
  if (statusCode === 400 || statusCode === 422) return "VALIDATION_ERROR";
  if (statusCode === 401 || statusCode === 403) return "AUTH_ERROR";

  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (msg.includes("pgrst") || msg.includes("postgres") || msg.includes("supabase")) return "DB_ERROR";
  if (msg.includes("auth") || msg.includes("token") || msg.includes("session")) return "AUTH_ERROR";
  if (msg.includes("validation") || msg.includes("invalid") || msg.includes("required")) return "VALIDATION_ERROR";

  return "INTERNAL_ERROR";
}

/**
 * Log an API error to the error_logs table.
 * Fire-and-forget — never throws, never blocks the response.
 */
export async function logError(params: LogErrorParams): Promise<void> {
  const { error, request, userId, statusCode = 500, context } = params;

  try {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorType = classifyError(error, statusCode);

    let route: string | undefined;
    let method: string | undefined;
    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    if (request) {
      try {
        route = new URL(request.url).pathname;
      } catch {
        route = request.url;
      }
      method = request.method;
      ipAddress =
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        request.headers.get("x-real-ip") ||
        undefined;
      userAgent = request.headers.get("user-agent") || undefined;
    }

    const supabase = createAdminClient();

    await supabase.from("error_logs").insert({
      route,
      method,
      status_code: statusCode,
      error_message: errorMessage,
      error_type: errorType,
      error_stack: errorStack,
      user_id: userId || null,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      context: context || null,
    });
  } catch {
    // Silently swallow — logging must never break the response flow
  }
}
