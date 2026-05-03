import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";

export const dynamic = "force-dynamic";

function teamType(role: string): "content" | "programming" | "management" {
  if (role === "programmer") return "programming";
  if (["admin", "management", "executive"].includes(role)) return "management";
  return "content";
}

export async function GET(request: NextRequest) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
    if (!rate.success) return rate.response!;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "management", "executive"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();

    // 1. Fetch all active call reports
    const { data: callReports, error: crError } = await admin
      .from("call_reports")
      .select("id, working_title, writer_name, content_type, genre, target_slot")
      .eq("meeting_type", "call_report")
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (crError) throw crError;

    const reportIds = (callReports || []).map((r) => r.id);
    if (reportIds.length === 0) return NextResponse.json({ stories: [] });

    // 2. Fetch evaluator assignments (content team — assigned but may not have submitted)
    const { data: assignments, error: aErr } = await admin
      .from("evaluator_assignments")
      .select(`
        call_report_id,
        evaluator_id,
        evaluator:users!evaluator_id(id, name, role)
      `)
      .in("call_report_id", reportIds);

    if (aErr) throw aErr;

    // 3. Fetch ALL active programmers and management users so they always appear for every story
    const { data: programmers, error: pErr } = await admin
      .from("users")
      .select("id, name, role")
      .eq("role", "programmer");

    if (pErr) throw pErr;

    const MGMT_EMAILS = ["humera.safder@geo.tv", "salman.ahmed@geo.tv", "mir@geo.tv"];

    const { data: mgmtUsers, error: mgmtErr } = await admin
      .from("users")
      .select("id, name, role")
      .in("email", MGMT_EMAILS);

    if (mgmtErr) throw mgmtErr;

    // 4. Fetch all evaluator_forms for these reports (submitted or not)
    const { data: forms, error: fErr } = await admin
      .from("evaluator_forms")
      .select(`
        call_report_id,
        evaluator_id,
        average_score,
        submitted_at,
        evaluator:users!evaluator_id(id, name, role)
      `)
      .in("call_report_id", reportIds);

    if (fErr) throw fErr;

    // Build per-story evaluator map
    // Key: `${callReportId}__${evaluatorId}` → entry
    type EvalEntry = {
      evaluatorId: string;
      evaluatorName: string;
      team: "content" | "programming" | "management";
      averageScore: number | null;
      submitted: boolean;
    };

    const entryMap = new Map<string, EvalEntry>();

    // Seed from assignments (content team, unrated baseline)
    for (const a of (assignments as any[]) || []) {
      const ev = Array.isArray(a.evaluator) ? a.evaluator[0] : a.evaluator;
      if (!ev) continue;
      const key = `${a.call_report_id}__${ev.id}`;
      entryMap.set(key, {
        evaluatorId: ev.id,
        evaluatorName: ev.name || "Unknown",
        team: teamType(ev.role || "evaluator"),
        averageScore: null,
        submitted: false,
      });
    }

    // Seed ALL programmers and management users as "not rated" for every story
    const globalEvaluators = [
      ...(programmers as any[] || []),
      ...(mgmtUsers as any[] || []),
    ];
    for (const u of globalEvaluators) {
      for (const crId of reportIds) {
        const key = `${crId}__${u.id}`;
        if (!entryMap.has(key)) {
          entryMap.set(key, {
            evaluatorId: u.id,
            evaluatorName: u.name || "Unknown",
            team: teamType(u.role),
            averageScore: null,
            submitted: false,
          });
        }
      }
    }

    // Overlay with form data — adds score and marks submitted
    for (const f of (forms as any[]) || []) {
      const ev = Array.isArray(f.evaluator) ? f.evaluator[0] : f.evaluator;
      if (!ev) continue;
      const key = `${f.call_report_id}__${ev.id}`;
      const existing = entryMap.get(key);
      if (existing) {
        existing.averageScore = f.submitted_at ? f.average_score : null;
        existing.submitted = !!f.submitted_at;
      } else {
        // evaluator not covered by assignments or global lists (edge case)
        entryMap.set(key, {
          evaluatorId: ev.id,
          evaluatorName: ev.name || "Unknown",
          team: teamType(ev.role || "evaluator"),
          averageScore: f.submitted_at ? f.average_score : null,
          submitted: !!f.submitted_at,
        });
      }
    }

    // Group entries by call_report_id
    const byReport = new Map<string, EvalEntry[]>();
    for (const [key, entry] of entryMap) {
      const crId = key.split("__")[0];
      if (!byReport.has(crId)) byReport.set(crId, []);
      byReport.get(crId)!.push(entry);
    }

    // Build final stories array
    const stories = (callReports || []).map((cr) => {
      const evaluations = (byReport.get(cr.id) || []).sort((a, b) =>
        a.team.localeCompare(b.team) || a.evaluatorName.localeCompare(b.evaluatorName)
      );

      const teamAvg = (team: "content" | "programming" | "management") => {
        const scores = evaluations.filter(e => e.team === team && e.submitted && e.averageScore !== null).map(e => e.averageScore as number);
        return scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : null;
      };

      const allScores = evaluations.filter(e => e.submitted && e.averageScore !== null).map(e => e.averageScore as number);
      const overallAvg = allScores.length
        ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 100) / 100
        : null;

      const ratedCount = evaluations.filter(e => e.submitted).length;

      return {
        id: cr.id,
        workingTitle: cr.working_title || "Untitled",
        writerName: cr.writer_name || "Unknown",
        contentType: cr.content_type || null,
        genre: cr.genre || null,
        targetSlot: cr.target_slot || null,
        evaluations,
        overallAvg,
        contentAvg: teamAvg("content"),
        programmingAvg: teamAvg("programming"),
        managementAvg: teamAvg("management"),
        totalAssigned: evaluations.length,
        ratedCount,
      };
    });

    return NextResponse.json({ stories });
  } catch (error) {
    logger.error(`Story evaluations API error: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
