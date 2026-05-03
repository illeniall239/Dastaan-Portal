import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { TeamFeedbackPageClient } from "@/components/shared/team-feedback-page-client";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ONELINER_CRITERIA = [
  { label: "Conflict of Content",  scoreKey: "conflict_of_content_score",   commentKey: "conflict_of_content_comment" },
  { label: "Characterization",     scoreKey: "characterization_score",       commentKey: "characterization_comment" },
  { label: "Story Progression",    scoreKey: "story_progression_score",      commentKey: "story_progression_comment" },
  { label: "What's Next Element",  scoreKey: "whats_next_element_score",     commentKey: "whats_next_element_comment" },
  { label: "Overall One-Liner",    scoreKey: "overall_oneliner_grade_score", commentKey: "overall_oneliner_grade_comment" },
] as const;

const EPISODIC_CRITERIA = [
  { label: "Conflict of Content",  scoreKey: "conflict_of_content_score",  commentKey: "conflict_of_content_comment" },
  { label: "Characterization",     scoreKey: "characterization_score",      commentKey: "characterization_comment" },
  { label: "Story Progression",    scoreKey: "story_progression_score",     commentKey: "story_progression_comment" },
  { label: "Main Event",           scoreKey: "main_event_score",            commentKey: "main_event_comment" },
  { label: "Small Event",          scoreKey: "small_event_score",           commentKey: "small_event_comment" },
  { label: "Dragness",             scoreKey: "dragness_score",              commentKey: "dragness_comment" },
  { label: "Freezes",              scoreKey: "freezes_score",               commentKey: "freezes_comment" },
  { label: "What's Next Element",  scoreKey: "whats_next_element_score",    commentKey: "whats_next_element_comment" },
  { label: "Overall Assessment",   scoreKey: "overall_assessment_score",    commentKey: "overall_assessment_comment" },
] as const;

function teamLabel(role: string): "programming" | "management" {
  return role === "programmer" ? "programming" : "management";
}

export default async function TeamFeedbackPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "evaluator") redirect("/dashboard");

  const supabase = await createClient();
  const { data: userProfile } = await supabase
    .from("users")
    .select("team_id")
    .eq("id", user.id)
    .single();

  const admin = createAdminClient();

  // Fetch call reports for the user's team
  let crQuery = admin
    .from("call_reports")
    .select("id, working_title, writer_name, content_type, genre")
    .eq("meeting_type", "call_report")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (userProfile?.team_id) {
    crQuery = crQuery.eq("team_id", userProfile.team_id);
  }

  const { data: callReports } = await crQuery;
  const reportIds = (callReports || []).map(r => r.id);

  if (reportIds.length === 0) {
    return (
      <div className="mobile-container mobile-section max-w-5xl mx-auto">
        <TeamFeedbackPageClient stories={[]} />
      </div>
    );
  }

  const MGMT_EMAILS = ["humera.safder@geo.tv", "salman.ahmed@geo.tv", "mir@geo.tv"];

  // Fetch all programmers and specific management users by email
  const [{ data: programmers }, { data: mgmtUsers }] = await Promise.all([
    admin.from("users").select("id, name, role").eq("role", "programmer"),
    admin.from("users").select("id, name, role").in("email", MGMT_EMAILS),
  ]);

  const globalUsers = [...(programmers || []), ...(mgmtUsers || [])] as any[];
  const globalUserIds = new Set(globalUsers.map((u: any) => u.id));

  // Fetch one-liner evaluations (evaluator_forms)
  const { data: forms } = await admin
    .from("evaluator_forms")
    .select(`
      id, call_report_id, evaluator_id, average_score,
      conflict_of_content_score, characterization_score, story_progression_score,
      whats_next_element_score, overall_oneliner_grade_score,
      conflict_of_content_comment, characterization_comment, story_progression_comment,
      whats_next_element_comment, overall_oneliner_grade_comment,
      closing_remarks, decision, decision_notes, submitted_at,
      themes_of_drama, corresponding_dramas, category_of_theme, no_of_tracks,
      first_2_eps_required, target_writer, per_ep_price_range, slot, delay_reason,
      evaluator:users!evaluator_id(id, name, role)
    `)
    .in("call_report_id", reportIds)
    .not("submitted_at", "is", null);

  // Fetch episodes for these call reports
  const { data: episodes } = await admin
    .from("episodes")
    .select("id, call_report_id, episode_number")
    .in("call_report_id", reportIds)
    .eq("is_current", true)
    .order("episode_number", { ascending: true });

  const episodeIds = (episodes || []).map((e: any) => e.id);

  // Fetch episodic evaluations from programming + management
  const { data: episodicEvals } = episodeIds.length
    ? await admin
        .from("episodic_evaluations")
        .select(`
          id, episode_id, evaluator_id, overall_average,
          conflict_of_content_score, characterization_score, story_progression_score,
          main_event_score, small_event_score, dragness_score,
          freezes_score, whats_next_element_score, overall_assessment_score,
          conflict_of_content_comment, characterization_comment, story_progression_comment,
          main_event_comment, small_event_comment, dragness_comment,
          freezes_comment, whats_next_element_comment, overall_assessment_comment,
          decision, decision_notes, submitted_at,
          no_of_pages, no_of_scenes, freeze_ending_scene,
          scenes_remarks, characterization_remarks,
          evaluator:users!evaluator_id(id, name, role)
        `)
        .in("episode_id", episodeIds)
    : { data: [] };

  // Build form lookup by call_report_id
  const formsByReport = new Map<string, any[]>();
  for (const f of (forms as any[]) || []) {
    const ev = Array.isArray(f.evaluator) ? f.evaluator[0] : f.evaluator;
    if (!ev || !globalUserIds.has(ev.id)) continue;
    if (!formsByReport.has(f.call_report_id)) formsByReport.set(f.call_report_id, []);
    formsByReport.get(f.call_report_id)!.push({ ...f, _ev: ev });
  }

  // Build episodic eval lookup by episode_id
  const epEvalsByEpisode = new Map<string, any[]>();
  for (const e of (episodicEvals as any[]) || []) {
    const ev = Array.isArray(e.evaluator) ? e.evaluator[0] : e.evaluator;
    if (!ev || !globalUserIds.has(ev.id)) continue;
    if (!epEvalsByEpisode.has(e.episode_id)) epEvalsByEpisode.set(e.episode_id, []);
    epEvalsByEpisode.get(e.episode_id)!.push({ ...e, _ev: ev });
  }

  // Group episodes by call_report_id
  const episodesByReport = new Map<string, any[]>();
  for (const ep of (episodes as any[]) || []) {
    if (!episodesByReport.has(ep.call_report_id)) episodesByReport.set(ep.call_report_id, []);
    episodesByReport.get(ep.call_report_id)!.push(ep);
  }

  // Build final stories
  const stories = (callReports || []).map(cr => {
    // One-liner evaluations seeded with all global users
    const submittedMap = new Map<string, any>();
    for (const f of formsByReport.get(cr.id) || []) submittedMap.set(f._ev.id, f);

    const evaluations = globalUsers.map((u: any) => {
      const f = submittedMap.get(u.id);
      return {
        id: f?.id || `${cr.id}__${u.id}`,
        evaluatorName: u.name || "Unknown",
        team: teamLabel(u.role) as "programming" | "management",
        averageScore: f?.average_score ?? null,
        criteria: ONELINER_CRITERIA.map(c => ({
          label:   c.label,
          score:   f?.[c.scoreKey]   ?? null,
          comment: f?.[c.commentKey] ?? null,
        })),
        closingRemarks:      f?.closing_remarks       ?? null,
        decision:            f?.decision              ?? null,
        decisionNotes:       f?.decision_notes        ?? null,
        submittedAt:         f?.submitted_at          ?? null,
        themesOfDrama:       f?.themes_of_drama       ?? null,
        correspondingDramas: f?.corresponding_dramas  ?? null,
        categoryOfTheme:     f?.category_of_theme     ?? null,
        noOfTracks:          f?.no_of_tracks          ?? null,
        first2EpsRequired:   f?.first_2_eps_required  ?? null,
        targetWriter:        f?.target_writer         ?? null,
        perEpPriceRange:     f?.per_ep_price_range    ?? null,
        slot:                f?.slot                  ?? null,
        delayReason:         f?.delay_reason          ?? null,
      };
    }).sort((a: any, b: any) => a.team.localeCompare(b.team) || a.evaluatorName.localeCompare(b.evaluatorName));

    // Episodes with episodic evaluations seeded with all global users
    const epList = (episodesByReport.get(cr.id) || []).map((ep: any) => {
      const epSubmittedMap = new Map<string, any>();
      for (const e of epEvalsByEpisode.get(ep.id) || []) epSubmittedMap.set(e._ev.id, e);

      const epEvals = globalUsers.map((u: any) => {
        const e = epSubmittedMap.get(u.id);
        return {
          id: e?.id || `${ep.id}__${u.id}`,
          evaluatorName: u.name || "Unknown",
          team: teamLabel(u.role) as "programming" | "management",
          overallAverage: e?.overall_average ?? null,
          criteria: EPISODIC_CRITERIA.map(c => ({
            label:   c.label,
            score:   e?.[c.scoreKey]   ?? null,
            comment: e?.[c.commentKey] ?? null,
          })),
          decision:               e?.decision              ?? null,
          decisionNotes:          e?.decision_notes        ?? null,
          submittedAt:            e?.submitted_at          ?? null,
          noOfPages:              e?.no_of_pages           ?? null,
          noOfScenes:             e?.no_of_scenes          ?? null,
          freezeEndingScene:      e?.freeze_ending_scene   ?? null,
          scenesRemarks:          e?.scenes_remarks        ?? null,
          characterizationRemarks: e?.characterization_remarks ?? null,
        };
      }).sort((a: any, b: any) => a.team.localeCompare(b.team) || a.evaluatorName.localeCompare(b.evaluatorName));

      return { id: ep.id, episodeNumber: ep.episode_number, evaluations: epEvals };
    });

    return {
      id: cr.id,
      workingTitle: cr.working_title || "Untitled",
      writerName:   cr.writer_name || null,
      contentType:  cr.content_type || null,
      genre:        cr.genre || null,
      evaluations,
      episodes: epList,
    };
  });

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      <TeamFeedbackPageClient stories={stories} />
    </div>
  );
}
