import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["admin", "management", "executive", "programmer", "management_viewer"];
const WRITE_ROLES = ["admin", "management", "programmer"];

function fmt(d: string | null): string | null {
  if (!d) return null;
  try {
    const date = new Date(d);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
  } catch { return d; }
}

function daysBetween(d1: string | null, d2: string | null): number | null {
  if (!d1 || !d2) return null;
  const ms = new Date(d2).getTime() - new Date(d1).getTime();
  return Math.round(ms / 86400000);
}

function monthKey(d: string | null): string | null {
  if (!d) return null;
  try {
    const date = new Date(d);
    return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
    if (!rate.success) return rate.response!;

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();

    // 1. Fetch active call reports with team + slot info
    const { data: callReports, error: crErr } = await admin
      .from("call_reports")
      .select(`id, working_title, writer_name, tracking_notes, target_slot, average_initial_assessment,
        team:teams!call_reports_team_id_fkey(id, name)`)
      .eq("meeting_type", "call_report")
      .is("archived_at", null)
      .order("working_title", { ascending: true });

    if (crErr) throw new Error(`call_reports: ${crErr.message}`);
    if (!callReports?.length) return NextResponse.json({ projects: [] });

    const reportIds = callReports.map((r) => r.id);

    // 2. Single nested select — fetches ALL episodes (current + old versions) with
    //    embedded revisions, evaluations, and tracking in ONE round-trip.
    //    Filters on call_report_id (small array) to avoid URL-length issues
    //    that caused TypeError: fetch failed with .in(episode_id, largeArray).
    const { data: allEpisodes, error: epErr } = await admin
      .from("episodes")
      .select(`
        id, call_report_id, episode_number, created_at, original_submission_date, is_current,
        episode_revisions(id, revision_number, created_at, original_submission_date),
        episodic_evaluations(episode_id, revision_id, submitted_at, decision, evaluator_id),
        episode_tracking(payment_request_date, payment_date, tracking_status)
      `)
      .in("call_report_id", reportIds)
      .order("episode_number", { ascending: true });

    if (epErr) throw new Error(`episodes: ${epErr.message}`);

    // 3. Fetch evaluator→team mapping for team-wise feedback columns
    const [{ data: allTeams }, { data: allUsers }] = await Promise.all([
      admin.from("teams").select("id, name, team_type, team_head:users!teams_team_head_id_fkey(name)"),
      admin.from("users").select("id, team_id"),
    ]);

    // Build user→teamLabel map
    // Find the programmer team head so we can merge their management team under "Programming"
    const programmerHeadIds = new Set(
      (allTeams || []).filter((t: any) => t.team_type === "programmer")
        .map((t: any) => {
          const head = t.team_head ? (Array.isArray(t.team_head) ? t.team_head[0] : t.team_head) : null;
          return head?.name;
        }).filter(Boolean)
    );
    const teamLabelMap = new Map<string, string>();
    for (const t of allTeams || []) {
      const head = t.team_head ? (Array.isArray(t.team_head) ? t.team_head[0] : t.team_head) : null;
      let label: string;
      if (t.team_type === "programmer" || (head?.name && programmerHeadIds.has(head.name))) {
        label = "Programming";
      } else if (t.team_type === "evaluator") {
        label = "Content";
      } else if (head?.name) {
        label = `${head.name.split(" ")[0]}'s Team`;
      } else {
        label = t.name;
      }
      teamLabelMap.set(t.id, label);
    }
    const userTeamMap = new Map<string, string>();
    for (const u of allUsers || []) {
      if (u.team_id) userTeamMap.set(u.id, teamLabelMap.get(u.team_id) || "Other");
    }

    // Collect distinct feedback team labels from actual evaluations
    const feedbackTeamSet = new Set<string>();

    if (!allEpisodes?.length) {
      return NextResponse.json({
        projects: callReports.map((cr) => ({
          id: cr.id, workingTitle: cr.working_title, writerName: cr.writer_name,
          trackingNotes: cr.tracking_notes, targetSlot: cr.target_slot || null,
          teamName: (Array.isArray(cr.team) ? cr.team[0] : cr.team)?.name || null,
          avgScore: cr.average_initial_assessment ?? null,
          episodes: [], maxRevisions: 0, monthlySummary: [],
        })),
      });
    }

    // Separate current episodes (for display) from old versions (for revision lookup)
    type EpRow = (typeof allEpisodes)[0];
    const currentEpisodes: EpRow[] = [];
    const currentEpLookup = new Map<string, string>(); // "cr_id:ep_num" → current episode id

    for (const ep of allEpisodes) {
      if (ep.is_current) {
        currentEpisodes.push(ep);
        currentEpLookup.set(`${ep.call_report_id}:${ep.episode_number}`, ep.id);
      }
    }

    if (!currentEpisodes.length) {
      return NextResponse.json({
        projects: callReports.map((cr) => ({
          id: cr.id, workingTitle: cr.working_title, writerName: cr.writer_name,
          trackingNotes: cr.tracking_notes, targetSlot: cr.target_slot || null,
          teamName: (Array.isArray(cr.team) ? cr.team[0] : cr.team)?.name || null,
          avgScore: cr.average_initial_assessment ?? null,
          episodes: [], maxRevisions: 0, monthlySummary: [],
        })),
      });
    }

    // Build old→current episode ID mapping
    const oldToCurrentEpId = new Map<string, string>();
    for (const ep of allEpisodes) {
      const currentId = currentEpLookup.get(`${ep.call_report_id}:${ep.episode_number}`);
      if (currentId) oldToCurrentEpId.set(ep.id, currentId);
    }

    // Collect revisions from ALL episodes, remap to current episode IDs
    type RevRow = { id: string; revision_number: number; created_at: string; original_submission_date: string | null };
    const revsByEpisode = new Map<string, RevRow[]>();
    for (const ep of allEpisodes) {
      const currentEpId = oldToCurrentEpId.get(ep.id) || ep.id;
      const epRevs = (ep.episode_revisions || []) as RevRow[];
      for (const rev of epRevs) {
        if (!revsByEpisode.has(currentEpId)) revsByEpisode.set(currentEpId, []);
        revsByEpisode.get(currentEpId)!.push(rev);
      }
    }
    // Sort revisions by revision_number within each episode
    for (const [, revs] of revsByEpisode) {
      revs.sort((a, b) => a.revision_number - b.revision_number);
    }

    // Collect evals from ALL episodes, remap to current episode IDs
    // Store per-team feedback dates: Map<episodeId|revisionId, Map<teamLabel, latestDate>>
    type EvalRow = { episode_id: string; revision_id: string | null; submitted_at: string | null; decision: string | null; evaluator_id: string };
    const baseEvalByEpisode = new Map<string, string>();
    const revEvalMap = new Map<string, string>();
    // Team-wise feedback maps
    const baseEvalByTeam = new Map<string, Map<string, string>>(); // episodeId → Map<teamLabel, latestDate>
    const revEvalByTeam = new Map<string, Map<string, string>>();  // revisionId → Map<teamLabel, latestDate>

    for (const ep of allEpisodes) {
      const currentEpId = oldToCurrentEpId.get(ep.id) || ep.id;
      const epEvals = (ep.episodic_evaluations || []) as EvalRow[];
      for (const ev of epEvals) {
        if (!ev.submitted_at) continue;
        const teamLabel = userTeamMap.get(ev.evaluator_id) || "Other";
        feedbackTeamSet.add(teamLabel);

        if (ev.revision_id) {
          const existing = revEvalMap.get(ev.revision_id);
          if (!existing || ev.submitted_at > existing) {
            revEvalMap.set(ev.revision_id, ev.submitted_at);
          }
          // Team-wise
          if (!revEvalByTeam.has(ev.revision_id)) revEvalByTeam.set(ev.revision_id, new Map());
          const teamMap = revEvalByTeam.get(ev.revision_id)!;
          const existingTeam = teamMap.get(teamLabel);
          if (!existingTeam || ev.submitted_at > existingTeam) {
            teamMap.set(teamLabel, ev.submitted_at);
          }
        } else {
          const existing = baseEvalByEpisode.get(currentEpId);
          if (!existing || ev.submitted_at > existing) {
            baseEvalByEpisode.set(currentEpId, ev.submitted_at);
          }
          // Team-wise
          if (!baseEvalByTeam.has(currentEpId)) baseEvalByTeam.set(currentEpId, new Map());
          const teamMap = baseEvalByTeam.get(currentEpId)!;
          const existingTeam = teamMap.get(teamLabel);
          if (!existingTeam || ev.submitted_at > existingTeam) {
            teamMap.set(teamLabel, ev.submitted_at);
          }
        }
      }
    }

    // Extract tracking from current episodes only
    type TrackRow = { payment_request_date: string | null; payment_date: string | null; tracking_status: string | null };
    const trackingByEpisode = new Map<string, TrackRow>();
    for (const ep of currentEpisodes) {
      const trArr = (ep.episode_tracking || []) as TrackRow[];
      if (trArr.length > 0) trackingByEpisode.set(ep.id, trArr[0]);
    }

    // Group current episodes by call_report_id
    const epsByReport = new Map<string, EpRow[]>();
    for (const ep of currentEpisodes) {
      if (!epsByReport.has(ep.call_report_id)) epsByReport.set(ep.call_report_id, []);
      epsByReport.get(ep.call_report_id)!.push(ep);
    }

    // Build response
    const projects = callReports.map((cr) => {
      const crEps = epsByReport.get(cr.id) || [];
      let maxRevisions = 0;

      // Monthly summary buckets for this project
      const monthBuckets = new Map<string, { freshEps: number; revEps: number }>();

      const mappedEpisodes = crEps.map((ep) => {
        const epRevs = revsByEpisode.get(ep.id) || [];
        if (epRevs.length > maxRevisions) maxRevisions = epRevs.length;

        const tr = trackingByEpisode.get(ep.id);

        // Raw dates for feedback days calculation
        const rawFirstCopy = ep.original_submission_date ?? ep.created_at;
        const rawFirstFeedback = baseEvalByEpisode.get(ep.id) ?? null;

        // Bucket fresh episode into month
        const mk = monthKey(rawFirstCopy);
        if (mk) {
          if (!monthBuckets.has(mk)) monthBuckets.set(mk, { freshEps: 0, revEps: 0 });
          monthBuckets.get(mk)!.freshEps++;
        }

        // Build team-wise feedback for first copy
        const baseTeamFeedback: Record<string, string | null> = {};
        const baseTeamMap = baseEvalByTeam.get(ep.id);
        if (baseTeamMap) {
          for (const [team, date] of baseTeamMap) {
            baseTeamFeedback[team] = fmt(date);
          }
        }

        return {
          id: ep.id,
          episodeNumber: ep.episode_number,
          firstCopyDate: fmt(rawFirstCopy),
          firstCopyFeedbackDate: fmt(rawFirstFeedback),
          firstCopyFeedbackDays: daysBetween(rawFirstCopy, rawFirstFeedback),
          firstCopyTeamFeedback: baseTeamFeedback,
          revisions: epRevs.map((rev) => {
            const rawRevDate = rev.original_submission_date ?? rev.created_at;
            const rawRevFeedback = revEvalMap.get(rev.id) ?? null;

            // Bucket revision into month
            const rmk = monthKey(rawRevDate);
            if (rmk) {
              if (!monthBuckets.has(rmk)) monthBuckets.set(rmk, { freshEps: 0, revEps: 0 });
              monthBuckets.get(rmk)!.revEps++;
            }

            // Build team-wise feedback for revision
            const revTeamFeedback: Record<string, string | null> = {};
            const revTeamMap = revEvalByTeam.get(rev.id);
            if (revTeamMap) {
              for (const [team, date] of revTeamMap) {
                revTeamFeedback[team] = fmt(date);
              }
            }

            return {
              revisionNumber: rev.revision_number,
              receivedDate: fmt(rawRevDate),
              feedbackDate: fmt(rawRevFeedback),
              feedbackDays: daysBetween(rawRevDate, rawRevFeedback),
              teamFeedback: revTeamFeedback,
            };
          }),
          paymentRequestDate: tr?.payment_request_date ?? null,
          paymentDate: tr?.payment_date ?? null,
          trackingStatus: tr?.tracking_status ?? null,
        };
      });

      // Sort monthly summary by date
      const monthlySummary = Array.from(monthBuckets.entries())
        .sort((a, b) => {
          const parseMonthKey = (k: string) => {
            const [mon, yr] = k.split(" ");
            const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
            return (2000 + parseInt(yr)) * 100 + months.indexOf(mon);
          };
          return parseMonthKey(a[0]) - parseMonthKey(b[0]);
        })
        .map(([month, counts]) => ({ month, ...counts }));

      const teamData = Array.isArray(cr.team) ? cr.team[0] : cr.team;

      return {
        id: cr.id,
        workingTitle: cr.working_title || "Untitled",
        writerName: cr.writer_name || null,
        trackingNotes: cr.tracking_notes || null,
        targetSlot: cr.target_slot || null,
        teamName: teamData?.name || null,
        avgScore: cr.average_initial_assessment ?? null,
        episodes: mappedEpisodes,
        maxRevisions,
        monthlySummary,
      };
    }).filter((p) => p.episodes.length > 0);

    // Compute global max revisions
    const globalMaxRevisions = Math.max(0, ...projects.map((p) => p.maxRevisions));

    // Sort feedback teams: Programming first, then alphabetically
    const feedbackTeams = Array.from(feedbackTeamSet).sort((a, b) => {
      if (a === "Programming") return -1;
      if (b === "Programming") return 1;
      return a.localeCompare(b);
    });

    return NextResponse.json({ projects, globalMaxRevisions, feedbackTeams });
  } catch (error) {
    console.error("Tracking API error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (!profile || !WRITE_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const admin = createAdminClient();

    // Update call_report tracking_notes (writer's commitment)
    if (body.call_report_id && body.tracking_notes !== undefined) {
      const { error } = await admin
        .from("call_reports")
        .update({ tracking_notes: body.tracking_notes })
        .eq("id", body.call_report_id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // Upsert episode tracking fields
    if (body.episode_id) {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: user.id };
      if (body.payment_request_date !== undefined) updates.payment_request_date = body.payment_request_date;
      if (body.payment_date !== undefined) updates.payment_date = body.payment_date;
      if (body.tracking_status !== undefined) updates.tracking_status = body.tracking_status;

      const { error } = await admin
        .from("episode_tracking")
        .upsert(
          { episode_id: body.episode_id, ...updates },
          { onConflict: "episode_id" }
        );
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Tracking PATCH error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
