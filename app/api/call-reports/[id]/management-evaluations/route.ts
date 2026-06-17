import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { idParamSchema } from "@/lib/validations/uuid-params";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { MANDATORY_APPROVER_EMAILS } from "@/lib/approvals/config";

export const dynamic = "force-dynamic";

/**
 * GET /api/call-reports/[id]/management-evaluations
 * Returns submitted evaluator_forms entries for mandatory approvers (Humera/Salman) on a given call report.
 * Accessible to any authenticated user (so evaluators can view management's scores).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const paramValidation = idParamSchema.safeParse({ id });
  if (!paramValidation.success) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
  if (!rate.success) return rate.response!;

  try {
    const adminClient = createAdminClient();

    // Get user IDs for mandatory approvers by their emails
    const { data: mandatoryUsers } = await adminClient
      .from("users")
      .select("id, name, email")
      .in("email", MANDATORY_APPROVER_EMAILS);

    if (!mandatoryUsers || mandatoryUsers.length === 0) {
      return NextResponse.json({ evaluations: [] });
    }

    const mandatoryUserIds = mandatoryUsers.map((u: { id: string }) => u.id);
    const userById: Record<string, { name: string; email: string }> = {};
    for (const u of mandatoryUsers) {
      userById[u.id] = { name: u.name, email: u.email };
    }

    // Fetch submitted evaluator_forms for these users on this call report
    const { data: forms, error } = await adminClient
      .from("evaluator_forms")
      .select(
        `id, evaluator_id, average_score,
         conflict_of_content_score, conflict_of_content_comment,
         characterization_score, characterization_comment,
         story_progression_score, story_progression_comment,
         whats_next_element_score, whats_next_element_comment,
         overall_oneliner_grade_score, overall_oneliner_grade_comment,
         decision, decision_notes, comments, submitted_at`
      )
      .eq("call_report_id", id)
      .in("evaluator_id", mandatoryUserIds)
      .not("submitted_at", "is", null);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch evaluations" }, { status: 500 });
    }

    const evaluations = (forms || []).map((f: any) => ({
      evaluator_name: userById[f.evaluator_id]?.name || "Unknown",
      evaluator_email: userById[f.evaluator_id]?.email || "",
      average_score: f.average_score,
      conflict_of_content_score: f.conflict_of_content_score,
      conflict_of_content_comment: f.conflict_of_content_comment,
      characterization_score: f.characterization_score,
      characterization_comment: f.characterization_comment,
      story_progression_score: f.story_progression_score,
      story_progression_comment: f.story_progression_comment,
      whats_next_element_score: f.whats_next_element_score,
      whats_next_element_comment: f.whats_next_element_comment,
      overall_oneliner_grade_score: f.overall_oneliner_grade_score,
      overall_oneliner_grade_comment: f.overall_oneliner_grade_comment,
      decision: f.decision,
      decision_notes: f.decision_notes,
      comments: f.comments,
      submitted_at: f.submitted_at,
    }));

    return NextResponse.json({ evaluations });
  } catch (error) {
    console.error("Error in GET /api/call-reports/[id]/management-evaluations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
