import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { applyRateLimit, addRateLimitHeaders, withCors } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import {
    unauthorizedError,
    forbiddenError,
    validationError,
    handleDatabaseError,
    internalError,
} from "@/lib/api/errors";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const upsertSchema = z.object({
    entity_type: z.enum(["call_report", "episode"]),
    entity_id: z.string().uuid(),
    score: z.number().min(1).max(10),
    comment: z.string().max(1000).optional().nullable(),
});

const ALLOWED_ROLES = [
    "content_manager", "content_creator", "admin",
    "management", "programmer", "gcm", "evaluator",
];

/**
 * GET /api/initial-assessments?entity_type=X&entity_id=Y
 * Fetch all assessments for an entity
 */
export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedError();

    const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
    if (!rate.success) return rate.response!;

    const { searchParams } = request.nextUrl;
    const entity_type = searchParams.get("entity_type");
    const entity_id = searchParams.get("entity_id");

    if (!entity_type || !entity_id) {
        return validationError("entity_type and entity_id are required");
    }

    if (!["call_report", "episode"].includes(entity_type)) {
        return validationError("entity_type must be 'call_report' or 'episode'");
    }

    try {
        const { data: assessments, error } = await supabase
            .from("initial_assessments")
            .select(`
        id,
        entity_type,
        entity_id,
        assessor_id,
        score,
        comment,
        created_at,
        updated_at,
        assessor:users!assessor_id(name, email, role)
      `)
            .eq("entity_type", entity_type)
            .eq("entity_id", entity_id)
            .order("created_at", { ascending: false });

        if (error) {
            logger.error("Error fetching assessments:", error);
            return handleDatabaseError(error, "fetching assessments");
        }

        // Get the current user's assessment if it exists
        const myAssessment = assessments?.find(a => a.assessor_id === user.id) || null;

        // Calculate stats
        const count = assessments?.length || 0;
        const average = count > 0
            ? Math.round((assessments!.reduce((sum, a) => sum + a.score, 0) / count) * 100) / 100
            : null;

        const res = NextResponse.json({
            assessments: assessments || [],
            myAssessment,
            stats: { count, average },
        });
        res.headers.set("Cache-Control", "no-store");
        return addRateLimitHeaders(withCors(request, res), rate.result);
    } catch (error) {
        logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
        return withCors(request, internalError());
    }
}

/**
 * POST /api/initial-assessments
 * Submit or update (upsert) the current user's assessment
 */
export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedError();

    const rate = await applyRateLimit(request, RateLimitPresets.standard, user.id);
    if (!rate.success) return rate.response!;

    // Check role
    const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!userData || !ALLOWED_ROLES.includes(userData.role)) {
        return forbiddenError("Your role does not allow submitting assessments");
    }

    try {
        const body = await request.json();
        const validation = upsertSchema.safeParse(body);
        if (!validation.success) {
            return validationError("Validation failed", validation.error.format());
        }

        const { entity_type, entity_id, score, comment } = validation.data;

        // Upsert: insert or update on conflict
        const { data: assessment, error } = await supabase
            .from("initial_assessments")
            .upsert(
                {
                    entity_type,
                    entity_id,
                    assessor_id: user.id,
                    score,
                    comment: comment || null,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "entity_type,entity_id,assessor_id" }
            )
            .select(`
        id,
        entity_type,
        entity_id,
        assessor_id,
        score,
        comment,
        created_at,
        updated_at,
        assessor:users!assessor_id(name, email, role)
      `)
            .single();

        if (error) {
            logger.error("Error upserting assessment:", error);
            return handleDatabaseError(error, "saving assessment");
        }

        // Fetch updated stats (trigger should have updated denormalized columns already)
        const { data: allAssessments } = await supabase
            .from("initial_assessments")
            .select("score")
            .eq("entity_type", entity_type)
            .eq("entity_id", entity_id);

        const count = allAssessments?.length || 0;
        const average = count > 0
            ? Math.round((allAssessments!.reduce((sum, a) => sum + a.score, 0) / count) * 100) / 100
            : null;

        const res = NextResponse.json({
            assessment,
            stats: { count, average },
        });
        return addRateLimitHeaders(withCors(request, res), rate.result);
    } catch (error) {
        logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
        return withCors(request, internalError());
    }
}
