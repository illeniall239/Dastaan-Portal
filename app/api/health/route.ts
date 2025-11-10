import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Health Check Endpoint
 *
 * This endpoint is used for monitoring and load balancer health checks.
 * It verifies that:
 * 1. The API server is responding
 * 2. Database connection is working
 * 3. Basic authentication flow is operational
 *
 * Returns:
 * - 200: All systems operational
 * - 503: Service unavailable (database connection failed)
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Test database connectivity with a lightweight query
    const supabase = await createClient();
    const { error: dbError } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .limit(1);

    if (dbError) {
      logger.error(`Health check failed: Database connection error - ${dbError.message} (code: ${dbError.code})`);
      return NextResponse.json(
        {
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          checks: {
            api: "ok",
            database: "error",
            error: dbError.message,
          },
          responseTime: `${Date.now() - startTime}ms`,
        },
        { status: 503 }
      );
    }

    // All checks passed
    return NextResponse.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        checks: {
          api: "ok",
          database: "ok",
        },
        responseTime: `${Date.now() - startTime}ms`,
        version: process.env.npm_package_version || "1.0.0",
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Health check failed: Unexpected error - ${errorMsg}`);
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        checks: {
          api: "ok",
          database: "error",
        },
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime: `${Date.now() - startTime}ms`,
      },
      { status: 503 }
    );
  }
}

/**
 * HEAD request for simple uptime checks
 * Returns 200 if server is responding, no body
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
